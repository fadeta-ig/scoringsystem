export const PRELIMINARY_SESSION_COUNT = 4;
export const PRELIMINARY_TEAMS_PER_SESSION = 6;
export const FINALIST_COUNT = 4;
export const SESSION_1_QUESTIONS_PER_TEAM = 3;
export const SESSION_1_TOTAL_QUESTIONS =
  FINALIST_COUNT * SESSION_1_QUESTIONS_PER_TEAM;
export const SESSION_2_TOTAL_QUESTIONS = 10;
export const SESSION_3_TOTAL_QUESTIONS = 10;
export const AUCTION_MAX_POINTS = 60;
export const AUCTION_DISTRIBUTION_TEAMS = 3;
export const GRAND_FINAL_TOTAL_QUESTIONS = 4;
export const GRAND_FINAL_QUESTION_PRIZE = 500_000;

export type FinalStage =
  | "FINAL_SESSION_1"
  | "FINAL_SESSION_2"
  | "FINAL_SESSION_3";

export type AuctionAnswerMode = "SELF" | "PASS";
export type AnswerResult = "CORRECT" | "WRONG";

export type ScoreChange = {
  teamId: string;
  points: number;
};

export function session1ActiveTeamIndex(questionNumber: number) {
  assertQuestion(questionNumber, SESSION_1_TOTAL_QUESTIONS);
  return (questionNumber - 1) % FINALIST_COUNT;
}

export function session2QuestionValue(questionNumber: number) {
  assertQuestion(questionNumber, SESSION_2_TOTAL_QUESTIONS);
  return questionNumber * 10;
}

export function validateAuctionBid(bid: number) {
  if (!Number.isInteger(bid) || bid <= 0) {
    throw new Error("Nilai lelang harus berupa bilangan bulat positif.");
  }

  if (bid > AUCTION_MAX_POINTS) {
    throw new Error(`Nilai lelang maksimal ${AUCTION_MAX_POINTS} poin.`);
  }

  if (bid % AUCTION_DISTRIBUTION_TEAMS !== 0) {
    throw new Error(
      `Nilai lelang harus habis dibagi ${AUCTION_DISTRIBUTION_TEAMS}.`,
    );
  }
}

export function calculateSession3Changes({
  finalistIds,
  auctionWinnerId,
  targetTeamId,
  bid,
  answerMode,
  outcome,
}: {
  finalistIds: string[];
  auctionWinnerId: string;
  targetTeamId?: string | null;
  bid: number;
  answerMode: AuctionAnswerMode;
  outcome: AnswerResult;
}): ScoreChange[] {
  validateAuctionBid(bid);

  if (
    finalistIds.length !== FINALIST_COUNT ||
    new Set(finalistIds).size !== FINALIST_COUNT
  ) {
    throw new Error("Babak Final harus memiliki tepat 4 tim.");
  }

  if (!finalistIds.includes(auctionWinnerId)) {
    throw new Error("Pemenang lelang bukan peserta Babak Final.");
  }

  if (answerMode === "SELF") {
    if (targetTeamId) {
      throw new Error("Jawab sendiri tidak boleh memiliki tim tujuan.");
    }

    if (outcome === "CORRECT") {
      return [{ teamId: auctionWinnerId, points: bid }];
    }

    const share = bid / AUCTION_DISTRIBUTION_TEAMS;
    return [
      { teamId: auctionWinnerId, points: -bid },
      ...finalistIds
        .filter((teamId) => teamId !== auctionWinnerId)
        .map((teamId) => ({ teamId, points: share })),
    ];
  }

  if (
    !targetTeamId ||
    targetTeamId === auctionWinnerId ||
    !finalistIds.includes(targetTeamId)
  ) {
    throw new Error("Tim tujuan lempar tidak valid.");
  }

  return outcome === "CORRECT"
    ? [
        { teamId: targetTeamId, points: bid },
        { teamId: auctionWinnerId, points: -bid },
      ]
    : [
        { teamId: targetTeamId, points: -bid },
        { teamId: auctionWinnerId, points: bid },
      ];
}

export function nextFinalStage(stage: FinalStage) {
  if (stage === "FINAL_SESSION_1") {
    return { stage: "FINAL_SESSION_2" as const, currentQuestion: 1 };
  }

  if (stage === "FINAL_SESSION_2") {
    return { stage: "FINAL_SESSION_3" as const, currentQuestion: 1 };
  }

  return { stage: "FINAL_COMPLETE" as const, currentQuestion: 1 };
}

export function questionTotal(stage: FinalStage) {
  if (stage === "FINAL_SESSION_1") {
    return SESSION_1_TOTAL_QUESTIONS;
  }

  if (stage === "FINAL_SESSION_2") {
    return SESSION_2_TOTAL_QUESTIONS;
  }

  return SESSION_3_TOTAL_QUESTIONS;
}

export function formatDuration(totalSeconds: number | null) {
  if (totalSeconds === null) {
    return "—";
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function assertQuestion(questionNumber: number, totalQuestions: number) {
  if (
    !Number.isInteger(questionNumber) ||
    questionNumber < 1 ||
    questionNumber > totalQuestions
  ) {
    throw new Error("Nomor pertanyaan tidak valid.");
  }
}
