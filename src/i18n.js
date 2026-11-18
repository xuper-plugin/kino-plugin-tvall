// User-visible text, ES + EN (owner rule: everything the person sees is localized, never a bare literal).
const CATALOG = {
  es: {
    noStream: "Este canal no está disponible ahora. Prueba con otro.",
    statusOk: "{n} fuentes activas.",
    statusNone: "Sin fuentes activas por ahora.",
    liveNow: "En vivo ahora",
    catAll: "Todos",
    channelsRow: "Canales en vivo",
  },
  en: {
    noStream: "This channel isn't available right now. Try another one.",
    statusOk: "{n} active sources.",
    statusNone: "No active sources right now.",
    liveNow: "Live now",
    catAll: "All",
    channelsRow: "Live channels",
  },
};

function lang() {
  try {
    const l = (typeof kino !== "undefined" && kino.lang) || "es";
    return String(l).toLowerCase().startsWith("en") ? "en" : "es";
  } catch (_) {
    return "es";
  }
}

/** Localized string for `key`, with `{n}`-style substitutions from `vars`. */
export function t(key, vars) {
  const table = CATALOG[lang()] || CATALOG.es;
  let s = table[key] ?? CATALOG.es[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
