import { t } from "./i18n.js";
import { loadCatalog, activeHosts } from "./catalog.js";
import { makeCtx } from "./net.js";
import { allChannels, resolveRef } from "./aggregate.js";

const CALL_MS = 18000;
const HOME_ROW_MAX = 40;

const ctx = () => makeCtx({ deadline: Date.now() + CALL_MS, settings: {} });
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

export async function liveCategories() {
  await null;
  return [{ id: "all", title: t("catAll") }];
}

export async function liveChannels(arg) {
  const categoryId = (arg && arg.categoryId) || "all";
  const cat = await loadCatalog();
  const chans = await allChannels(cat, ctx());
  const items = categoryId === "all" ? chans : chans.filter((c) => c.categoryId === categoryId);
  return { items };
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
