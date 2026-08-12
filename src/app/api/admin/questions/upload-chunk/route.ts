import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { appendFile, mkdir, readFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { authOptions } from "@/lib/auth";
import {
  processUploadedFile,
  validateFileType,
  validateFileSize,
  validateMagicBytes,
  getUploadRoot,
} from "@/lib/file-processor";
import { prisma } from "@/lib/prisma";
import { emitLiveState } from "@/lib/realtime";
import type { CompetitionStage } from "@prisma/client";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const VALID_STAGES: CompetitionStage[] = [
  "PRELIMINARY",
  "FINAL_SESSION_1",
  "FINAL_SESSION_2",
  "FINAL_SESSION_3",
  "FINAL_COMPLETE",
  "GRAND_FINAL",
  "FINISHED",
];

const TEMP_UPLOAD_ROOT = path.resolve(
  process.cwd(),
  process.env.STORAGE_DIR || "storage/uploads",
  "temp",
);

async function requireOperator() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const operator = await prisma.adminUser.findFirst({
    where: { id: session.user.id, role: "ADMIN", isActive: true },
    select: { id: true },
  });

  return operator;
}

async function readStreamToBytes(
  stream: ReadableStream<Uint8Array> | null,
): Promise<Uint8Array> {
  if (!stream) {
    return new Uint8Array(0);
  }

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      totalLength += value.length;
    }
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

export async function POST(request: Request) {
  // Read stream immediately to prevent socket stalls
  const chunkBytesPromise = readStreamToBytes(request.body);

  const operator = await requireOperator();
  if (!operator) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const headerUploadId = request.headers.get("x-upload-id");
  const headerChunkIndex = request.headers.get("x-chunk-index");
  const headerTotalChunks = request.headers.get("x-total-chunks");
  const headerFileName = request.headers.get("x-file-name");
  const headerStage = request.headers.get("x-file-stage");
  const headerTotalSize = request.headers.get("x-total-size");

  if (
    !headerUploadId ||
    headerChunkIndex === null ||
    !headerTotalChunks ||
    !headerFileName ||
    !headerStage
  ) {
    return NextResponse.json(
      { error: "Header chunked upload tidak lengkap." },
      { status: 400 },
    );
  }

  const uploadId = headerUploadId.replace(/[^a-zA-Z0-9_-]/g, "");
  const chunkIndex = parseInt(headerChunkIndex, 10);
  const totalChunks = parseInt(headerTotalChunks, 10);
  const fileName = decodeURIComponent(headerFileName);
  const stage = headerStage;
  const mimeType = request.headers.get("content-type") || "application/pdf";
  const totalSize = headerTotalSize ? parseInt(headerTotalSize, 10) : 0;

  if (!stage || !VALID_STAGES.includes(stage as CompetitionStage)) {
    return NextResponse.json(
      { error: "Tahap pertandingan tidak valid." },
      { status: 400 },
    );
  }

  try {
    validateFileType(mimeType, fileName);
    if (totalSize > 0) {
      validateFileSize(totalSize);
    }

    const chunkBytes = await chunkBytesPromise;

    await mkdir(TEMP_UPLOAD_ROOT, { recursive: true });
    const tempFilePath = path.join(TEMP_UPLOAD_ROOT, `${uploadId}.tmp`);

    // Append this 512KB chunk to temp file
    await appendFile(tempFilePath, chunkBytes);

    // If this is NOT the last chunk, return success for this chunk
    if (chunkIndex < totalChunks - 1) {
      return NextResponse.json({
        ok: true,
        chunkIndex,
        totalChunks,
        status: "CHUNK_RECEIVED",
      });
    }

    // --- LAST CHUNK: Process final stitched file ---
    const finalStitchedBuffer = await readFile(tempFilePath);
    validateFileSize(finalStitchedBuffer.length);
    validateMagicBytes(new Uint8Array(finalStitchedBuffer.subarray(0, 16)), mimeType);

    const event = await prisma.event.findFirst({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      select: { id: true },
    });

    if (!event) {
      await unlink(tempFilePath).catch(() => undefined);
      return NextResponse.json(
        { error: "Event belum tersedia." },
        { status: 400 },
      );
    }

    const fileId = `qf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const processed = await processUploadedFile(
      fileId,
      new Uint8Array(finalStitchedBuffer),
      fileName,
      mimeType,
    );

    // Check for existing question file record for this stage
    const existing = await prisma.questionFile.findUnique({
      where: {
        eventId_stage: { eventId: event.id, stage: stage as CompetitionStage },
      },
      select: { id: true },
    });

    // Atomically replace database records inside a single transaction
    const questionFile = await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.questionMapping.deleteMany({
          where: { fileId: existing.id },
        });
        await tx.questionFile.delete({
          where: { id: existing.id },
        });
      }

      return tx.questionFile.create({
        data: {
          id: fileId,
          eventId: event.id,
          originalName: fileName,
          storagePath: processed.storagePath,
          mimeType: processed.mimeType,
          totalPages: processed.totalPages,
          stage: stage as CompetitionStage,
          mappings: {
            create: Array.from({ length: processed.totalPages }, (_, index) => ({
              pageNumber: index + 1,
              questionNumber: index + 1,
            })),
          },
        },
        include: {
          mappings: {
            orderBy: { pageNumber: "asc" },
          },
        },
      });
    });

    // Asynchronously remove old files from disk and temp file
    await unlink(tempFilePath).catch(() => undefined);
    if (existing) {
      setTimeout(async () => {
        try {
          const { removeQuestionFiles } = await import("@/lib/file-processor");
          await removeQuestionFiles(existing.id);
        } catch {
          // Ignore background cleanup errors
        }
      }, 1000);
    }

    await emitLiveState(event.id);

    return NextResponse.json({
      ok: true,
      file: {
        id: questionFile.id,
        originalName: questionFile.originalName,
        storagePath: questionFile.storagePath,
        totalPages: questionFile.totalPages,
        stage: questionFile.stage,
        mappings: questionFile.mappings.map((mapping) => ({
          id: mapping.id,
          pageNumber: mapping.pageNumber,
          questionNumber: mapping.questionNumber,
        })),
      },
    });
  } catch (error) {
    console.error("Chunked Upload gagal:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Chunked upload gagal. Silakan coba kembali.",
      },
      { status: 400 },
    );
  }
}
