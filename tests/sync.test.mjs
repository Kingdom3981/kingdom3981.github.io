import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(new URL("..", import.meta.url).pathname);
const syncScript = path.join(projectRoot, "scripts", "sync-sheets.mjs");

test("sync preserves last valid live snapshot when a fetch returns HTML", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "k3981-sync-"));
  await fs.mkdir(path.join(temp, "data", "snapshots"), { recursive: true });
  await fs.writeFile(
    path.join(temp, "data", "table-config.json"),
    JSON.stringify({ tables: { "fort-rankings": {} } })
  );
  await fs.writeFile(
    path.join(temp, "data", "sync-sources.json"),
    JSON.stringify({
      mode: "live",
      sources: {
        "fort-rankings": {
          tab: "Fort Rankings",
          csvUrl: "data:text/html,%3Chtml%3Elogin%3C/html%3E"
        }
      }
    })
  );
  const existing = {
    dataset: "fort-rankings",
    mode: "live",
    status: "valid",
    sync: { lastSuccessAt: "2026-09-14T00:00:00.000Z", failures: [] },
    headers: ["Governor ID", "Player"],
    rows: [{ "Governor ID": "0001", Player: "Saved" }]
  };
  await fs.writeFile(path.join(temp, "data", "snapshots", "fort-rankings.json"), JSON.stringify(existing, null, 2));

  await execFileAsync(process.execPath, [syncScript], { cwd: temp });

  const after = JSON.parse(await fs.readFile(path.join(temp, "data", "snapshots", "fort-rankings.json"), "utf8"));
  assert.equal(after.rows[0]["Governor ID"], "0001");
  assert.equal(after.sync.lastSuccessAt, "2026-09-14T00:00:00.000Z");
  assert.equal(after.sync.failures.length, 1);
});
