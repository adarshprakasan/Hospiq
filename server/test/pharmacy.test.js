const { test } = require("node:test");
const assert = require("node:assert/strict");
const { amount } = require("../services/pharmacy");
test("pharmacy totals use integer fils and confirmed dispensing quantities", () => {
  assert.equal(amount([{ gathered: true, quantity: 3, unitPriceMinor: 125 }, { gathered: true, quantity: 2, unitPriceMinor: 999 }]), 2373);
});
test("pharmacy cannot be ready with incomplete checklist or invalid money/quantity", () => {
  for (const line of [{ gathered: false, quantity: 1, unitPriceMinor: 100 }, { gathered: true, quantity: 0, unitPriceMinor: 100 }, { gathered: true, quantity: 1.5, unitPriceMinor: 100 }, { gathered: true, quantity: 1, unitPriceMinor: -1 }, { gathered: true, quantity: 1, unitPriceMinor: 1.1 }, { gathered: true, quantity: 1 }]) assert.throws(() => amount([line]), { status: 400 });
  assert.throws(() => amount([]), { status: 400 });
});
test("late status polls cannot roll a paid receipt or frozen bill back to older state", async () => {
  const file = require("node:url").pathToFileURL(require("node:path").resolve(__dirname, "../../client/src/utils/pharmacy.js"));
  const { newestOrder } = await import(file.href);
  const paid = { _id: "order", version: 5, paymentStatus: "paid", updatedAt: "2026-11-06T10:00:00Z" };
  assert.equal(newestOrder(paid, { ...paid, version: 4, paymentStatus: "unpaid" }), paid);
  assert.equal(newestOrder(paid, { ...paid, updatedAt: "2026-11-06T09:00:00Z", paymentStatus: "unpaid" }), paid);
  const another = { _id: "another-order", version: 0 };
  assert.equal(newestOrder(paid, another), another);
});
