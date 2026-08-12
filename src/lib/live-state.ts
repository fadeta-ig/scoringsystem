import type { CompetitionStage } from "@prisma/client";
import {
  SESSION_1_TOTAL_QUESTIONS,
  SESSION_2_TOTAL_QUESTIONS,
  SESSION_3_TOTAL_QUESTIONS,
  session1ActiveTeamIndex,
  session2QuestionValue,
} from "@/lib/competition-rules";
import { prisma } from "@/lib/prisma";

export type LiveState = Awaited<ReturnType<typeof getLiveState>>;

export async function getActiveEventId() {
  const live = await prisma.event.findFirst({
    where: { status: "LIVE" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (live) {
    return live.id;
  }

  const latest = await prisma.event.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  return latest?.id ?? null;
}

export async function getLiveState(eventId?: string | null) {
  const resolvedEventId = eventId ?? (await getActiveEventId());

  if (!resolvedEventId) {
    return null;
  }

  const event = await prisma.event.findUnique({
    where: { id: resolvedEventId },
    include: {
      teams: {
        orderBy: [
          { preliminarySession: "asc" },
          { displayOrder: "asc" },
        ],
      },
      competitionState: {
        include: { grandFinalTeam: true },
      },
      questionFiles: {
        include: {
          mappings: {
            orderBy: { pageNumber: "asc" },
          },
        },
      },
      actions: {
        where: { revertedAt: null },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          actorTeam: true,
          targetTeam: true,
          scoreDeltas: {
            include: { team: true },
          },
        },
      },
    },
  });

  if (!event || !event.competitionState) {
    return null;
  }

  const preliminarySessions = [1, 2, 3, 4].map((sessionNumber) => {
    const entries = event.teams
      .filter((team) => team.preliminarySession === sessionNumber)
      .slice()
      .sort(comparePreliminaryEntries);
    let previous:
      | {
          score: number | null;
          completionSeconds: number | null;
          rank: number | null;
        }
      | undefined;

    const rankedEntries = entries.map((team, index) => {
      const hasScore = team.preliminaryScore !== null;
      const sameAsPrevious =
        previous &&
        previous.score === team.preliminaryScore &&
        previous.completionSeconds === team.completionSeconds;
      const rank = !hasScore
        ? null
        : sameAsPrevious
          ? (previous?.rank ?? null)
          : index + 1;

      previous = {
        score: team.preliminaryScore,
        completionSeconds: team.completionSeconds,
        rank,
      };

      return {
        id: team.id,
        name: team.name,
        photoPath: team.photoPath,
        bannerColor: team.bannerColor,
        displayOrder: team.displayOrder,
        score: team.preliminaryScore,
        completionSeconds: team.completionSeconds,
        rank,
        isWinner: team.isSessionWinner,
      };
    });
    const scoredEntries = rankedEntries.filter((team) => team.score !== null);
    const highestScore = scoredEntries.length
      ? Math.max(...scoredEntries.map((team) => team.score ?? Number.MIN_SAFE_INTEGER))
      : null;
    const scoreLeaders =
      highestScore === null
        ? []
        : rankedEntries.filter((team) => team.score === highestScore);
    const tieRequiresTime =
      scoreLeaders.length > 1 &&
      scoreLeaders.some((team) => team.completionSeconds === null);
    const fastestTime =
      scoreLeaders.length > 1 && !tieRequiresTime
        ? Math.min(
            ...scoreLeaders.map(
              (team) => team.completionSeconds ?? Number.MAX_SAFE_INTEGER,
            ),
          )
        : null;
    const eligibleWinnerIds =
      scoredEntries.length !== rankedEntries.length || tieRequiresTime
        ? []
        : scoreLeaders
            .filter(
              (team) =>
                fastestTime === null ||
                team.completionSeconds === fastestTime,
            )
            .map((team) => team.id);

    return {
      sessionNumber,
      entries: rankedEntries,
      winner: rankedEntries.find((team) => team.isWinner) ?? null,
      complete: rankedEntries.every((team) => team.score !== null),
      eligibleWinnerIds,
      tieRequiresTime,
      juryDecisionRequired: eligibleWinnerIds.length > 1,
    };
  });

  const finalistTeams = event.teams
    .filter((team) => team.isSessionWinner)
    .slice()
    .sort(
      (a, b) =>
        (a.finalOrder ?? Number.MAX_SAFE_INTEGER) -
        (b.finalOrder ?? Number.MAX_SAFE_INTEGER),
    );
  const totals = new Map(finalistTeams.map((team) => [team.id, 0]));
  const sessionTotals = new Map(
    finalistTeams.map((team) => [
      team.id,
      {
        session1: 0,
        session2: 0,
        session3: 0,
      },
    ]),
  );

  for (const action of event.actions) {
    for (const delta of action.scoreDeltas) {
      if (!totals.has(delta.teamId)) {
        continue;
      }

      totals.set(delta.teamId, (totals.get(delta.teamId) ?? 0) + delta.points);
      const breakdown = sessionTotals.get(delta.teamId);

      if (!breakdown) {
        continue;
      }

      if (action.stage === "FINAL_SESSION_1") {
        breakdown.session1 += delta.points;
      } else if (action.stage === "FINAL_SESSION_2") {
        breakdown.session2 += delta.points;
      } else if (action.stage === "FINAL_SESSION_3") {
        breakdown.session3 += delta.points;
      }
    }
  }

  const finalists = finalistTeams.map((team) => ({
    id: team.id,
    name: team.name,
    photoPath: team.photoPath,
    bannerColor: team.bannerColor,
    finalOrder: team.finalOrder ?? 0,
    sourceSession: team.preliminarySession,
    score: totals.get(team.id) ?? 0,
    sessionScores: sessionTotals.get(team.id) ?? {
      session1: 0,
      session2: 0,
      session3: 0,
    },
  }));
  const leaderboard = finalists
    .slice()
    .sort((a, b) => b.score - a.score || a.finalOrder - b.finalOrder)
    .map((team, _index, teams) => ({
      ...team,
      rank: teams.findIndex((candidate) => candidate.score === team.score) + 1,
    }));
  const highestScore = leaderboard[0]?.score ?? 0;
  const eligibleGrandFinalists =
    event.competitionState.stage === "FINAL_COMPLETE"
      ? leaderboard.filter((team) => team.score === highestScore)
      : [];
  const flow = buildFlow(
    event.competitionState.stage,
    event.competitionState.currentQuestion,
    finalists,
  );

  return {
    event: {
      id: event.id,
      name: event.name,
      date: event.date?.toISOString() ?? null,
      status: event.status,
    },
    competition: {
      stage: event.competitionState.stage,
      currentQuestion: event.competitionState.currentQuestion,
      grandFinalTeamId: event.competitionState.grandFinalTeamId,
      grandFinalTeamName:
        event.competitionState.grandFinalTeam?.name ?? null,
      grandFinalTeamColor:
        event.competitionState.grandFinalTeam?.bannerColor ?? null,
      grandFinalTeamPhoto:
        event.competitionState.grandFinalTeam?.photoPath ?? null,
      grandPrize: event.competitionState.grandPrize,
      grandDecisionPending:
        event.competitionState.grandDecisionPending,
      projectionMode: event.competitionState.projectionMode,
      projectionSession: event.competitionState.projectionSession,
      projectionMessage: event.competitionState.projectionMessage,
      questionSlideStatus: event.competitionState.questionSlideStatus,
      updatedAt: event.competitionState.updatedAt.toISOString(),
    },
    flow,
    questionViewer: (() => {
      const compState = event.competitionState;

      if (!compState) {
        return null;
      }

      const activeStageFile = event.questionFiles.find(
        (f) => f.stage === compState.stage,
      );

      if (!activeStageFile) {
        return null;
      }

      const activeQuestionNum = compState.currentQuestion;
      const activeMapping = activeStageFile.mappings.find(
        (m) => m.questionNumber === activeQuestionNum,
      );

      return {
        fileId: activeStageFile.id,
        stage: activeStageFile.stage,
        originalName: activeStageFile.originalName,
        storagePath: activeStageFile.storagePath,
        totalPages: activeStageFile.totalPages,
        activePageNumber: activeMapping?.pageNumber ?? null,
        activeQuestionNumber: activeQuestionNum,
        activeStatus: compState.questionSlideStatus,
        mappings: activeStageFile.mappings.map((m) => ({
          id: m.id,
          pageNumber: m.pageNumber,
          questionNumber: m.questionNumber,
        })),
      };
    })(),
    preliminarySessions,
    finalists,
    leaderboard,
    eligibleGrandFinalists,
    recentActions: event.actions.slice(0, 5).map((action) => ({
      id: action.id,
      kind: action.kind,
      stage: action.stage,
      questionNumber: action.questionNumber,
      description: action.description,
      actorTeamName: action.actorTeam?.name ?? null,
      targetTeamName: action.targetTeam?.name ?? null,
      amount: action.amount,
      outcome: action.outcome,
      answerMode: action.answerMode,
      createdAt: action.createdAt.toISOString(),
      deltas: action.scoreDeltas.map((delta) => ({
        teamId: delta.teamId,
        teamName: delta.team.name,
        points: delta.points,
      })),
    })),
    generatedAt: new Date().toISOString(),
  };
}

export async function getPublicLiveState(eventId?: string | null) {
  return getLiveState(eventId);
}

function comparePreliminaryEntries(
  a: {
    preliminaryScore: number | null;
    completionSeconds: number | null;
    displayOrder: number;
  },
  b: {
    preliminaryScore: number | null;
    completionSeconds: number | null;
    displayOrder: number;
  },
) {
  if (a.preliminaryScore === null && b.preliminaryScore !== null) {
    return 1;
  }

  if (a.preliminaryScore !== null && b.preliminaryScore === null) {
    return -1;
  }

  if (
    a.preliminaryScore !== null &&
    b.preliminaryScore !== null &&
    a.preliminaryScore !== b.preliminaryScore
  ) {
    return b.preliminaryScore - a.preliminaryScore;
  }

  if (a.completionSeconds === null && b.completionSeconds !== null) {
    return 1;
  }

  if (a.completionSeconds !== null && b.completionSeconds === null) {
    return -1;
  }

  if (
    a.completionSeconds !== null &&
    b.completionSeconds !== null &&
    a.completionSeconds !== b.completionSeconds
  ) {
    return a.completionSeconds - b.completionSeconds;
  }

  return a.displayOrder - b.displayOrder;
}

function buildFlow(
  stage: CompetitionStage,
  currentQuestion: number,
  finalists: Array<{ id: string; name: string }>,
) {
  if (stage === "FINAL_SESSION_1") {
    const activeTeam =
      finalists.length === 4
        ? finalists[session1ActiveTeamIndex(currentQuestion)]
        : null;

    return {
      label: "Babak Final · Sesi 1",
      shortLabel: "Final Sesi 1",
      totalQuestions: SESSION_1_TOTAL_QUESTIONS,
      questionValue: 10,
      activeTeamId: activeTeam?.id ?? null,
      activeTeamName: activeTeam?.name ?? null,
    };
  }

  if (stage === "FINAL_SESSION_2") {
    return {
      label: "Babak Final · Sesi 2",
      shortLabel: "Final Sesi 2",
      totalQuestions: SESSION_2_TOTAL_QUESTIONS,
      questionValue: session2QuestionValue(currentQuestion),
      activeTeamId: null,
      activeTeamName: null,
    };
  }

  if (stage === "FINAL_SESSION_3") {
    return {
      label: "Babak Final · Sesi 3",
      shortLabel: "Final Sesi 3",
      totalQuestions: SESSION_3_TOTAL_QUESTIONS,
      questionValue: null,
      activeTeamId: null,
      activeTeamName: null,
    };
  }

  const labels: Record<CompetitionStage, string> = {
    PRELIMINARY: "Babak Penyisihan",
    FINAL_SESSION_1: "Babak Final · Sesi 1",
    FINAL_SESSION_2: "Babak Final · Sesi 2",
    FINAL_SESSION_3: "Babak Final · Sesi 3",
    FINAL_COMPLETE: "Hasil Babak Final",
    GRAND_FINAL: "Babak Grand Final",
    FINISHED: "Hasil Akhir",
  };

  return {
    label: labels[stage],
    shortLabel: labels[stage],
    totalQuestions: stage === "GRAND_FINAL" ? 4 : null,
    questionValue:
      stage === "GRAND_FINAL" ? 500_000 : null,
    activeTeamId: null,
    activeTeamName: null,
  };
}
