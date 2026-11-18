import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "../sdk/validate.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("Kino accepts the manifest and exports", async () => {
  const r = await validate(root, { repo: "xuper-plugin/kino-plugin-tvall" });
  assert.deepEqual(r.problems, []);
});

test("manifest declares live TV with dynamic hosts", () => {
  const m = JSON.parse(readFileSync(join(root, "kino-plugin.json"), "utf8"));
  assert.equal(m.id, "tvall");
  assert.ok(m.capabilities.includes("channels"), "has channels capability");
  assert.equal(m.liveStreamHosts, "any", "streams from any host the JSON names");
  assert.equal(m.fetchHosts, "any", "scrapes any host the JSON names");
});
