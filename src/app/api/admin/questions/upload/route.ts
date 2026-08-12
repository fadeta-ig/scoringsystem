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

export async function POST(request: Request) {
  const operator = await requireOperator();

  if (!operator) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const stage = formData.get("stage") as string;

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Pilih file terlebih dahulu." },
      { status: 400 },
    );
  }

  if (!stage || !VALID_STAGES.includes(stage as CompetitionStage)) {
    return NextResponse.json(
      { error: "Tahap pertandingan tidak valid." },
      { status: 400 },
    );
  }

  try {
    validateFileType(file.type);
    validateFileSize(file.size);

    const bytes = new Uint8Array(await file.arrayBuffer());
    validateMagicBytes(bytes, file.type);

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

    const existing = await prisma.questionFile.findUnique({
      where: {
        eventId_stage: { eventId: event.id, stage: stage as CompetitionStage },
      },
    });

    if (existing) {
      const { removeQuestionFiles } = await import("@/lib/file-processor");
      await removeQuestionFiles(existing.id);

      await prisma.questionMapping.deleteMany({
        where: { fileId: existing.id },
      });
      await prisma.questionFile.delete({
        where: { id: existing.id },
      });
    }

    const fileId = `qf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const processed = await processUploadedFile(
      fileId,
      bytes,
      file.name,
      file.type,
    );

    const questionFile = await prisma.questionFile.create({
      data: {
        id: fileId,
        eventId: event.id,
        originalName: file.name,
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
