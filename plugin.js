// src/i18n.js
var CATALOG = {
  es: {
    noStream: "Este canal no est\xE1 disponible ahora. Prueba con otro.",
    statusOk: "{n} fuentes activas.",
    statusNone: "Sin fuentes activas por ahora.",
    liveNow: "En vivo ahora",
    catAll: "Todos",
    channelsRow: "Canales en vivo"
  },
  en: {
    noStream: "This channel isn't available right now. Try another one.",
    statusOk: "{n} active sources.",
    statusNone: "No active sources right now.",
    liveNow: "Live now",
    catAll: "All",
    channelsRow: "Live channels"
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

// src/catalog-seed.js
var SEED = {
  "schema": 1,
  "updatedAt": 0,
  "hosts": [
    {
      "id": "thedaddy",
      "name": "TheDaddy",
      "type": "generic",
      "base": "https://thedaddy.li",
      "enabled": true,
      "status": "unknown",
      "lastCheck": 0,
      "weight": 10,
      "provides": [
        "channels"
      ],
      "recipe": {
        "listURL": "/24-7-channels.php",
        "channelItemRegex": 'href="/watch\\.php\\?id=(?<id>\\d+)"[\\s\\S]*?class="card__title">(?<name>[^<]+)<',
        "playerURL": "/watch.php?id={id}",
        "capture": true,
        "match": "\\.m3u8",
        "captureAll": true,
        "alsoMatch": [
          "index\\.m3u8",
          "mono\\.m3u8",
          "/premium"
        ]
      }
    },
    {
      "id": "daddylive",
      "name": "DaddyLive",
      "type": "daddylive",
      "base": "https://daddylive.app",
      "enabled": false,
      "status": "unknown",
      "lastCheck": 0,
      "weight": 10,
      "provides": [
        "channels",
        "events"
      ],
      "recipe": {}
    },
    {
      "id": "verpartidos",
      "name": "VerPartidos",
      "type": "generic",
      "base": "https://verpartidos.cc",
      "enabled": false,
      "status": "unknown",
      "lastCheck": 0,
      "weight": 5,
      "provides": [
        "events"
      ],
      "recipe": {}
    },
    {
      "id": "tiroalpalo",
      "name": "Tiro al Palo",
      "type": "generic",
      "base": "https://tiroalpalooffi.com",
      "enabled": false,
      "status": "unknown",
      "lastCheck": 0,
      "weight": 5,
      "provides": [
        "events"
      ],
      "recipe": {}
    },
    {
      "id": "deportelibre",
      "name": "DeporteLibre",
      "type": "generic",
      "base": "https://deportelibre.top",
      "enabled": false,
      "status": "unknown",
      "lastCheck": 0,
      "weight": 5,
      "provides": [
        "events"
      ],
      "recipe": {}
    },
    {
      "id": "ntv",
      "name": "NTV",
      "type": "generic",
      "base": "https://ntv.cx",
      "enabled": false,
      "status": "unknown",
      "lastCheck": 0,
      "weight": 5,
      "provides": [
        "channels"
      ],
      "recipe": {}
    },
    {
      "id": "livetv",
      "name": "LiveTV",
      "type": "livetv",
      "base": "https://livetv.sx",
      "enabled": false,
      "status": "unknown",
      "lastCheck": 0,
      "weight": 6,
      "provides": [
        "events"
      ],
      "recipe": {}
    },
    {
      "id": "zicotv",
      "name": "ZicoTV",
      "type": "generic",
      "base": "https://bp.zicotv.cc",
      "enabled": false,
      "status": "unknown",
      "lastCheck": 0,
      "weight": 5,
      "provides": [
        "channels",
        "events"
      ],
      "recipe": {}
    },
    {
      "id": "matchora",
      "name": "Matchora",
      "type": "generic",
      "base": "https://matchora.to",
      "enabled": false,
      "status": "unknown",
      "lastCheck": 0,
      "weight": 5,
      "provides": [
        "channels",
        "events"
      ],
      "recipe": {}
    },
    {
      "id": "teledeportes",
      "name": "TeleDeportes",
      "type": "generic",
      "base": "https://teledeportes.st",
      "enabled": false,
      "status": "unknown",
      "lastCheck": 0,
      "weight": 5,
      "provides": [
        "events"
      ],
      "recipe": {}
    },
    {
      "id": "dondeverfutbol",
      "name": "DondeVerFutbolHoy",
      "type": "generic",
      "base": "https://dondeverfutbolhoy.com",
      "enabled": false,
      "status": "unknown",
      "lastCheck": 0,
      "weight": 4,
      "provides": [
        "events"
      ],
      "recipe": {}
    },
    {
      "id": "damitv",
      "name": "DamiTV",
      "type": "generic",
      "base": "https://damitv.st",
      "enabled": false,
      "status": "unknown",
      "lastCheck": 0,
      "weight": 5,
      "provides": [
        "channels",
        "events"
      ],
      "recipe": {}
    },
    {
      "id": "tvnow247",
      "name": "TVNow247",
      "type": "generic",
      "base": "https://tvnow247.top",
      "enabled": false,
      "status": "unknown",
      "lastCheck": 0,
      "weight": 5,
      "provides": [
        "channels"
      ],
      "recipe": {}
    },
    {
      "id": "tarjetaroja",
      "name": "Tarjeta Roja",
      "type": "generic",
      "base": "https://tarjetarojatvdirecta.online",
      "enabled": false,
      "status": "unknown",
      "lastCheck": 0,
      "weight": 4,
      "provides": [
        "events"
      ],
      "recipe": {}
    },
    {
      "id": "envivo-evault",
      "name": "EnVivo eVault",
      "type": "generic",
      "base": "https://envivo.evaulthub.com",
      "enabled": false,
      "status": "unknown",
      "lastCheck": 0,
      "weight": 4,
      "provides": [
        "channels",
        "events"
      ],
      "recipe": {}
    }
  ]
};

// src/catalog.js
var RAW = "https://raw.githubusercontent.com/xuper-plugin/kino-plugin-tvall/main/tvall.json";
var JSDELIVR = "https://cdn.jsdelivr.net/gh/xuper-plugin/kino-plugin-tvall@main/tvall.json";
var CACHE_KEY = "catalog.v1";
var CACHE_TTL_MS = 6 * 60 * 60 * 1e3;
async function fetchCatalog(url) {
  const r = await kino.fetch(url, { headers: {}, timeoutMs: 8e3 });
  if (!r.ok) throw new Error("http " + r.status);
  const obj = JSON.parse(await r.text());
  if (!obj || !Array.isArray(obj.hosts)) throw new Error("bad shape");
  return obj;
}
async function loadCatalog() {
  try {
    const c = kino.storage.get(CACHE_KEY);
    if (c) return JSON.parse(c);
  } catch (_) {
  }
  for (const url of [RAW, JSDELIVR]) {
    try {
      const obj = await fetchCatalog(url);
      try {
        kino.storage.set(CACHE_KEY, JSON.stringify(obj), { ttlMs: CACHE_TTL_MS });
      } catch (_) {
      }
      return obj;
    } catch (_) {
    }
  }
  return SEED;
}
function activeHosts(cat) {
  return (cat?.hosts || []).filter((h) => h && h.enabled && h.status !== "down").sort((a, b) => (b.weight || 0) - (a.weight || 0));
}

// src/net.js
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:101.0) Gecko/20100101 Firefox/101.0";
async function fetchText(url, headers, { tries = 2, deadline } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    const left = deadline ? deadline - Date.now() : 8e3;
    if (left <= 0) break;
    try {
      const r = await kino.fetch(url, { headers: { "User-Agent": UA, ...headers || {} }, timeoutMs: Math.min(8e3, left) });
      if (!r.ok) throw new Error("http " + r.status);
      return await r.text();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("fetch failed");
}
function makeCtx({ deadline, settings } = {}) {
  return { deadline: deadline || Date.now() + 18e3, fetchText, settings: settings || {} };
}

// src/handlers/generic.js
var HLS_MIME = "application/x-mpegURL";
var abs = (base, u) => /^https?:\/\//i.test(u) ? u : base.replace(/\/+$/, "") + "/" + String(u).replace(/^\/+/, "");
var fill = (tmpl, vars) => String(tmpl || "").replace(/\{(\w+)\}/g, (_, k) => k in vars ? vars[k] : "");
function matchAllNamed(html, pattern) {
  const out = [];
  if (!pattern) return out;
  let re;
  try {
    re = new RegExp(pattern, "g");
  } catch (_) {
    return out;
  }
  for (const m of String(html || "").matchAll(re)) out.push(m.groups || {});
  return out;
}
function matchNamed(html, pattern) {
  if (!pattern) return null;
  let re;
  try {
    re = new RegExp(pattern);
  } catch (_) {
    return null;
  }
  const m = re.exec(String(html || ""));
  return m ? m.groups || {} : null;
}
var generic_default = {
  async listChannels(host, ctx2) {
    const r = host.recipe || {};
    if (!r.listURL || !r.channelItemRegex) return [];
    let html;
    try {
      html = await ctx2.fetchText(abs(host.base, r.listURL), { Referer: host.base + "/" }, { deadline: ctx2.deadline });
    } catch (_) {
      return [];
    }
    return matchAllNamed(html, r.channelItemRegex).filter((g) => g.id).map((g) => ({ id: String(g.id), title: (g.name || g.title || g.id).trim(), logo: g.logo ? abs(host.base, g.logo) : void 0, categoryId: "all" }));
  },
  async listEvents(host, ctx2) {
    const r = host.recipe || {};
    if (!r.eventsURL || !r.eventItemRegex) return [];
    let html;
    try {
      html = await ctx2.fetchText(abs(host.base, r.eventsURL), { Referer: host.base + "/" }, { deadline: ctx2.deadline });
    } catch (_) {
      return [];
    }
    return matchAllNamed(html, r.eventItemRegex).filter((g) => g.id).map((g) => ({ id: String(g.id), title: (g.name || g.title || g.id).trim(), start: Number(g.start) || 0, categoryId: "live-now" }));
  },
  async resolve(host, id, ctx2) {
    const r = host.recipe || {};
    if (!r.playerURL) return null;
    const playerUrl = abs(host.base, fill(r.playerURL, { id, base: host.base }));
    if (r.capture) {
      try {
        const left = Math.max(1e3, (ctx2.deadline || Date.now() + 18e3) - Date.now());
        const opts = { match: r.match || void 0, headers: { Referer: r.captureReferer || host.base + "/" }, timeoutMs: left };
        if (r.captureAll && kino.browser.captureAll) {
          opts.captureAll = true;
          if (r.alsoMatch) opts.alsoMatch = r.alsoMatch;
        }
        const cap = await kino.browser.capture(playerUrl, opts);
        let m = cap && cap.media && cap.media[0];
        if (!m && cap && Array.isArray(cap.requests)) {
          const q = cap.requests.find((x) => /\.m3u8(\?|$)/i.test(x.url)) || cap.requests.find((x) => /\.m3u8/i.test(x.url));
          if (q) m = { url: q.url, headers: q.headers };
        }
        if (!m || !m.url) return null;
        return { url: m.url, mime: m.mime || HLS_MIME, headers: m.headers || { "User-Agent": UA, Referer: host.base + "/" } };
      } catch (_) {
        return null;
      }
    }
    if (!r.streamRegex) return null;
    let html;
    try {
      html = await ctx2.fetchText(playerUrl, { Referer: host.base + "/" }, { deadline: ctx2.deadline });
    } catch (_) {
      return null;
    }
    let streamHtml = html;
    let iframeUrl = null;
    if (r.playerRegex) {
      const g = matchNamed(html, r.playerRegex);
      if (!g || !g.url) return null;
      iframeUrl = abs(host.base, g.url.replace(/\\\//g, "/"));
      try {
        streamHtml = await ctx2.fetchText(iframeUrl, { Referer: playerUrl }, { deadline: ctx2.deadline });
      } catch (_) {
        return null;
      }
    }
    const sg = matchNamed(streamHtml, r.streamRegex);
    if (!sg || !sg.url) return null;
    const url = sg.url.replace(/\\\//g, "/");
    if (!/^https?:\/\//i.test(url)) return null;
    const referer = r.referer ? fill(r.referer, { base: host.base }) : iframeUrl ? new URL(iframeUrl).origin + "/" : host.base + "/";
    return { url, mime: HLS_MIME, headers: { "User-Agent": UA, Referer: referer } };
  },
  async health(host, ctx2) {
    const chans = await this.listChannels(host, ctx2).catch(() => []);
    if (!chans.length) return { ok: false, channels: 0 };
    const s = await this.resolve(host, chans[0].id, ctx2).catch(() => null);
    return { ok: !!s, channels: chans.length };
  }
};

// src/handlers/daddylive.js
var daddylive_default = {
  async listChannels(_host, _ctx) {
    return [];
  },
  async listEvents(_host, _ctx) {
    return [];
  },
  async resolve(_host, _id, _ctx) {
    return null;
  },
  async health(_host, _ctx) {
    return { ok: false };
  }
};

// src/handlers/index.js
var HANDLERS = { generic: generic_default, daddylive: daddylive_default };
function handlerFor(host) {
  return host && HANDLERS[host.type] || null;
}

// src/aggregate.js
var norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
function encodeRef(cands) {
  const s = cands.map((c) => c.hostId + ":" + c.id).join("|");
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function decodeRef(ref) {
  try {
    let b = String(ref || "").replace(/-/g, "+").replace(/_/g, "/");
    while (b.length % 4) b += "=";
    return atob(b).split("|").filter(Boolean).map((p) => {
      const i = p.indexOf(":");
      return { hostId: p.slice(0, i), id: p.slice(i + 1) };
    });
  } catch (_) {
    return [];
  }
}
async function listFrom(kind, cat, ctx2, hf) {
  const hosts = activeHosts(cat).filter((h) => (h.provides || []).includes(kind === "events" ? "events" : "channels"));
  const lists = await Promise.all(hosts.map(async (h) => {
    const handler = hf(h);
    if (!handler) return [];
    try {
      const items = kind === "events" ? await handler.listEvents(h, ctx2) : await handler.listChannels(h, ctx2);
      return (items || []).map((c) => ({ ...c, _hostId: h.id, _weight: h.weight || 0 }));
    } catch (_) {
      return [];
    }
  }));
  const byKey = /* @__PURE__ */ new Map();
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
    const out = { id: ref, ref, title: e.title, logo: e.logo, categoryId: e.categoryId || "all" };
    if (e.start) out.start = e.start;
    return out;
  });
}
function allChannels(cat, ctx2, hf = handlerFor) {
  return listFrom("channels", cat, ctx2, hf);
}
function allEvents(cat, ctx2, hf = handlerFor) {
  return listFrom("events", cat, ctx2, hf);
}
var LIVE_AHEAD_MS = 15 * 60 * 1e3;
var LIVE_BEHIND_MS = 3 * 60 * 60 * 1e3;
var isLiveNow = (ev, now) => !ev.start || ev.start <= now + LIVE_AHEAD_MS && ev.start >= now - LIVE_BEHIND_MS;
async function liveNow(cat, ctx2, hf = handlerFor, now = Date.now()) {
  return (await allEvents(cat, ctx2, hf)).filter((e) => isLiveNow(e, now));
}
function catalogHasEvents(cat) {
  return activeHosts(cat).some((h) => (h.provides || []).includes("events"));
}
async function resolveRef(cat, ref, ctx2, hf = handlerFor) {
  for (const { hostId, id } of decodeRef(ref)) {
    const host = (cat.hosts || []).find((h) => h.id === hostId);
    if (!host) continue;
    const handler = hf(host);
    if (!handler) continue;
    try {
      const s = await handler.resolve(host, id, ctx2);
      if (s && s.url) return s;
    } catch (_) {
    }
  }
  return null;
}

// src/plugin.js
var CALL_MS = 18e3;
var HOME_ROW_MAX = 40;
var CHANNELS_MAX = 500;
var EVENTS_TTL_MS = 8 * 60 * 1e3;
var EVENTS_KEY = "events.v1";
async function liveNowCached(cat) {
  try {
    const c = kino.storage.get(EVENTS_KEY);
    if (c) {
      const { at, v } = JSON.parse(c);
      if (Date.now() - at < EVENTS_TTL_MS) return v.filter((e) => !e.start || e.start >= Date.now() - 3 * 60 * 60 * 1e3);
    }
  } catch (_) {
  }
  const evs = await liveNow(cat, ctx());
  try {
    kino.storage.set(EVENTS_KEY, JSON.stringify({ at: Date.now(), v: evs }), { ttlMs: EVENTS_TTL_MS });
  } catch (_) {
  }
  return evs;
}
var ctx = () => makeCtx({ deadline: Date.now() + CALL_MS, settings: {} });
var norm2 = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
async function liveCategories() {
  const cat = await loadCatalog().catch(() => ({ hosts: [] }));
  const cats = [{ id: "all", title: t("catAll") }];
  if (catalogHasEvents(cat)) cats.unshift({ id: "live-now", title: t("liveNow") });
  return cats;
}
async function liveChannels(arg) {
  const categoryId = arg && arg.categoryId || "all";
  const cat = await loadCatalog();
  if (categoryId === "live-now") return { items: await liveNowCached(cat) };
  const chans = await allChannels(cat, ctx());
  const items = categoryId === "all" ? chans : chans.filter((c) => c.categoryId === categoryId);
  return { items: items.slice(0, CHANNELS_MAX) };
}
async function liveSearch(arg) {
  const q = norm2(arg && arg.query);
  if (!q) return [];
  const cat = await loadCatalog();
  return (await allChannels(cat, ctx())).filter((c) => norm2(c.title).includes(q));
}
async function home() {
  const cat = await loadCatalog();
  const chans = await allChannels(cat, ctx());
  if (!chans.length) return [];
  return [{ id: "live-channels", title: t("channelsRow"), items: chans.slice(0, HOME_ROW_MAX), ref: "all" }];
}
async function browse(ref) {
  const cat = await loadCatalog();
  const chans = await allChannels(cat, ctx());
  const items = !ref || ref === "all" ? chans : chans.filter((c) => c.categoryId === ref);
  return { items };
}
async function search(arg) {
  const query = typeof arg === "string" ? arg : arg && (arg.q || arg.query) || "";
  return { items: await liveSearch({ query }) };
}
async function resolve(ref) {
  const cat = await loadCatalog();
  const stream = await resolveRef(cat, ref, ctx());
  if (!stream) throw kino.error("not_found", "no playable source for " + ref, { userMessage: t("noStream") });
  return stream;
}
async function settingsStatus() {
  const cat = await loadCatalog().catch(() => ({ hosts: [] }));
  const n = activeHosts(cat).length;
  return { status: n ? t("statusOk", { n }) : t("statusNone") };
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
