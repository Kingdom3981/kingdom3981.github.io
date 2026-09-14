import test from "node:test";
import assert from "node:assert/strict";
import { expandEventRows, uuidFromString } from "../scripts/lib/schedules.js";

test("recurring events expand into a rolling window and skip expired reminders", () => {
  const rows = [
    {
      "Event ID": "bauler-1",
      Enabled: "TRUE",
      Title: "Bauler Run",
      Message: "Starts soon",
      "UTC Time": "13:00",
      Recurrence: "daily",
      "Reminder Minutes": "15",
      Destination: "./bauler-runs.html",
      Audience: "bauler"
    }
  ];
  const { occurrences, errors } = expandEventRows(rows, {
    now: new Date("2026-09-14T12:50:00Z"),
    windowDays: 2,
    minLeadMinutes: 5
  });
  assert.equal(errors.length, 0);
  assert.equal(occurrences[0].sendAfter, "2026-09-15T12:45:00.000Z");
});

test("weekday recurrence selects configured weekdays", () => {
  const rows = [
    {
      "Event ID": "weekday",
      Enabled: "TRUE",
      Title: "Weekday",
      Message: "Only Monday",
      "UTC Time": "18:00",
      Recurrence: "weekdays:mon",
      "Reminder Minutes": "0",
      Destination: "./",
      Audience: "kingdom"
    }
  ];
  const { occurrences } = expandEventRows(rows, {
    now: new Date("2026-09-14T10:00:00Z"),
    windowDays: 7,
    minLeadMinutes: 0
  });
  assert.deepEqual(
    occurrences.map((occurrence) => occurrence.startAt),
    ["2026-09-14T18:00:00.000Z"]
  );
});

test("schedule edits change content hash while occurrence key remains stable", () => {
  const base = {
    "Event ID": "edit-me",
    Enabled: "TRUE",
    Title: "Old",
    Message: "Starts soon",
    "UTC Date": "2026-09-15",
    "UTC Time": "18:00",
    Recurrence: "once",
    "Reminder Minutes": "30",
    Destination: "./",
    Audience: "test"
  };
  const first = expandEventRows([base], { now: new Date("2026-09-14T10:00:00Z") }).occurrences[0];
  const second = expandEventRows([{ ...base, Title: "New" }], { now: new Date("2026-09-14T10:00:00Z") }).occurrences[0];
  assert.equal(first.key, second.key);
  assert.notEqual(first.contentHash, second.contentHash);
});

test("idempotency keys are stable UUIDs", () => {
  const first = uuidFromString("same-occurrence");
  const second = uuidFromString("same-occurrence");
  assert.equal(first, second);
  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
