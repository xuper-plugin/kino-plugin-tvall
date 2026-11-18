import { activeHosts } from "./catalog.js";
import { handlerFor } from "./handlers/index.js";

// Merge the live channels of every active host into one de-duped list, and resolve a channel by trying
// the hosts that carry it in weight order. A channel that several hosts offer becomes ONE entry whose
// ref carries every (host, id) candidate, so a failed signal falls through to the next host.

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// ref = base64url("host:id|host:id|…") — fits Kino's channel-id charset. Candidates are ASCII.
function encodeRef(cands) {
  const s = cands.map((c) => c.hostId + ":" + c.id).join("|");
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function decodeRef(ref) {
  try {
    let b = String(ref || "").replace(/-/g, "+").replace(/_/g, "/");
    while (b.length % 4) b += "=";
    return atob(b).split("|").filter(Boolean).map((p) => { const i = p.indexOf(":"); return { hostId: p.slice(0, i), id: p.slice(i + 1) }; });
  } catch (_) { return []; }
}

async function listFrom(kind, cat, ctx, hf) {
  const hosts = activeHosts(cat).filter((h) => (h.provides || []).includes(kind === "events" ? "events" : "channels"));
  const lists = await Promise.all(hosts.map(async (h) => {
    const handler = hf(h);
    if (!handler) return [];
    try {
      const items = kind === "events" ? await handler.listEvents(h, ctx) : await handler.listChannels(h, ctx);
      return (items || []).map((c) => ({ ...c, _hostId: h.id, _weight: h.weight || 0 }));
    } catch (_) { return []; } // one dead host never fails the whole list
  }));
  const byKey = new Map();
  for (const c of lists.flat()) {
    const key = norm(c.title) + "|" + (c.start || "");
    if (!byKey.has(key)) byKey.set(key, { title: c.title, logo: c.logo, categoryId: c.categoryId, start: c.start, cands: [] });
    const e = byKey.get(key);
    if (!e.logo && c.logo) e.logo = c.logo;
    e.cands.push({ hostId: c._hostId, id: String(c.id), weight: c._weight });
  }
  return [...byKey.values()].map((e) => {
    e.cands.sort((a, b) => b.weight - a.weight);
    const ref = encodeRef(e.cands);
    // Kino resolves a live channel by its `ref`; `id` is just the row identity. Both are the encoded candidates.
    const out = { id: ref, ref, title: e.title, logo: e.logo, categoryId: e.categoryId || "all" };
    if (e.start) out.start = e.start;
    return out;
  });
}

/** Every 24/7 channel across the active hosts, de-duped, best source first. */
export function allChannels(cat, ctx, hf = handlerFor) {
  return listFrom("channels", cat, ctx, hf);
}

/** Today's events across the active hosts, de-duped. */
export function allEvents(cat, ctx, hf = handlerFor) {
  return listFrom("events", cat, ctx, hf);
}

// "Live now" window: an event counts as live from 15 min before kickoff until 3 h after. An event with
// no known start (a 24/7-style entry) always counts.
const LIVE_AHEAD_MS = 15 * 60 * 1000;
const LIVE_BEHIND_MS = 3 * 60 * 60 * 1000;
const isLiveNow = (ev, now) => !ev.start || (ev.start <= now + LIVE_AHEAD_MS && ev.start >= now - LIVE_BEHIND_MS);

/** Today's events across active hosts, keeping only those live now (past events dropped). */
export async function liveNow(cat, ctx, hf = handlerFor, now = Date.now()) {
  return (await allEvents(cat, ctx, hf)).filter((e) => isLiveNow(e, now));
}

/** Whether any active host offers events (so the "En vivo ahora" category is worth showing). */
export function catalogHasEvents(cat) {
  return activeHosts(cat).some((h) => (h.provides || []).includes("events"));
}

/** Resolve a channel/event ref: try each candidate host in weight order, first playable stream wins, else null. */
export async function resolveRef(cat, ref, ctx, hf = handlerFor) {
  for (const { hostId, id } of decodeRef(ref)) {
    const host = (cat.hosts || []).find((h) => h.id === hostId);
    if (!host) continue;
    const handler = hf(host);
    if (!handler) continue;
    try { const s = await handler.resolve(host, id, ctx); if (s && s.url) return s; } catch (_) { /* try next candidate */ }
  }
  return null;
}
