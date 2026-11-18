import { t } from "./i18n.js";

// Kino live-TV surface. The real listing/resolve logic arrives in later tasks; these are the exports
// Kino calls, kept as safe no-ops so the manifest's capabilities are all backed by an export.

export async function liveCategories() {
  await null;
  return [];
}

export async function liveChannels(_arg) {
  await null;
  return { items: [] };
}

export async function liveSearch(_arg) {
  await null;
  return [];
}

export async function home() {
  await null;
  return [];
}

export async function browse(_ref) {
  await null;
  return { items: [] };
}

export async function search(_arg) {
  await null;
  return { items: [] };
}

export async function resolve(ref) {
  await null;
  throw kino.error("not_found", "unknown ref: " + ref, { userMessage: t("noStream") });
}

export async function settingsStatus() {
  await null;
  return { status: t("statusNone") };
}
