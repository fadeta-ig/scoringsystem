import assert from "node:assert/strict";
import {
  calculateSession3Changes,
  GRAND_FINAL_QUESTION_PRIZE,
  session1ActiveTeamIndex,
  session2QuestionValue,
  validateAuctionBid,
} from "../src/lib/competition-rules.ts";

const teams = ["a", "b", "c", "d"];

assert.deepEqual(
  Array.from({ length: 12 }, (_, index) => session1ActiveTeamIndex(index + 1)),
  [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3],
);
assert.equal(session2QuestionValue(1), 10);
assert.equal(session2QuestionValue(10), 100);
assert.equal(GRAND_FINAL_QUESTION_PRIZE, 500_000);

assert.deepEqual(
  calculateSession3Changes({
    finalistIds: teams,
    auctionWinnerId: "a",
    bid: 60,
    answerMode: "SELF",
    outcome: "CORRECT",
  }),
  [{ teamId: "a", points: 60 }],
);

assert.deepEqual(
  calculateSession3Changes({
    finalistIds: teams,
    auctionWinnerId: "a",
    bid: 60,
    answerMode: "SELF",
    outcome: "WRONG",
  }),
  [
    { teamId: "a", points: -60 },
    { teamId: "b", points: 20 },
    { teamId: "c", points: 20 },
    { teamId: "d", points: 20 },
  ],
);

assert.deepEqual(
  calculateSession3Changes({
    finalistIds: teams,
    auctionWinnerId: "a",
    targetTeamId: "b",
    bid: 60,
    answerMode: "PASS",
    outcome: "CORRECT",
  }),
  [
    { teamId: "b", points: 60 },
    { teamId: "a", points: -60 },
  ],
);

assert.deepEqual(
  calculateSession3Changes({
    finalistIds: teams,
    auctionWinnerId: "a",
    targetTeamId: "b",
    bid: 60,
    answerMode: "PASS",
    outcome: "WRONG",
  }),
  [
    { teamId: "b", points: -60 },
    { teamId: "a", points: 60 },
  ],
);

assert.throws(() => validateAuctionBid(61));
assert.throws(() => validateAuctionBid(10));
validateAuctionBid(3);
validateAuctionBid(60);

console.log("Competition rule checks passed.");
