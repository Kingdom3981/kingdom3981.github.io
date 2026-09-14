import test from "node:test";
import assert from "node:assert/strict";
import { getNextDailyOccurrenceUtc } from "../assets/js/utils.js";
import { parseNumberish, sortRows } from "../assets/js/data-table.js";

test("numeric parser supports grouped numbers, decimals, percentages, blanks, and zero", () => {
  assert.equal(parseNumberish("1,234"), 1234);
  assert.equal(parseNumberish("2.5"), 2.5);
  assert.equal(parseNumberish("2.5%"), 0.025);
  assert.equal(parseNumberish("0"), 0);
  assert.equal(parseNumberish(""), null);
});

test("numeric sorting preserves ID strings while sorting configured metrics numerically", () => {
  const rows = [
    { "Governor ID": "0002", Score: "10" },
    { "Governor ID": "0001", Score: "2" },
    { "Governor ID": "0003", Score: "" }
  ];
  const sorted = sortRows(rows, "Score", "asc", "number");
  assert.deepEqual(
    sorted.map((row) => row["Governor ID"]),
    ["0001", "0002", "0003"]
  );
});

test("daily UTC countdown rolls over midnight", () => {
  const now = new Date("2026-09-14T23:50:00Z");
  const next = getNextDailyOccurrenceUtc(["01:00", "22:00"], now);
  assert.equal(next.toISOString(), "2026-09-15T01:00:00.000Z");
});
