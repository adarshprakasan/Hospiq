const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateMedication } = require("../services/medication-validation");
const base = { name: "Example 500 mg tablet", times: ["morning", "night"], startDate: "2026-11-06", endDate: "2026-11-10", foodTiming: "after", instructions: "Example only" };
test("structured prescriptions retain strength, time slots, date range, food timing and instructions", () => {
  assert.deepEqual(validateMedication(base), base);
  assert.equal(validateMedication({ ...base, endDate: base.startDate }).endDate, base.startDate);
});
test("invalid or reversed medication dates and invalid schedules are rejected", () => {
  for (const changes of [{ endDate: "" }, { endDate: "2026-11-05" }, { startDate: "2026-02-30" }, { times: [] }, { times: ["morning", "morning"] }, { times: ["evening"] }, { foodTiming: ["before", "after"] }, { medicationId: "bad-id" }, { instructions: {} }]) {
    assert.throws(() => validateMedication({ ...base, ...changes }), { status: 400 });
  }
});
test("older medication records remain supported without structured scheduling", () => {
  const old = { name: "Example", dose: "500 mg", frequency: "Daily", duration: "7 days", instructions: "Example only" };
  assert.deepEqual(validateMedication(old), old);
});
