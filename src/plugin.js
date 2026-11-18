import { t } from "./i18n.js";
import { loadCatalog, activeHosts } from "./catalog.js";
import { makeCtx } from "./net.js";
import { allChannels, resolveRef, liveNow, catalogHasEvents } from "./aggregate.js";

const CALL_MS = 18000;
const HOME_ROW_MAX = 40;
const CHANNELS_MAX = 500; // Kino caps a live category at 500; trim here so nothing is dropped with noise
const EVENTS_TTL_MS = 8 * 60 * 1000; // events are time-bound: refetch often
const EVENTS_KEY = "events.v1";

// Events kept briefly (they move fast); a past one is still dropped by liveNow on read.
async function liveNowCached(cat) {
  try {
    const c = kino.storage.get(EVENTS_KEY);
    if (c) { const { at, v } = JSON.parse(c); if (Date.now() - at < EVENTS_TTL_MS) return v.filter((e) => !e.start || e.start >= Date.now() - 3 * 60 * 60 * 1000); }
  } catch (_) { /* refetch */ }
  const evs = await liveNow(cat, ctx());
  try { kino.storage.set(EVENTS_KEY, JSON.stringify({ at: Date.now(), v: evs }), { ttlMs: EVENTS_TTL_MS }); } catch (_) { /* full storage */ }
  return evs;
}

const ctx = () => makeCtx({ deadline: Date.now() + CALL_MS, settings: {} });
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

export async function liveCategories() {
  const cat = await loadCatalog().catch(() => ({ hosts: [] }));
  const cats = [{ id: "all", title: t("catAll") }];
  if (catalogHasEvents(cat)) cats.unshift({ id: "live-now", title: t("liveNow") });
  return cats;
}

export async function liveChannels(arg) {
  const categoryId = (arg && arg.categoryId) || "all";
  const cat = await loadCatalog();
  if (categoryId === "live-now") return { items: await liveNowCached(cat) };
  const chans = await allChannels(cat, ctx());
  const items = categoryId === "all" ? chans : chans.filter((c) => c.categoryId === categoryId);
  return { items: items.slice(0, CHANNELS_MAX) };
}

export async function liveSearch(arg) {
  const q = norm(arg && arg.query);
  if (!q) return [];
  const cat = await loadCatalog();
  return (await allChannels(cat, ctx())).filter((c) => norm(c.title).includes(q));
}

export async function home() {
  const cat = await loadCatalog();
  const chans = await allChannels(cat, ctx());
  if (!chans.length) return [];
  return [{ id: "live-channels", title: t("channelsRow"), items: chans.slice(0, HOME_ROW_MAX), ref: "all" }];
}

export async function browse(ref) {
  const cat = await loadCatalog();
  const chans = await allChannels(cat, ctx());
  const items = !ref || ref === "all" ? chans : chans.filter((c) => c.categoryId === ref);
  return { items };
}

export async function search(arg) {
  const query = typeof arg === "string" ? arg : (arg && (arg.q || arg.query)) || "";
  return { items: await liveSearch({ query }) };
}

export async function resolve(ref) {
  const cat = await loadCatalog();
  const stream = await resolveRef(cat, ref, ctx());
  if (!stream) throw kino.error("not_found", "no playable source for " + ref, { userMessage: t("noStream") });
  return stream;
}

export async function settingsStatus() {
  const cat = await loadCatalog().catch(() => ({ hosts: [] }));
  const n = activeHosts(cat).length;
  return { status: n ? t("statusOk", { n }) : t("statusNone") };
}
