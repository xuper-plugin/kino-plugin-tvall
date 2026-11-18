// Daily validator: runs each host's handler.health() and writes status/lastCheck back into tvall.json.
// Pure core (updateStatuses) is unit-tested; main() wires a Node shim for kino and the real handlers.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Apply health results to a catalog: up/down + lastCheck per host, updatedAt bumped, everything else kept. */
export async function updateStatuses(catalog, runHealth, now = Date.now()) {
  const hosts = [];
  for (const h of catalog.hosts || []) {
    let res = { ok: false };
    try { res = await runHealth(h); } catch (_) { res = { ok: false }; }
    hosts.push({ ...h, status: res && res.ok ? "up" : "down", lastCheck: now });
  }
  return { ...catalog, updatedAt: now, hosts };
}

function installKinoShim() {
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:101.0) Gecko/20100101 Firefox/101.0";
  globalThis.kino = {
    async fetch(url, { headers, timeoutMs } = {}) {
      const r = await fetch(url, { headers: { "User-Agent": UA, ...(headers || {}) }, redirect: "follow", signal: AbortSignal.timeout(timeoutMs || 8000) });
      return { ok: r.ok, status: r.status, async text() { return await r.text(); } };
    },
    storage: { get() { return null; }, set() {} },
    error: (code, message) => Object.assign(new Error(message), { code }),
    sleep: (ms) => new Promise((res) => setTimeout(res, ms)),
    lang: "es",
  };
}

async function main() {
  installKinoShim();
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const file = join(root, "tvall.json");
  const cat = JSON.parse(readFileSync(file, "utf8"));
  const { handlerFor } = await import("../src/handlers/index.js");
  const { makeCtx } = await import("../src/net.js");
  const runHealth = async (host) => {
    if (!host.enabled) return { ok: host.status === "up" ? true : false }; // leave disabled hosts untouched-ish
    const handler = handlerFor(host);
    if (!handler) return { ok: false };
    return handler.health(host, makeCtx({ deadline: Date.now() + 25000 }));
  };
  const out = await updateStatuses(cat, runHealth);
  writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
  writeFileSync(join(root, "src", "catalog-seed.js"),
    "// Generated from tvall.json — the offline fallback source list. Keep in sync (test/seed asserts equality).\nexport const SEED = " + JSON.stringify(out, null, 2) + ";\n");
  const up = out.hosts.filter((h) => h.status === "up").length;
  console.log(`validated ${out.hosts.length} hosts, ${up} up`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("validate-hosts.mjs")) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
