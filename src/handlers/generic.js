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
    if (!r.listURL || !r.channelItemRegex) return [];
    let html;
    try { html = await ctx.fetchText(abs(host.base, r.listURL), { Referer: host.base + "/" }, { deadline: ctx.deadline }); }
    catch (_) { return []; }
    return matchAllNamed(html, r.channelItemRegex)
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
    if (!r.playerURL || !r.streamRegex) return null;
    const playerUrl = abs(host.base, fill(r.playerURL, { id, base: host.base }));
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
