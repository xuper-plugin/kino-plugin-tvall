import { SEED } from "./catalog-seed.js";

// Where the live list of sources lives. raw.githubusercontent first, jsDelivr as a mirror; both
// declared hosts so this never spends the "any" fetch budget. If both fail or answer junk, the
// bundled seed keeps the plugin working offline.
const RAW = "https://raw.githubusercontent.com/xuper-plugin/kino-plugin-tvall/main/tvall.json";
const JSDELIVR = "https://cdn.jsdelivr.net/gh/xuper-plugin/kino-plugin-tvall@main/tvall.json";
const CACHE_KEY = "catalog.v1";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

async function fetchCatalog(url) {
  const r = await kino.fetch(url, { headers: {}, timeoutMs: 8000 });
  if (!r.ok) throw new Error("http " + r.status);
  const obj = JSON.parse(await r.text());
  if (!obj || !Array.isArray(obj.hosts)) throw new Error("bad shape");
  return obj;
}

/** The source list: the cached copy, else the remote JSON (raw then jsDelivr), else the bundled seed. Never throws. */
export async function loadCatalog() {
  try {
    const c = kino.storage.get(CACHE_KEY);
    if (c) return JSON.parse(c);
  } catch (_) { /* unreadable cache: fetch */ }
  for (const url of [RAW, JSDELIVR]) {
    try {
      const obj = await fetchCatalog(url);
      try { kino.storage.set(CACHE_KEY, JSON.stringify(obj), { ttlMs: CACHE_TTL_MS }); } catch (_) { /* full storage: no cache */ }
      return obj;
    } catch (_) { /* try the next source */ }
  }
  return SEED;
}

/** The hosts the plugin should use now: enabled and not marked down, best weight first. */
export function activeHosts(cat) {
  return (cat?.hosts || [])
    .filter((h) => h && h.enabled && h.status !== "down")
    .sort((a, b) => (b.weight || 0) - (a.weight || 0));
}
