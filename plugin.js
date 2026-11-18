// src/i18n.js
var CATALOG = {
  es: {
    noStream: "Este canal no est\xE1 disponible ahora. Prueba con otro.",
    statusOk: "{n} fuentes activas.",
    statusNone: "Sin fuentes activas por ahora.",
    liveNow: "En vivo ahora"
  },
  en: {
    noStream: "This channel isn't available right now. Try another one.",
    statusOk: "{n} active sources.",
    statusNone: "No active sources right now.",
    liveNow: "Live now"
  }
};
function lang() {
  try {
    const l = typeof kino !== "undefined" && kino.lang || "es";
    return String(l).toLowerCase().startsWith("en") ? "en" : "es";
  } catch (_) {
    return "es";
  }
}
function t(key, vars) {
  const table = CATALOG[lang()] || CATALOG.es;
  let s = table[key] ?? CATALOG.es[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

// src/plugin.js
async function liveCategories() {
  await null;
  return [];
}
async function liveChannels(_arg) {
  await null;
  return { items: [] };
}
async function liveSearch(_arg) {
  await null;
  return [];
}
async function home() {
  await null;
  return [];
}
async function browse(_ref) {
  await null;
  return { items: [] };
}
async function search(_arg) {
  await null;
  return { items: [] };
}
async function resolve(ref) {
  await null;
  throw kino.error("not_found", "unknown ref: " + ref, { userMessage: t("noStream") });
}
async function settingsStatus() {
  await null;
  return { status: t("statusNone") };
}
export {
  browse,
  home,
  liveCategories,
  liveChannels,
  liveSearch,
  resolve,
  search,
  settingsStatus
};
