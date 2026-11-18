import { test } from "node:test";
import assert from "node:assert/strict";
import { updateStatuses } from "../tools/validate-hosts.mjs";

const NOW = 1_800_000_000_000;

test("updateStatuses marks up/down, stamps lastCheck, bumps updatedAt, keeps the rest", async () => {
  const cat = { schema: 1, updatedAt: 1, hosts: [
    { id: "good", type: "generic", enabled: true, status: "unknown", lastCheck: 0, weight: 5, provides: ["channels"], recipe: { a: 1 } },
    { id: "bad", type: "generic", enabled: true, status: "up", lastCheck: 0, weight: 5, provides: ["channels"], recipe: {} },
  ] };
  const runHealth = async (host) => (host.id === "good" ? { ok: true, channels: 12 } : { ok: false, channels: 0 });

  const out = await updateStatuses(cat, runHealth, NOW);

  assert.equal(out.updatedAt, NOW);
  const good = out.hosts.find((h) => h.id === "good");
  const bad = out.hosts.find((h) => h.id === "bad");
  assert.equal(good.status, "up");
  assert.equal(bad.status, "down");
  assert.equal(good.lastCheck, NOW);
  assert.deepEqual(good.recipe, { a: 1 }, "recipe preserved");
  assert.equal(good.weight, 5, "other fields preserved");
});
