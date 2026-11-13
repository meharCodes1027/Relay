import assert from "node:assert/strict";
import test from "node:test";
import { getMomentumSignals } from "../src/momentum.js";

const now = new Date("2026-10-29T12:00:00Z");

test("momentum rules explain blocked, overdue, stale, and missing actions", () => {
  const signals = getMomentumSignals({
    status: "blocked",
    blockedReason: "Waiting on API access",
    dueDate: "2026-10-20T00:00:00Z",
    lastMeaningfulUpdate: "2026-10-10T00:00:00Z",
    nextAction: ""
  }, now);

  assert.deepEqual(signals.map((signal) => signal.type), [
    "blocked",
    "overdue",
    "stale",
    "next_action_missing"
  ]);
  assert.equal(signals[0].reason, "Waiting on API access");
});

test("completed tasks never enter the focus queue", () => {
  assert.deepEqual(getMomentumSignals({
    status: "done",
    dueDate: "2026-10-01T00:00:00Z"
  }, now), []);
});
