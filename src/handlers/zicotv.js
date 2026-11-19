import { UA } from "../net.js";

// zicotv: a per-site handler. zicotv serves channels and sports events through its own signed JSON API,
// so there is no flat .m3u8 to scrape and no token player to drive — the stream is minted on demand:
//
//   channel pid (or event -> own-stream pid)
//     GET  /api/player/{pid}            -> HTML carrying  ZT_RENEW = { url: "/api/player/{pid}/renew?expires=..&signature=.." }
//     POST {that signed url}            -> { sources: [ { url: "https://cdnN.zicotv.cc/.../index.m3u8?token=..", premium } ] }
//     play the first non-premium .m3u8 with Referer = base.
//
// The signature authorises the POST on its own (no cookie, no CSRF). The channel list is premium-gated on
// the site, so the catalog is a curated recipe.channels list (id = the player pid). Events come from the
// open /api/events JSON; only own-stream events resolve (manual sources point at walled third-party embeds).

const HLS_MIME = "application/x-mpegURL";

const abs = (b, u) => (/^https?:\/\//i.test(u) ? u : b.replace(/\/+$/, "") + "/" + String(u).replace(/^\/+/, ""));

// Decode an Inertia page's props from its data-page="..." attribute (HTML-entity-escaped JSON).
function inertiaProps(html) {
  const m = /data-page="([^"]*)"/.exec(String(html || ""));
  if (!m) return null;
  const json = m[1]
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  try { return JSON.parse(json).props || null; } catch (_) { return null; }
}

// Pull ZT_RENEW = {...}; out of a player page and return its signed url, or null.
function renewUrl(html) {
  const m = /ZT_RENEW\s*=\s*(\{[\s\S]*?\})\s*;/.exec(String(html || ""));
  if (!m) return null;
  try { const o = JSON.parse(m[1]); return o && o.url ? o.url : null; } catch (_) { return null; }
}

// GET the player page for a pid, POST its signed renew url, return the first usable m3u8 source url.
async function mintStream(base, pid, ctx) {
  let playerHtml;
  try { playerHtml = await ctx.fetchText(abs(base, "/api/player/" + pid), { Referer: base + "/" }, { deadline: ctx.deadline }); }
  catch (_) { return null; }
  const ru = renewUrl(playerHtml);
  if (!ru) return null;
  let resp;
  try {
    resp = await ctx.fetchText(abs(base, ru.replace(/\\\//g, "/")),
      { Accept: "application/json", Referer: base + "/", "X-Requested-With": "XMLHttpRequest" },
      { deadline: ctx.deadline, method: "POST", body: "" });
  } catch (_) { return null; }
  let data;
  try { data = JSON.parse(resp); } catch (_) { return null; }
  const sources = Array.isArray(data && data.sources) ? data.sources : [];
  const ok = (s) => s && s.url && /\.m3u8/i.test(s.url);
  const pick = sources.find((s) => ok(s) && !s.premium) || sources.find(ok);
  return pick ? pick.url : null;
}

export default {
  // The curated channel catalog lives in the recipe (id = the zicotv player pid).
  async listChannels(host, _ctx) {
    const chans = (host.recipe && host.recipe.channels) || [];
    return chans
      .filter((c) => c && c.id != null)
      .map((c) => ({ id: String(c.id), title: String(c.name || c.title || c.id).trim(), categoryId: "all" }));
  },

  // Open events API. Keep only own-stream events (manual-only events point at walled embeds); the id is
  // prefixed "ev:" so resolve knows to look its player pid up from the event page first.
  async listEvents(host, ctx) {
    const r = host.recipe || {};
    if (!r.eventsURL) return [];
    let body;
    try { body = await ctx.fetchText(abs(host.base, r.eventsURL), { Accept: "application/json", Referer: host.base + "/" }, { deadline: ctx.deadline }); }
    catch (_) { return []; }
    let data;
    try { data = JSON.parse(body); } catch (_) { return []; }
    const evs = [];
    const walk = (o) => {
      if (Array.isArray(o)) { o.forEach(walk); return; }
      if (o && typeof o === "object") {
        if ("has_stream" in o || "has_own_stream" in o) evs.push(o);
        else Object.values(o).forEach(walk);
      }
    };
    walk(data);
    return evs
      .filter((e) => e && e.has_own_stream && e.id != null)
      .map((e) => ({ id: "ev:" + e.id, title: String(e.title || e.id).trim(), start: Date.parse(e.start_time) || 0, categoryId: "live-now" }));
  },

  async resolve(host, id, ctx) {
    const base = host.base;
    let pid = String(id);
    // An event ref carries the event id, not a player pid: read the event page to find its own-stream pid.
    if (pid.startsWith("ev:")) {
      const eid = pid.slice(3);
      let evHtml;
      try { evHtml = await ctx.fetchText(abs(base, "/events/" + eid), { Referer: base + "/" }, { deadline: ctx.deadline }); }
      catch (_) { return null; }
      const props = inertiaProps(evHtml);
      const own = props && Array.isArray(props.ownStreams) ? props.ownStreams : [];
      const chosen = own.find((s) => s && s.player_url && !s.is_premium) || own.find((s) => s && s.player_url);
      const pm = chosen && /\/api\/player\/(\d+)/.exec(chosen.player_url);
      if (!pm) return null;
      pid = pm[1];
    }
    const url = await mintStream(base, pid, ctx);
    if (!url) return null;
    return { url, mime: HLS_MIME, headers: { "User-Agent": UA, Referer: base + "/" } };
  },

  async health(host, ctx) {
    const chans = await this.listChannels(host, ctx).catch(() => []);
    if (!chans.length) return { ok: false, channels: 0 };
    const s = await this.resolve(host, chans[0].id, ctx).catch(() => null);
    return { ok: !!s, channels: chans.length };
  },
};
