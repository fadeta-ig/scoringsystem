import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
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

type MappingEntry = {
  pageNumber: number;
  questionNumber: number | null;
};

export async function PUT(
  request: Request,
  context: { params: Promise<{ fileId: string }> },
) {
  const operator = await requireOperator();

  if (!operator) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await context.params;
  const body = await request.json();
  const mappings: MappingEntry[] = body.mappings;

  if (!Array.isArray(mappings)) {
    return NextResponse.json(
      { error: "Format mapping tidak valid." },
      { status: 400 },
    );
  }

  const questionFile = await prisma.questionFile.findUnique({
    where: { id: fileId },
    select: { id: true, eventId: true, totalPages: true },
  });

  if (!questionFile) {
    return NextResponse.json(
      { error: "File tidak ditemukan." },
      { status: 404 },
    );
  }

  for (const entry of mappings) {
    if (
      !Number.isInteger(entry.pageNumber) ||
      entry.pageNumber < 1 ||
      entry.pageNumber > questionFile.totalPages
    ) {
      return NextResponse.json(
        { error: `Halaman ${entry.pageNumber} tidak valid.` },
        { status: 400 },
      );
    }

    if (
      entry.questionNumber !== null &&
      (!Number.isInteger(entry.questionNumber) || entry.questionNumber < 1)
    ) {
      return NextResponse.json(
        { error: "Nomor pertanyaan harus bilangan bulat positif atau null." },
        { status: 400 },
      );
    }
  }

  const assignedNumbers = mappings
    .map((entry) => entry.questionNumber)
    .filter((num): num is number => num !== null);
  const uniqueNumbers = new Set(assignedNumbers);

  if (assignedNumbers.length !== uniqueNumbers.size) {
    return NextResponse.json(
      { error: "Nomor pertanyaan tidak boleh duplikat." },
      { status: 400 },
    );
  }

  await prisma.$transaction(
    mappings.map((entry) =>
      prisma.questionMapping.upsert({
        where: {
          fileId_pageNumber: {
            fileId: questionFile.id,
            pageNumber: entry.pageNumber,
          },
        },
        update: { questionNumber: entry.questionNumber },
        create: {
          fileId: questionFile.id,
          pageNumber: entry.pageNumber,
          questionNumber: entry.questionNumber,
        },
      }),
    ),
  );

  await emitLiveState(questionFile.eventId);

  return NextResponse.json({ ok: true });
}
