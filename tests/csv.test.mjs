import test from "node:test";
import assert from "node:assert/strict";
import { csvToObjects, parseCsv, toCsv } from "../scripts/lib/csv.js";

test("CSV parser handles commas, quotes, unicode, multiline cells, and blanks", () => {
  const csv = 'ID,Name,Notes\n001,"Mira, The Bold","Line one\nLine ""two"""\n002,Bjorn,\n';
  const parsed = csvToObjects(csv);
  assert.deepEqual(parsed.headers, ["ID", "Name", "Notes"]);
  assert.equal(parsed.rows[0].ID, "001");
  assert.equal(parsed.rows[0].Name, "Mira, The Bold");
  assert.equal(parsed.rows[0].Notes, 'Line one\nLine "two"');
  assert.equal(parsed.rows[1].Notes, "");
});

test("CSV parser reports duplicate and missing headers", () => {
  const parsed = csvToObjects("ID,,ID\n1,x,2");
  assert.deepEqual(parsed.duplicateHeaders, ["ID"]);
  assert.deepEqual(parsed.missingHeaders, ["Column 2"]);
});

test("CSV writer round trips quoted values", () => {
  const rows = [
    ["Name", "Note"],
    ["Astra", "comma, quote \" and line\nbreak"]
  ];
  assert.deepEqual(parseCsv(toCsv(rows)), rows);
});
