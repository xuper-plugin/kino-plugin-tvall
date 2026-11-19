import { UA } from "../net.js";

// generic: a declarative handler. The host's `recipe` says how to list and how to resolve, so a new
// site is added by editing tvall.json, not the plugin. Every step is defensive: a regex that no longer
// matches yields an empty list or a null stream, never a throw.
//
// recipe = {
//   listURL, channelItemRegex (named groups id, name, logo?),          // listing
//   eventsURL?, eventItemRegex? (named groups id, name/title, start?),  // events
//   playerURL ("{id}" substituted), playerRegex? (named group url: an iframe to follow first),
//   streamRegex (named group url: the .m3u8), referer? ("{base}" token)  // resolving
// }

const HLS_MIME = "application/x-mpegURL";

const abs = (base, u) => (/^https?:\/\//i.test(u) ? u : base.replace(/\/+$/, "") + "/" + String(u).replace(/^\/+/, ""));
const fill = (tmpl, vars) => String(tmpl || "").replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : ""));

function matchAllNamed(html, pattern) {
  const out = [];
  if (!pattern) return out;
  let re;
  try { re = new RegExp(pattern, "g"); } catch (_) { return out; }
  for (const m of String(html || "").matchAll(re)) out.push(m.groups || {});
  return out;
}

function matchNamed(html, pattern) {
  if (!pattern) return null;
  let re;
  try { re = new RegExp(pattern); } catch (_) { return null; }
  const m = re.exec(String(html || ""));
  return m ? m.groups || {} : null;
}

export default {
  async listChannels(host, ctx) {
    const r = host.recipe || {};
    if (!r.listURL) return [];
    let body;
    try { body = await ctx.fetchText(abs(host.base, r.listURL), { Referer: host.base + "/" }, { deadline: ctx.deadline }); }
    catch (_) { return []; }

    // listJSON: the host serves its channel catalog as JSON (object of arrays, or a flat array) instead
    // of HTML — no regex needed, just a {id, name|n} shape per entry.
    if (r.listJSON) {
      let data;
      try { data = JSON.parse(body); } catch (_) { return []; }
      const groups = Array.isArray(data) ? [data] : Object.values(data || {});
      const items = groups.flatMap((g) => (Array.isArray(g) ? g : []));
      return items
        .filter((it) => it && it.id != null)
        .map((it) => ({ id: String(it.id), title: String(it.name || it.n || it.title || it.id).trim(), categoryId: "all" }));
    }

    if (!r.channelItemRegex) return [];
    return matchAllNamed(body, r.channelItemRegex)
      .filter((g) => g.id)
      .map((g) => ({ id: String(g.id), title: (g.name || g.title || g.id).trim(), logo: g.logo ? abs(host.base, g.logo) : undefined, categoryId: "all" }));
  },

  async listEvents(host, ctx) {
    const r = host.recipe || {};
    if (!r.eventsURL || !r.eventItemRegex) return [];
    let html;
    try { html = await ctx.fetchText(abs(host.base, r.eventsURL), { Referer: host.base + "/" }, { deadline: ctx.deadline }); }
    catch (_) { return []; }
    return matchAllNamed(html, r.eventItemRegex)
      .filter((g) => g.id)
      .map((g) => ({ id: String(g.id), title: (g.name || g.title || g.id).trim(), start: Number(g.start) || 0, categoryId: "live-now" }));
  },

  async resolve(host, id, ctx) {
    const r = host.recipe || {};
    if (!r.playerURL) return null;
    const playerUrl = abs(host.base, fill(r.playerURL, { id, base: host.base }));

    // capture mode: let the hidden WebView run the player's JS and hand back the .m3u8 it requested,
    // with the Referer/UA/Cookie it used. This resolves token/anti-bot sites a flat scrape cannot.
    if (r.capture) {
      try {
        const left = Math.max(1000, (ctx.deadline || Date.now() + 18000) - Date.now());
        const opts = { match: r.match || undefined, headers: { Referer: r.captureReferer || host.base + "/" }, timeoutMs: left };
        // captureAll collects every matching request (not just the first the page plays), so a player that
        // fires the .m3u8 among many requests, or behind a challenge, still gets caught. alsoMatch widens it.
        if (r.captureAll && kino.browser.captureAll) { opts.captureAll = true; if (r.alsoMatch) opts.alsoMatch = r.alsoMatch; }
        const cap = await kino.browser.capture(playerUrl, opts);
        let m = cap && cap.media && cap.media[0];
        if (!m && cap && Array.isArray(cap.requests)) {
          const q = cap.requests.find((x) => /\.m3u8(\?|$)/i.test(x.url)) || cap.requests.find((x) => /\.m3u8/i.test(x.url));
          if (q) m = { url: q.url, headers: q.headers };
        }
        if (!m || !m.url) return null;
        return { url: m.url, mime: m.mime || HLS_MIME, headers: m.headers || { "User-Agent": UA, Referer: host.base + "/" } };
      } catch (_) { return null; }
    }

    if (!r.streamRegex) return null;
    let html;
    try { html = await ctx.fetchText(playerUrl, { Referer: host.base + "/" }, { deadline: ctx.deadline }); }
    catch (_) { return null; }
    let streamHtml = html;
    let iframeUrl = null;
    if (r.playerRegex) {
      const g = matchNamed(html, r.playerRegex);
      if (!g || !g.url) return null;
      iframeUrl = abs(host.base, g.url.replace(/\\\//g, "/"));
      try { streamHtml = await ctx.fetchText(iframeUrl, { Referer: playerUrl }, { deadline: ctx.deadline }); }
      catch (_) { return null; }
    }
    const sg = matchNamed(streamHtml, r.streamRegex);
    if (!sg || !sg.url) return null;
    const url = sg.url.replace(/\\\//g, "/");
    if (!/^https?:\/\//i.test(url)) return null;
    const referer = r.referer ? fill(r.referer, { base: host.base }) : (iframeUrl ? new URL(iframeUrl).origin + "/" : host.base + "/");
    return { url, mime: HLS_MIME, headers: { "User-Agent": UA, Referer: referer } };
  },

  async health(host, ctx) {
    const chans = await this.listChannels(host, ctx).catch(() => []);
    if (!chans.length) return { ok: false, channels: 0 };
    const s = await this.resolve(host, chans[0].id, ctx).catch(() => null);
    return { ok: !!s, channels: chans.length };
  },
};
