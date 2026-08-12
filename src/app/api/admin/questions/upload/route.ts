import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  processUploadedFile,
  validateFileType,
  validateFileSize,
  validateMagicBytes,
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
  const operator = await requireOperator();

  if (!operator) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let fileName = "soal.pdf";
  let stage = "PRELIMINARY";
  let mimeType = "application/pdf";
  let bytes: Uint8Array;

  const headerFileName = request.headers.get("x-file-name");
  const headerStage = request.headers.get("x-file-stage");

  if (headerFileName && headerStage) {
    // Direct Stream Reader Mode (Chunked bypass of Next.js 1MB buffer limit)
    fileName = decodeURIComponent(headerFileName);
    stage = headerStage;
    mimeType = request.headers.get("content-type") || "application/pdf";

    bytes = await readStreamToBytes(request.body);
  } else {
    // Multipart FormData Fallback Mode
    const formData = await request.formData();
    const file = formData.get("file");
    stage = (formData.get("stage") as string) || "PRELIMINARY";

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Pilih file terlebih dahulu." },
        { status: 400 },
      );
    }

    fileName = file.name;
    mimeType = file.type;
    bytes = new Uint8Array(await file.arrayBuffer());
  }

  if (!stage || !VALID_STAGES.includes(stage as CompetitionStage)) {
    return NextResponse.json(
      { error: "Tahap pertandingan tidak valid." },
      { status: 400 },
    );
  }

  try {
    validateFileType(mimeType, fileName);
    validateFileSize(bytes.length);
    validateMagicBytes(bytes, mimeType);

    const event = await prisma.event.findFirst({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event belum tersedia." },
        { status: 400 },
      );
    }

    // 1. Process uploaded file into a brand new unique folder FIRST
    const fileId = `qf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const processed = await processUploadedFile(
      fileId,
      bytes,
      fileName,
      mimeType,
    );

    // 2. Check for existing question file record for this stage
    const existing = await prisma.questionFile.findUnique({
      where: {
        eventId_stage: { eventId: event.id, stage: stage as CompetitionStage },
      },
      select: { id: true },
    });

    // 3. Atomically replace database records inside a single transaction
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

    // 4. Asynchronously remove old files from disk without blocking response
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
    console.error("Upload gagal:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Upload gagal. Silakan coba kembali.",
      },
      { status: 400 },
    );
  }
}
