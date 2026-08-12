"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import {
  AnswerMode,
  AnswerOutcome,
  CompetitionActionKind,
  CompetitionStage,
  Prisma,
  ProjectionMode,
  QuestionSlideStatus,
} from "@prisma/client";
import { authOptions } from "@/lib/auth";
import {
  calculateSession3Changes,
  FINALIST_COUNT,
  GRAND_FINAL_QUESTION_PRIZE,
  nextFinalStage,
  questionTotal,
  session1ActiveTeamIndex,
  session2QuestionValue,
  type FinalStage,
} from "@/lib/competition-rules";
import { prisma } from "@/lib/prisma";
import { emitLiveState } from "@/lib/realtime";
import { safeText, toInt } from "@/lib/utils";

export type ActionResult = {
  ok: boolean;
  message: string;
};

type ActionContext = {
  adminId: string;
  eventId: string;
};

type StateSnapshot = {
  stage: CompetitionStage;
  currentQuestion: number;
  grandFinalTeamId: string | null;
  grandPrize: number;
  grandDecisionPending: boolean;
  projectionMode: ProjectionMode;
  projectionSession: number | null;
  projectionMessage: string | null;
  questionSlideStatus?: QuestionSlideStatus;
};

type Transaction = Prisma.TransactionClient;

async function requireAdminId() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Sesi operator tidak valid. Silakan masuk kembali.");
  }

  const admin = await prisma.adminUser.findFirst({
    where: {
      id: session.user.id,
      role: "ADMIN",
      isActive: true,
    },
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
    throw new Error("Event belum tersedia. Jalankan seed database terlebih dahulu.");
  }

  return event.id;
}

async function refresh(eventId: string) {
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

async function performAction(
  work: (context: ActionContext) => Promise<string>,
): Promise<ActionResult> {
  try {
    const adminId = await requireAdminId();
    const eventId = await getEventIdOrThrow();
    const message = await work({ adminId, eventId });
    await refresh(eventId);
    return { ok: true, message };
  } catch (error) {
    console.error(error);
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Aksi gagal diproses. Silakan coba kembali.",
    };
  }
}

function nullableInteger(value: FormDataEntryValue | null, label: string) {
  const text = safeText(value);

  if (!text) {
    return null;
  }

  if (!/^-?\d+$/.test(text)) {
    throw new Error(`${label} harus berupa bilangan bulat.`);
  }

  return Number.parseInt(text, 10);
}

function durationFromForm(formData: FormData, teamId: string) {
  const minuteText = safeText(formData.get(`minutes-${teamId}`));
  const secondText = safeText(formData.get(`seconds-${teamId}`));

  if (!minuteText && !secondText) {
    return null;
  }

  const minutes = nullableInteger(minuteText, "Menit") ?? 0;
  const seconds = nullableInteger(secondText, "Detik") ?? 0;

  if (minutes < 0 || seconds < 0 || seconds > 59) {
    throw new Error("Durasi harus memakai menit positif dan detik 0–59.");
  }

  return minutes * 60 + seconds;
}

function snapshotState(state: {
  stage: CompetitionStage;
  currentQuestion: number;
  grandFinalTeamId: string | null;
  grandPrize: number;
  grandDecisionPending: boolean;
  projectionMode: ProjectionMode;
  projectionSession: number | null;
  projectionMessage: string | null;
  questionSlideStatus?: QuestionSlideStatus;
}): StateSnapshot {
  return {
    stage: state.stage,
    currentQuestion: state.currentQuestion,
    grandFinalTeamId: state.grandFinalTeamId,
    grandPrize: state.grandPrize,
    grandDecisionPending: state.grandDecisionPending,
    projectionMode: state.projectionMode,
    projectionSession: state.projectionSession,
    projectionMessage: state.projectionMessage,
    questionSlideStatus: state.questionSlideStatus ?? "PENDING",
  };
}

function snapshotJson(snapshot: StateSnapshot) {
  return snapshot as unknown as Prisma.InputJsonValue;
}

async function lockedState(tx: Transaction, eventId: string) {
  await tx.$queryRaw`SELECT id FROM competition_states WHERE eventId = ${eventId} FOR UPDATE`;
  const state = await tx.competitionState.findUnique({
    where: { eventId },
  });

  if (!state) {
    throw new Error("State pertandingan tidak ditemukan.");
  }

  return state;
}

async function finalists(tx: Transaction, eventId: string) {
  const teams = await tx.team.findMany({
    where: { eventId, isSessionWinner: true },
    orderBy: { finalOrder: "asc" },
  });

  if (teams.length !== FINALIST_COUNT) {
    throw new Error("Babak Final harus memiliki tepat 4 tim pemenang penyisihan.");
  }

  return teams;
}

async function currentFinalTotals(
  tx: Transaction,
  eventId: string,
  teamIds: string[],
) {
  const totals = new Map(teamIds.map((teamId) => [teamId, 0]));
  const deltas = await tx.scoreDelta.findMany({
    where: {
      eventId,
      teamId: { in: teamIds },
      action: { revertedAt: null },
    },
    select: { teamId: true, points: true },
  });

  for (const delta of deltas) {
    totals.set(delta.teamId, (totals.get(delta.teamId) ?? 0) + delta.points);
  }

  return totals;
}

async function createCompetitionAction(
  tx: Transaction,
  {
    eventId,
    adminId,
    kind,
    stage,
    questionNumber,
    actorTeamId,
    targetTeamId,
    amount,
    outcome,
    answerMode,
    description,
    before,
    after,
    changes = [],
  }: {
    eventId: string;
    adminId: string;
    kind: CompetitionActionKind;
    stage: CompetitionStage;
    questionNumber?: number | null;
    actorTeamId?: string | null;
    targetTeamId?: string | null;
    amount?: number | null;
    outcome?: AnswerOutcome | null;
    answerMode?: AnswerMode | null;
    description: string;
    before: StateSnapshot;
    after: StateSnapshot;
    changes?: Array<{ teamId: string; points: number }>;
  },
) {
  await tx.competitionState.update({
    where: { eventId },
    data: after,
  });

  return tx.competitionAction.create({
    data: {
      eventId,
      createdById: adminId,
      kind,
      stage,
      questionNumber,
      actorTeamId,
      targetTeamId,
      amount,
      outcome,
      answerMode,
      description,
      stateBefore: snapshotJson(before),
      stateAfter: snapshotJson(after),
      scoreDeltas: changes.length
        ? {
            create: changes.map((change) => ({
              eventId,
              teamId: change.teamId,
              points: change.points,
            })),
          }
        : undefined,
    },
  });
}

function outcomeFromForm(formData: FormData) {
  const outcome = safeText(formData.get("outcome"));

  if (outcome !== "CORRECT" && outcome !== "WRONG") {
    throw new Error("Hasil jawaban tidak valid.");
  }

  return outcome as AnswerOutcome;
}

function expectedQuestion(formData: FormData) {
  const question = toInt(formData.get("expectedQuestion"));

  if (question < 1) {
    throw new Error("Nomor pertanyaan tidak valid.");
  }

  return question;
}

function assertExpectedQuestion(actual: number, expected: number) {
  if (actual !== expected) {
    throw new Error(
      "Pertanyaan sudah berubah. Periksa tampilan terbaru sebelum menginput kembali.",
    );
  }
}

export async function savePreliminarySession(formData: FormData) {
  return performAction(async ({ eventId }) => {
    const sessionNumber = toInt(formData.get("sessionNumber"));

    if (sessionNumber < 1 || sessionNumber > 4) {
      throw new Error("Sesi penyisihan tidak valid.");
    }

    const state = await prisma.competitionState.findUnique({
      where: { eventId },
      select: { stage: true },
    });

    if (state?.stage !== "PRELIMINARY") {
      throw new Error("Hasil penyisihan terkunci karena Babak Final sudah dimulai.");
    }

    const teams = await prisma.team.findMany({
      where: { eventId, preliminarySession: sessionNumber },
      orderBy: { displayOrder: "asc" },
    });

    if (teams.length !== 6) {
      throw new Error("Setiap sesi penyisihan harus memiliki 6 tim.");
    }

    const updates = teams.map((team) => {
      const name = safeText(formData.get(`name-${team.id}`));
      const score = nullableInteger(
        formData.get(`score-${team.id}`),
        `Nilai ${team.name}`,
      );
      const completionSeconds = durationFromForm(formData, team.id);

      if (!name) {
        throw new Error("Nama tim tidak boleh kosong.");
      }

      return {
        id: team.id,
        name,
        score,
        completionSeconds,
      };
    });

    await prisma.$transaction(
      updates.map((update) =>
        prisma.team.update({
          where: { id: update.id },
          data: {
            name: update.name,
            preliminaryScore: update.score,
            completionSeconds: update.completionSeconds,
          },
        }),
      ),
    );

    return `Hasil penyisihan Sesi ${sessionNumber} berhasil disimpan.`;
  });
}

export async function updateTeamProfile(formData: FormData) {
  return performAction(async ({ eventId }) => {
    const teamId = safeText(formData.get("teamId"));
    const name = safeText(formData.get("name"));

    if (!name) {
      throw new Error("Nama tim tidak boleh kosong.");
    }

    if (name.length > 60) {
      throw new Error("Nama tim maksimal 60 karakter.");
    }

    const [team, duplicate] = await Promise.all([
      prisma.team.findFirst({
        where: { id: teamId, eventId },
        select: { id: true },
      }),
      prisma.team.findFirst({
        where: {
          eventId,
          name,
          NOT: { id: teamId },
        },
        select: { id: true },
      }),
    ]);

    if (!team) {
      throw new Error("Tim tidak ditemukan.");
    }

    if (duplicate) {
      throw new Error("Nama tim sudah digunakan.");
    }

    await prisma.team.update({
      where: { id: team.id },
      data: { name },
    });

    return `${name} berhasil diperbarui.`;
  });
}

export async function selectPreliminaryWinner(formData: FormData) {
  return performAction(async ({ eventId }) => {
    const teamId = safeText(formData.get("teamId"));

    const selected = await prisma.team.findFirst({
      where: { id: teamId, eventId },
    });

    if (!selected) {
      throw new Error("Tim penyisihan tidak ditemukan.");
    }

    const state = await prisma.competitionState.findUnique({
      where: { eventId },
      select: { stage: true },
    });

    if (state?.stage !== "PRELIMINARY") {
      throw new Error("Pemenang penyisihan terkunci karena Final sudah dimulai.");
    }

    const sessionTeams = await prisma.team.findMany({
      where: { eventId, preliminarySession: selected.preliminarySession },
    });
    const scoredTeams = sessionTeams.filter(
      (team) => team.preliminaryScore !== null,
    );

    if (scoredTeams.length !== sessionTeams.length) {
      throw new Error("Lengkapi nilai seluruh tim sebelum menetapkan pemenang.");
    }

    const highestScore = Math.max(
      ...scoredTeams.map((team) => team.preliminaryScore ?? Number.MIN_SAFE_INTEGER),
    );
    const scoreLeaders = scoredTeams.filter(
      (team) => team.preliminaryScore === highestScore,
    );
    let eligible = scoreLeaders;

    if (scoreLeaders.length > 1) {
      if (scoreLeaders.some((team) => team.completionSeconds === null)) {
        throw new Error(
          "Nilai tertinggi seri. Lengkapi waktu pengerjaan tim yang seri.",
        );
      }

      const fastestTime = Math.min(
        ...scoreLeaders.map((team) => team.completionSeconds ?? Number.MAX_SAFE_INTEGER),
      );
      eligible = scoreLeaders.filter(
        (team) => team.completionSeconds === fastestTime,
      );
    }

    if (!eligible.some((team) => team.id === selected.id)) {
      throw new Error(
        "Tim ini bukan pemilik nilai tertinggi atau waktu tercepat pada sesi tersebut.",
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.team.updateMany({
        where: {
          eventId,
          preliminarySession: selected.preliminarySession,
        },
        data: {
          isSessionWinner: false,
          finalOrder: null,
        },
      });
      await tx.team.update({
        where: { id: selected.id },
        data: {
          isSessionWinner: true,
          finalOrder: selected.preliminarySession,
        },
      });
    });

    return eligible.length > 1
      ? `${selected.name} ditetapkan juri sebagai pemenang Sesi ${selected.preliminarySession}.`
      : `${selected.name} ditetapkan sebagai pemenang Sesi ${selected.preliminarySession}.`;
  });
}

export async function setProjectionView(formData: FormData) {
  return performAction(async ({ eventId }) => {
    const rawMode = safeText(formData.get("mode"));

    if (!Object.values(ProjectionMode).includes(rawMode as ProjectionMode)) {
      throw new Error("Tampilan proyeksi tidak valid.");
    }

    const mode = rawMode as ProjectionMode;
    const session =
      mode === "SESSION_RESULT" ? toInt(formData.get("session")) : null;
    const rawMessage = safeText(formData.get("message"));
    const message =
      mode === "BREAK"
        ? rawMessage || "Acara akan segera dilanjutkan."
        : null;

    if (
      mode === "SESSION_RESULT" &&
      (session === null || session < 1 || session > 3)
    ) {
      throw new Error("Pilih hasil Final Sesi 1, 2, atau 3.");
    }

    if (message && message.length > 120) {
      throw new Error("Pesan break maksimal 120 karakter.");
    }

    const label = await prisma.$transaction(async (tx) => {
      const state = await lockedState(tx, eventId);

      if (
        mode === "WINNER" &&
        (state.stage !== "FINISHED" || !state.grandFinalTeamId)
      ) {
        throw new Error("Pemenang belum tersedia untuk ditampilkan.");
      }

      if (mode === "QUALIFIERS") {
        const qualifierCount = await tx.team.count({
          where: { eventId, isSessionWinner: true },
        });

        if (!qualifierCount) {
          throw new Error("Belum ada tim yang lolos untuk ditampilkan.");
        }
      }

      await tx.competitionState.update({
        where: { eventId },
        data: {
          projectionMode: mode,
          projectionSession: session,
          projectionMessage: message,
        },
      });

      const labels: Record<ProjectionMode, string> = {
        LIVE: "Tampilan Live",
        LEADERBOARD: "Leaderboard Final",
        SESSION_RESULT: `Hasil Final Sesi ${session}`,
        PRELIMINARY_RESULTS: "Hasil Babak Penyisihan",
        QUALIFIERS: "Tim yang Lolos",
        BREAK: "Layar Break",
        WINNER: "Pemenang",
        QUESTION_SLIDE: "Tampilan Slide Soal",
      };

      return labels[mode];
    });

    return `${label} ditayangkan ke layar proyeksi.`;
  });
}

export async function startFinal(_formData?: FormData) {
  return performAction(async ({ eventId }) => {
    await prisma.$transaction(async (tx) => {
      const state = await lockedState(tx, eventId);

      if (state.stage !== "PRELIMINARY") {
        throw new Error("Babak Final sudah dimulai.");
      }

      const winners = await tx.team.findMany({
        where: { eventId, isSessionWinner: true },
        orderBy: { finalOrder: "asc" },
      });

      if (
        winners.length !== FINALIST_COUNT ||
        new Set(winners.map((team) => team.preliminarySession)).size !==
          FINALIST_COUNT
      ) {
        throw new Error("Tetapkan satu pemenang dari masing-masing 4 sesi.");
      }

      await tx.competitionState.update({
        where: { eventId },
        data: {
          stage: "FINAL_SESSION_1",
          currentQuestion: 1,
          grandFinalTeamId: null,
          grandPrize: 0,
          grandDecisionPending: false,
          projectionMode: "QUALIFIERS",
          projectionSession: null,
          projectionMessage: null,
        },
      });
    });

    return "Babak Final dimulai. Seluruh skor Final dimulai dari 0.";
  });
}

export async function submitSession1Result(formData: FormData) {
  return performAction(async ({ eventId, adminId }) => {
    const expected = expectedQuestion(formData);
    const outcome = outcomeFromForm(formData);

    const description = await prisma.$transaction(async (tx) => {
      const state = await lockedState(tx, eventId);

      if (state.stage !== "FINAL_SESSION_1") {
        throw new Error("Sesi 1 tidak sedang aktif.");
      }

      assertExpectedQuestion(state.currentQuestion, expected);
      const teams = await finalists(tx, eventId);
      const team = teams[session1ActiveTeamIndex(state.currentQuestion)];
      const points = outcome === "CORRECT" ? 10 : 0;
      const before = snapshotState(state);
      const isLast =
        state.currentQuestion === questionTotal("FINAL_SESSION_1");
      const after: StateSnapshot = isLast
        ? {
            ...before,
            ...nextFinalStage("FINAL_SESSION_1"),
            projectionMode: "SESSION_RESULT",
            projectionSession: 1,
            projectionMessage: null,
          }
        : {
            ...before,
            currentQuestion: state.currentQuestion + 1,
          };
      const actionDescription =
        outcome === "CORRECT"
          ? `${team.name} benar, +10 poin.`
          : `${team.name} salah, skor tidak berubah.`;

      await createCompetitionAction(tx, {
        eventId,
        adminId,
        kind: "FINAL_S1_RESULT",
        stage: state.stage,
        questionNumber: state.currentQuestion,
        actorTeamId: team.id,
        amount: points,
        outcome,
        description: actionDescription,
        before,
        after,
        changes: points ? [{ teamId: team.id, points }] : [],
      });

      return actionDescription;
    });

    return description;
  });
}

export async function submitSession2Result(formData: FormData) {
  return performAction(async ({ eventId, adminId }) => {
    const expected = expectedQuestion(formData);
    const outcome = outcomeFromForm(formData);
    const teamId = safeText(formData.get("teamId"));
    const assignedByJury = formData.get("assignedByJury") === "on";

    const description = await prisma.$transaction(async (tx) => {
      const state = await lockedState(tx, eventId);

      if (state.stage !== "FINAL_SESSION_2") {
        throw new Error("Sesi 2 tidak sedang aktif.");
      }

      assertExpectedQuestion(state.currentQuestion, expected);
      const teams = await finalists(tx, eventId);
      const team = teams.find((item) => item.id === teamId);

      if (!team) {
        throw new Error("Pilih tim yang menjawab pertanyaan.");
      }

      const questionValue = session2QuestionValue(state.currentQuestion);
      const points = outcome === "CORRECT" ? questionValue : -questionValue;
      const before = snapshotState(state);
      const isLast =
        state.currentQuestion === questionTotal("FINAL_SESSION_2");
      const after: StateSnapshot = isLast
        ? {
            ...before,
            ...nextFinalStage("FINAL_SESSION_2"),
            projectionMode: "SESSION_RESULT",
            projectionSession: 2,
            projectionMessage: null,
          }
        : {
            ...before,
            currentQuestion: state.currentQuestion + 1,
          };
      const juryLabel = assignedByJury ? " (ditunjuk juri)" : "";
      const actionDescription = `${team.name}${juryLabel} ${
        outcome === "CORRECT" ? "benar" : "salah"
      }, ${points > 0 ? "+" : ""}${points} poin.`;

      await createCompetitionAction(tx, {
        eventId,
        adminId,
        kind: "FINAL_S2_RESULT",
        stage: state.stage,
        questionNumber: state.currentQuestion,
        actorTeamId: team.id,
        amount: questionValue,
        outcome,
        description: actionDescription,
        before,
        after,
        changes: [{ teamId: team.id, points }],
      });

      return actionDescription;
    });

    return description;
  });
}

export async function submitSession3Result(formData: FormData) {
  return performAction(async ({ eventId, adminId }) => {
    const expected = expectedQuestion(formData);
    const outcome = outcomeFromForm(formData);
    const auctionWinnerId = safeText(formData.get("auctionWinnerId"));
    const targetTeamId = safeText(formData.get("targetTeamId")) || null;
    const bid = toInt(formData.get("bid"));
    const rawMode = safeText(formData.get("answerMode"));

    if (rawMode !== "SELF" && rawMode !== "PASS") {
      throw new Error("Pilih jawab sendiri atau lempar ke tim lain.");
    }

    const answerMode = rawMode as AnswerMode;

    const description = await prisma.$transaction(async (tx) => {
      const state = await lockedState(tx, eventId);

      if (state.stage !== "FINAL_SESSION_3") {
        throw new Error("Sesi 3 tidak sedang aktif.");
      }

      assertExpectedQuestion(state.currentQuestion, expected);
      const teams = await finalists(tx, eventId);
      const finalistIds = teams.map((team) => team.id);
      const auctionWinner = teams.find((team) => team.id === auctionWinnerId);
      const targetTeam = targetTeamId
        ? teams.find((team) => team.id === targetTeamId)
        : null;
      const changes = calculateSession3Changes({
        finalistIds,
        auctionWinnerId,
        targetTeamId,
        bid,
        answerMode,
        outcome,
      });

      if (!auctionWinner) {
        throw new Error("Pilih pemenang lelang.");
      }

      const before = snapshotState(state);
      const isLast =
        state.currentQuestion === questionTotal("FINAL_SESSION_3");
      const after: StateSnapshot = isLast
        ? {
            ...before,
            ...nextFinalStage("FINAL_SESSION_3"),
            projectionMode: "SESSION_RESULT",
            projectionSession: 3,
            projectionMessage: null,
          }
        : {
            ...before,
            currentQuestion: state.currentQuestion + 1,
          };

      if (isLast) {
        const totals = await currentFinalTotals(tx, eventId, finalistIds);

        for (const change of changes) {
          totals.set(
            change.teamId,
            (totals.get(change.teamId) ?? 0) + change.points,
          );
        }

        const highest = Math.max(...totals.values());
        const leaders = finalistIds.filter(
          (teamId) => totals.get(teamId) === highest,
        );
        after.grandFinalTeamId = leaders.length === 1 ? leaders[0] : null;
      }

      const modeLabel =
        answerMode === "SELF"
          ? "menjawab sendiri"
          : `melempar ke ${targetTeam?.name ?? "tim tujuan"}`;
      const actionDescription = `${auctionWinner.name} lelang ${bid} poin, ${modeLabel}, lalu ${
        outcome === "CORRECT" ? "benar" : "salah"
      }.`;

      await createCompetitionAction(tx, {
        eventId,
        adminId,
        kind: "FINAL_S3_RESULT",
        stage: state.stage,
        questionNumber: state.currentQuestion,
        actorTeamId: auctionWinner.id,
        targetTeamId,
        amount: bid,
        outcome,
        answerMode,
        description: actionDescription,
        before,
        after,
        changes,
      });

      return actionDescription;
    });

    return description;
  });
}

export async function selectGrandFinalist(formData: FormData) {
  return performAction(async ({ eventId, adminId }) => {
    const teamId = safeText(formData.get("teamId"));

    const teamName = await prisma.$transaction(async (tx) => {
      const state = await lockedState(tx, eventId);

      if (state.stage !== "FINAL_COMPLETE") {
        throw new Error("Babak Final belum selesai.");
      }

      const teams = await finalists(tx, eventId);
      const totals = await currentFinalTotals(
        tx,
        eventId,
        teams.map((team) => team.id),
      );
      const highest = Math.max(...totals.values());
      const leaders = teams.filter((team) => totals.get(team.id) === highest);
      const selected = leaders.find((team) => team.id === teamId);

      if (!selected) {
        throw new Error("Keputusan juri harus memilih salah satu tim dengan skor tertinggi.");
      }

      const before = snapshotState(state);
      const after: StateSnapshot = {
        ...before,
        grandFinalTeamId: selected.id,
        projectionMode: "QUALIFIERS",
        projectionSession: null,
        projectionMessage: null,
      };

      await createCompetitionAction(tx, {
        eventId,
        adminId,
        kind: "JURY_SELECTION",
        stage: state.stage,
        actorTeamId: selected.id,
        description: `Keputusan juri: ${selected.name} lolos ke Grand Final.`,
        before,
        after,
      });

      return selected.name;
    });

    return `${teamName} ditetapkan juri sebagai peserta Grand Final.`;
  });
}

export async function startGrandFinal(_formData?: FormData) {
  return performAction(async ({ eventId, adminId }) => {
    const teamName = await prisma.$transaction(async (tx) => {
      const state = await lockedState(tx, eventId);

      if (state.stage !== "FINAL_COMPLETE" || !state.grandFinalTeamId) {
        throw new Error("Peserta Grand Final belum ditetapkan.");
      }

      const team = await tx.team.findFirst({
        where: {
          id: state.grandFinalTeamId,
          eventId,
          isSessionWinner: true,
        },
      });

      if (!team) {
        throw new Error("Peserta Grand Final tidak valid.");
      }

      const before = snapshotState(state);
      const after: StateSnapshot = {
        stage: "GRAND_FINAL",
        currentQuestion: 1,
        grandFinalTeamId: team.id,
        grandPrize: 0,
        grandDecisionPending: false,
        projectionMode: "LIVE",
        projectionSession: null,
        projectionMessage: null,
      };

      await createCompetitionAction(tx, {
        eventId,
        adminId,
        kind: "START_GRAND_FINAL",
        stage: state.stage,
        actorTeamId: team.id,
        description: `Grand Final dimulai untuk ${team.name}.`,
        before,
        after,
      });

      return team.name;
    });

    return `Grand Final untuk ${teamName} dimulai.`;
  });
}

export async function decideGrandFinal(formData: FormData) {
  return performAction(async ({ eventId, adminId }) => {
    const expected = expectedQuestion(formData);
    const decision = safeText(formData.get("decision"));

    if (decision !== "CONTINUE" && decision !== "STOP") {
      throw new Error("Keputusan Grand Final tidak valid.");
    }

    const result = await prisma.$transaction(async (tx) => {
      const state = await lockedState(tx, eventId);

      if (
        state.stage !== "GRAND_FINAL" ||
        state.currentQuestion < 2 ||
        !state.grandDecisionPending
      ) {
        throw new Error("Keputusan lanjut belum tersedia.");
      }

      assertExpectedQuestion(state.currentQuestion, expected);
      const before = snapshotState(state);
      const after: StateSnapshot =
        decision === "STOP"
          ? {
              ...before,
              stage: "FINISHED",
              grandDecisionPending: false,
              projectionMode: "WINNER",
              projectionSession: null,
              projectionMessage: null,
            }
          : {
              ...before,
              grandDecisionPending: false,
            };
      const description =
        decision === "STOP"
          ? `Peserta berhenti dan membawa pulang ${formatRupiah(state.grandPrize)}.`
          : `Peserta melanjutkan ke pertanyaan ${state.currentQuestion}.`;

      await createCompetitionAction(tx, {
        eventId,
        adminId,
        kind: "GRAND_DECISION",
        stage: state.stage,
        questionNumber: state.currentQuestion,
        actorTeamId: state.grandFinalTeamId,
        amount: state.grandPrize,
        description,
        before,
        after,
      });

      return description;
    });

    return result;
  });
}

export async function submitGrandFinalResult(formData: FormData) {
  return performAction(async ({ eventId, adminId }) => {
    const expected = expectedQuestion(formData);
    const outcome = outcomeFromForm(formData);

    const description = await prisma.$transaction(async (tx) => {
      const state = await lockedState(tx, eventId);

      if (
        state.stage !== "GRAND_FINAL" ||
        state.grandDecisionPending ||
        !state.grandFinalTeamId
      ) {
        throw new Error("Pertanyaan Grand Final belum siap dinilai.");
      }

      assertExpectedQuestion(state.currentQuestion, expected);

      if (state.currentQuestion < 1 || state.currentQuestion > 4) {
        throw new Error("Nomor pertanyaan Grand Final tidak valid.");
      }

      const team = await tx.team.findUnique({
        where: { id: state.grandFinalTeamId },
      });

      if (!team) {
        throw new Error("Peserta Grand Final tidak ditemukan.");
      }

      const before = snapshotState(state);
      let after: StateSnapshot;
      let actionDescription: string;

      if (outcome === "WRONG") {
        after = {
          ...before,
          stage: "FINISHED",
          grandDecisionPending: false,
          projectionMode: "WINNER",
          projectionSession: null,
          projectionMessage: null,
        };
        actionDescription =
          state.currentQuestion === 1
            ? `${team.name} salah pada pertanyaan pertama dan gugur tanpa hadiah.`
            : `${team.name} salah. Hadiah aman tetap ${formatRupiah(state.grandPrize)}.`;
      } else {
        const grandPrize = state.grandPrize + GRAND_FINAL_QUESTION_PRIZE;
        const isLastQuestion = state.currentQuestion === 4;
        after = {
          ...before,
          stage: isLastQuestion ? "FINISHED" : "GRAND_FINAL",
          currentQuestion: isLastQuestion
            ? state.currentQuestion
            : state.currentQuestion + 1,
          grandPrize,
          grandDecisionPending: !isLastQuestion,
          projectionMode: isLastQuestion ? "WINNER" : before.projectionMode,
          projectionSession: isLastQuestion
            ? null
            : before.projectionSession,
          projectionMessage: isLastQuestion
            ? null
            : before.projectionMessage,
        };
        actionDescription = `${team.name} benar. Total hadiah ${formatRupiah(grandPrize)}.`;
      }

      await createCompetitionAction(tx, {
        eventId,
        adminId,
        kind: "GRAND_RESULT",
        stage: state.stage,
        questionNumber: state.currentQuestion,
        actorTeamId: team.id,
        amount: GRAND_FINAL_QUESTION_PRIZE,
        outcome,
        description: actionDescription,
        before,
        after,
      });

      return actionDescription;
    });

    return description;
  });
}

export async function undoLastCompetitionAction(_formData?: FormData) {
  return performAction(async ({ eventId }) => {
    const description = await prisma.$transaction(async (tx) => {
      const currentState = await lockedState(tx, eventId);
      const action = await tx.competitionAction.findFirst({
        where: { eventId, revertedAt: null },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });

      if (!action) {
        throw new Error("Belum ada input pertandingan yang dapat dibatalkan.");
      }

      const rawBefore = action.stateBefore as unknown as Partial<StateSnapshot>;
      const validStage = Object.values(CompetitionStage).includes(
        rawBefore.stage as CompetitionStage,
      );

      if (
        !validStage ||
        !Number.isInteger(rawBefore.currentQuestion) ||
        !Number.isInteger(rawBefore.grandPrize)
      ) {
        throw new Error("Snapshot aksi terakhir tidak valid.");
      }

      const hasProjectionMode = Object.values(ProjectionMode).includes(
        rawBefore.projectionMode as ProjectionMode,
      );
      const before: StateSnapshot = {
        stage: rawBefore.stage as CompetitionStage,
        currentQuestion: rawBefore.currentQuestion as number,
        grandFinalTeamId: rawBefore.grandFinalTeamId ?? null,
        grandPrize: rawBefore.grandPrize as number,
        grandDecisionPending: Boolean(rawBefore.grandDecisionPending),
        projectionMode: hasProjectionMode
          ? (rawBefore.projectionMode as ProjectionMode)
          : currentState.projectionMode,
        projectionSession:
          "projectionSession" in rawBefore
            ? (rawBefore.projectionSession ?? null)
            : currentState.projectionSession,
        projectionMessage:
          "projectionMessage" in rawBefore
            ? (rawBefore.projectionMessage ?? null)
            : currentState.projectionMessage,
      };

      await tx.competitionState.update({
        where: { eventId },
        data: before,
      });
      await tx.competitionAction.update({
        where: { id: action.id },
        data: { revertedAt: new Date() },
      });

      return action.description;
    });

    return `Dibatalkan: ${description}`;
  });
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export async function resetAllCompetitionResults(): Promise<ActionResult> {
  return performAction(async ({ eventId }) => {
    await prisma.$transaction(async (tx) => {
      // 1. Delete all score deltas
      await tx.scoreDelta.deleteMany({
        where: { eventId },
      });

      // 2. Delete all competition actions
      await tx.competitionAction.deleteMany({
        where: { eventId },
      });

      // 3. Reset all team preliminary scores, durations, & session winner flags
      await tx.team.updateMany({
        where: { eventId },
        data: {
          preliminaryScore: null,
          completionSeconds: null,
          isSessionWinner: false,
          finalOrder: null,
        },
      });

      // 4. Reset competition state to initial PRELIMINARY stage
      await tx.competitionState.update({
        where: { eventId },
        data: {
          stage: "PRELIMINARY",
          currentQuestion: 1,
          grandFinalTeamId: null,
          grandPrize: 0,
          grandDecisionPending: false,
          projectionMode: "LIVE",
          projectionSession: null,
          projectionMessage: null,
          questionSlideStatus: "PENDING",
        },
      });
    });

    return "Seluruh skor, riwayat poin, dan status pertandingan berhasil di-reset ke kondisi awal.";
  });
}
