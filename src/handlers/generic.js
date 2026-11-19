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

// Choose the best captured stream: a page often serves the same .m3u8 from several CDNs, and only the
// site's own edge plays (a random partner CDN rejects the player's headers). preferRe picks that edge;
// otherwise the first media wins. Falls back to scanning raw requests for an .m3u8 when no media played.
export function pickCaptured(cap, preferRe) {
  const media = cap && Array.isArray(cap.media) ? cap.media.filter((x) => x && x.url) : [];
  let m = (preferRe && media.find((x) => preferRe.test(x.url))) || media[0] || null;
  if (!m) {
    const reqs = cap && Array.isArray(cap.requests) ? cap.requests.filter((x) => x && x.url && /\.m3u8/i.test(x.url)) : [];
    const q = (preferRe && reqs.find((x) => preferRe.test(x.url))) || reqs.find((x) => /\.m3u8(\?|$)/i.test(x.url)) || reqs[0];
    if (q) m = { url: q.url, headers: q.headers };
  }
  return m || null;
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
    const rows = matchAllNamed(body, r.channelItemRegex);
    if (r.diag && typeof kino.log === "function") {
      try {
        kino.log("[diag] list " + host.id + " bodyLen=" + body.length + " matches=" + rows.length + " first=" + (rows[0] ? (rows[0].id + "|" + rows[0].name) : "none"));
        kino.log("[diag] list " + host.id + " head=" + body.slice(0, 180).replace(/\s+/g, " "));
      } catch (_) { /* diag only */ }
    }
    return rows
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

    // resolvePage mode ("browser": "pages"): render the player page so its scripts run, then read the
    // .m3u8 straight out of the final DOM. For a site whose player is built by JS — no flat scrape, and
    // whose segments a capture session can't carry — the rendered DOM often still holds a plain .m3u8 src.
    if (r.resolvePage && kino.browser && kino.browser.page) {
      try {
        const budget = () => Math.max(1500, (ctx.deadline || Date.now() + 18000) - Date.now());
        const page = await kino.browser.page(playerUrl, { waitFor: r.pageWaitFor || undefined, timeoutMs: budget() });
        const html = (page && page.html) || "";
        // one optional hop: the real player often lives in an iframe; render that too.
        let doc = html, hopOrigin = host.base;
        if (r.pageIframeRegex) {
          const g = matchNamed(html, r.pageIframeRegex);
          if (g && g.url) {
            const hopUrl = abs(host.base, g.url.replace(/\\\//g, "/"));
            try {
              const p2 = await kino.browser.page(hopUrl, { waitFor: r.pageWaitFor || undefined, timeoutMs: budget() });
              if (p2 && p2.html) { doc = p2.html; try { hopOrigin = new URL(hopUrl).origin; } catch (_) {} }
            } catch (_) { /* keep top doc */ }
          }
        }
        if (r.diag && typeof kino.log === "function") {
          try {
            kino.log("[diag] page finalUrl=" + (page && page.finalUrl) + " status=" + (page && page.status) + " topLen=" + html.length + " docLen=" + doc.length);
            (doc.match(/data-url=["'][^"']+["']/gi) || []).slice(0, 8).forEach((x, i) => kino.log("[diag] dataurl#" + i + " " + x.slice(0, 160)));
            (doc.match(/<iframe[^>]*src=["'][^"']+["']/gi) || []).slice(0, 6).forEach((x, i) => kino.log("[diag] iframe#" + i + " " + x.slice(0, 160)));
            (doc.match(/https?:\/\/[^"'\s<>]+(\.m3u8|\.mpd|embed|youtube|\/player|stream|\.php)[^"'\s<>]*/gi) || []).slice(0, 8).forEach((x, i) => kino.log("[diag] url#" + i + " " + x.slice(0, 160)));
          } catch (_) { /* diag only */ }
        }
        const mm = doc.match(/https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/i);
        if (mm) return { url: mm[0].replace(/\\\//g, "/"), mime: HLS_MIME, headers: { "User-Agent": UA, Referer: hopOrigin + "/", Origin: host.base } };
        return null;
      } catch (_) { return null; }
    }

    // capture mode: let the hidden WebView run the player's JS and hand back the .m3u8 it requested,
    // with the Referer/UA/Cookie it used. This resolves token/anti-bot sites a flat scrape cannot.
    if (r.capture) {
      try {
        const left = Math.max(1000, (ctx.deadline || Date.now() + 18000) - Date.now());
        const opts = { match: r.match || undefined, headers: { Referer: r.captureReferer || host.base + "/" }, timeoutMs: left };
        // captureAll collects every matching request (not just the first the page plays), so a player that
        // fires the .m3u8 among many requests, or behind a challenge, still gets caught. alsoMatch widens it.
        if (r.captureAll && kino.browser.captureAll) { opts.captureAll = true; if (r.alsoMatch) opts.alsoMatch = r.alsoMatch; }
        // returnCookiesOnTimeout: make capture RESOLVE on timeout (with requests/cookies/timedOut) instead of
        // throwing, so a diag run can inspect what the player requested even when no media autoplayed.
        if (r.returnCookiesOnTimeout) opts.returnCookiesOnTimeout = true;
        const cap = await kino.browser.capture(playerUrl, opts);
        let prefer = null;
        if (r.preferHost) { try { prefer = new RegExp(r.preferHost, "i"); } catch (_) { prefer = null; } }
        const m = pickCaptured(cap, prefer);
        if (!m || !m.url) return null;
        // The CDN segments usually need the site's Referer/Origin; seed them, then let the captured
        // headers (the exact ones the player used) override. captureReferer tunes the stream Referer too.
        const streamRef = r.captureReferer || host.base + "/";
        const headers = { "User-Agent": UA, Referer: streamRef, Origin: host.base, ...(m.headers || {}) };
        return { url: m.url, mime: m.mime || HLS_MIME, headers };
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
