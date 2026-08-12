"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import type { QuestionSlideStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitLiveState } from "@/lib/realtime";

export type QuestionActionResult = {
  ok: boolean;
  message: string;
};

const VALID_STATUSES: QuestionSlideStatus[] = [
  "PENDING",
  "PREVIEW",
  "LIVE",
  "SCORING",
  "COMPLETED",
];

const STATUS_TRANSITIONS: Record<QuestionSlideStatus, QuestionSlideStatus[]> = {
  PENDING: ["PREVIEW", "LIVE", "SCORING", "COMPLETED"],
  PREVIEW: ["LIVE", "SCORING", "PENDING", "COMPLETED"],
  LIVE: ["SCORING", "PREVIEW", "PENDING", "COMPLETED"],
  SCORING: ["COMPLETED", "LIVE", "PREVIEW", "PENDING"],
  COMPLETED: ["PENDING", "PREVIEW", "LIVE", "SCORING"],
};

async function requireAdminId() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Sesi operator tidak valid.");
  }

  const admin = await prisma.adminUser.findFirst({
    where: { id: session.user.id, role: "ADMIN", isActive: true },
    select: { id: true },
  });

  if (!admin) {
    throw new Error("Akun operator sudah tidak aktif.");
  }

  return admin.id;
}

async function getEventIdOrThrow() {
  const event = await prisma.event.findFirst({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: { id: true },
  });

  if (!event) {
    throw new Error("Event belum tersedia.");
  }

  return event.id;
}

async function refreshAll(eventId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/soal");
  revalidatePath("/admin/proyeksi");
  revalidatePath("/proyeksi");

  try {
    await emitLiveState(eventId);
  } catch (error) {
    console.error("Gagal mengirim pembaruan realtime", error);
  }
}

export async function setQuestionSlideStatus(
  formData: FormData,
): Promise<QuestionActionResult> {
  try {
    await requireAdminId();
    const eventId = await getEventIdOrThrow();
    const rawStatus = formData.get("status") as string;

    if (!VALID_STATUSES.includes(rawStatus as QuestionSlideStatus)) {
      throw new Error("Status slide tidak valid.");
    }

    const targetStatus = rawStatus as QuestionSlideStatus;

    const state = await prisma.competitionState.findUnique({
      where: { eventId },
      select: {
        questionSlideStatus: true,
        projectionMode: true,
      },
    });

    if (!state) {
      throw new Error("State pertandingan tidak ditemukan.");
    }

    const allowedTransitions = STATUS_TRANSITIONS[state.questionSlideStatus];

    if (!allowedTransitions.includes(targetStatus)) {
      throw new Error(
        `Tidak dapat berpindah dari ${state.questionSlideStatus} ke ${targetStatus}.`,
      );
    }

    const updateData: Record<string, unknown> = {
      questionSlideStatus: targetStatus,
    };

    if (targetStatus === "LIVE" && state.projectionMode !== "QUESTION_SLIDE") {
      updateData.projectionMode = "QUESTION_SLIDE";
    }

    await prisma.competitionState.update({
      where: { eventId },
      data: updateData,
    });

    await refreshAll(eventId);

    const labels: Record<QuestionSlideStatus, string> = {
      PENDING: "Soal dikembalikan ke antrean.",
      PREVIEW: "Soal dalam mode preview.",
      LIVE: "Soal ditayangkan ke layar.",
      SCORING: "Mode scoring aktif.",
      COMPLETED: "Soal selesai.",
    };

    return { ok: true, message: labels[targetStatus] };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal mengubah status slide.",
    };
  }
}

export async function resetSlideForNextQuestion(): Promise<QuestionActionResult> {
  try {
    await requireAdminId();
    const eventId = await getEventIdOrThrow();

    await prisma.competitionState.update({
      where: { eventId },
      data: { questionSlideStatus: "PENDING" },
    });

    await refreshAll(eventId);

    return { ok: true, message: "Slide direset untuk pertanyaan berikutnya." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal mereset status slide.",
    };
  }
}

export async function switchToQuestionSlideMode(): Promise<QuestionActionResult> {
  try {
    await requireAdminId();
    const eventId = await getEventIdOrThrow();

    await prisma.competitionState.update({
      where: { eventId },
      data: {
        projectionMode: "QUESTION_SLIDE",
        projectionSession: null,
        projectionMessage: null,
      },
    });

    await refreshAll(eventId);

    return {
      ok: true,
      message: "Mode tampilan soal diaktifkan di layar proyeksi.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal mengaktifkan mode soal.",
    };
  }
}
