import { test } from "node:test";
import assert from "node:assert/strict";
import { loadCatalog, activeHosts } from "../src/catalog.js";
import { SEED } from "../src/catalog-seed.js";

function stubKino(fetchImpl) {
  globalThis.kino = {
    fetch: fetchImpl,
    storage: { _m: {}, get(k) { return this._m[k] ?? null; }, set(k, v) { this._m[k] = v; } },
    lang: "es",
  };
}

test("loadCatalog returns the remote JSON when fetch is valid", async () => {
  const remote = { schema: 1, hosts: [{ id: "x", type: "generic", enabled: true, status: "up", weight: 1 }] };
  stubKino(async () => ({ ok: true, async text() { return JSON.stringify(remote); } }));
  const cat = await loadCatalog();
  assert.equal(cat.hosts[0].id, "x");
});

test("loadCatalog falls back to the bundled seed when fetch fails", async () => {
  stubKino(async () => { throw new Error("down"); });
  const cat = await loadCatalog();
  assert.equal(cat.hosts.length, SEED.hosts.length);
});

test("loadCatalog falls back to the seed on invalid JSON", async () => {
  stubKino(async () => ({ ok: true, async text() { return "<html>not json"; } }));
  const cat = await loadCatalog();
  assert.equal(cat.hosts.length, SEED.hosts.length);
});

test("activeHosts drops disabled and down hosts and orders by weight", () => {
  stubKino(async () => ({ ok: false }));
  const cat = { hosts: [
    { id: "a", enabled: true, status: "up", weight: 1 },
    { id: "b", enabled: false, status: "up", weight: 9 },
    { id: "c", enabled: true, status: "down", weight: 9 },
    { id: "d", enabled: true, status: "up", weight: 5 },
  ] };
  assert.deepEqual(activeHosts(cat).map((h) => h.id), ["d", "a"]);
});
