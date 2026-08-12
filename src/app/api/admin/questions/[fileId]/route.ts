import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { removeQuestionFiles } from "@/lib/file-processor";
import { prisma } from "@/lib/prisma";
import { emitLiveState } from "@/lib/realtime";

export const dynamic = "force-dynamic";

async function requireOperator() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  return prisma.adminUser.findFirst({
    where: { id: session.user.id, role: "ADMIN", isActive: true },
    select: { id: true },
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ fileId: string }> },
) {
  const operator = await requireOperator();

  if (!operator) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await context.params;

  const questionFile = await prisma.questionFile.findUnique({
    where: { id: fileId },
    include: {
      mappings: { orderBy: { pageNumber: "asc" } },
    },
  });

  if (!questionFile) {
    return NextResponse.json(
      { error: "File tidak ditemukan." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    id: questionFile.id,
    eventId: questionFile.eventId,
    originalName: questionFile.originalName,
    storagePath: questionFile.storagePath,
    totalPages: questionFile.totalPages,
    stage: questionFile.stage,
    mimeType: questionFile.mimeType,
    uploadedAt: questionFile.uploadedAt.toISOString(),
    mappings: questionFile.mappings.map((mapping) => ({
      id: mapping.id,
      pageNumber: mapping.pageNumber,
      questionNumber: mapping.questionNumber,
    })),
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ fileId: string }> },
) {
  const operator = await requireOperator();

  if (!operator) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await context.params;

  const questionFile = await prisma.questionFile.findUnique({
    where: { id: fileId },
    select: { id: true, eventId: true },
  });

  if (!questionFile) {
    return NextResponse.json(
      { error: "File tidak ditemukan." },
      { status: 404 },
    );
  }

  await removeQuestionFiles(questionFile.id);

  await prisma.questionMapping.deleteMany({
    where: { fileId: questionFile.id },
  });
  await prisma.questionFile.delete({
    where: { id: questionFile.id },
  });

  await emitLiveState(questionFile.eventId);

  return NextResponse.json({ ok: true });
}
