import { test } from "node:test";
import assert from "node:assert/strict";
import generic, { pickCaptured } from "../src/handlers/generic.js";

// A ctx whose fetchText serves canned pages by URL — the recipe engine is tested against fixtures, not a live site.
function ctxWith(pages) {
  return {
    deadline: Date.now() + 18000,
    settings: {},
    fetchText: async (url) => {
      if (pages[url] === undefined) throw new Error("404 " + url);
      return pages[url];
    },
  };
}

const host = {
  base: "https://ex.com",
  recipe: {
    listURL: "/channels",
    channelItemRegex: '<a href="/ch/(?<id>\\d+)"[^>]*data-logo="(?<logo>[^"]*)"[^>]*>(?<name>[^<]+)</a>',
    playerURL: "/ch/{id}",
    streamRegex: 'source:"(?<url>[^"]+\\.m3u8[^"]*)"',
    referer: "{base}/",
  },
};

test("generic listChannels parses channels from the recipe", async () => {
  const ctx = ctxWith({ "https://ex.com/channels":
    '<a href="/ch/1" data-logo="a.png">ESPN</a><a href="/ch/2" data-logo="b.png">TNT</a>' });
  const chans = await generic.listChannels(host, ctx);
  assert.equal(chans.length, 2);
  // Kino needs an absolute image URL, so a relative logo in the recipe is resolved against the host base.
  assert.deepEqual({ id: chans[0].id, title: chans[0].title, logo: chans[0].logo }, { id: "1", title: "ESPN", logo: "https://ex.com/a.png" });
});

test("generic resolve returns the stream with the required headers", async () => {
  const ctx = ctxWith({ "https://ex.com/ch/1": 'var x=1; source:"https://cdn.ex.com/live/1.m3u8?t=9";' });
  const s = await generic.resolve(host, "1", ctx);
  assert.equal(s.url, "https://cdn.ex.com/live/1.m3u8?t=9");
  assert.equal(s.mime, "application/x-mpegURL");
  assert.equal(s.headers.Referer, "https://ex.com/");
});

test("generic returns empty/null when the regex matches nothing (site changed)", async () => {
  const ctx = ctxWith({ "https://ex.com/channels": "<html>changed</html>", "https://ex.com/ch/1": "<html>nope</html>" });
  assert.deepEqual(await generic.listChannels(host, ctx), []);
  assert.equal(await generic.resolve(host, "1", ctx), null);
});

test("generic listChannels parses a JSON catalog grouped by country when recipe.listJSON is set", async () => {
  const jsonHost = { base: "https://dl.example", recipe: {
    listURL: "/stream/canales.json", listJSON: true, playerURL: "/total/stream-{id}.php",
  } };
  const ctx = ctxWith({ "https://dl.example/stream/canales.json":
    JSON.stringify({ Sudamerica: [{ n: "ESPN", id: "01" }, { n: "ESPN 2", id: "02" }], Centro: [{ n: "TNT", id: "88" }] }) });
  const chans = await generic.listChannels(jsonHost, ctx);
  assert.deepEqual(chans.map((c) => ({ id: c.id, title: c.title })), [
    { id: "01", title: "ESPN" }, { id: "02", title: "ESPN 2" }, { id: "88", title: "TNT" },
  ]);
});

test("generic listChannels with listJSON returns empty on invalid JSON (site changed)", async () => {
  const jsonHost = { base: "https://dl.example", recipe: { listURL: "/stream/canales.json", listJSON: true } };
  const ctx = ctxWith({ "https://dl.example/stream/canales.json": "not json" });
  assert.deepEqual(await generic.listChannels(jsonHost, ctx), []);
});

test("pickCaptured prefers a media whose URL matches preferRe (e.g. the source's own CDN)", () => {
  const cap = { media: [
    { url: "https://e.biboguv.cyou/hls/1/index.m3u8", mime: "application/x-mpegURL", headers: { Referer: "https://mx.to/" } },
    { url: "https://edge.matchora.pro/hls/1/index.m3u8", mime: "application/x-mpegURL", headers: { Referer: "https://mx.to/" } },
  ] };
  const m = pickCaptured(cap, /matchora/i);
  assert.equal(m.url, "https://edge.matchora.pro/hls/1/index.m3u8");
});

test("pickCaptured falls back to the first media when preferRe matches nothing", () => {
  const cap = { media: [
    { url: "https://a.cdn/one.m3u8" }, { url: "https://b.cdn/two.m3u8" },
  ] };
  assert.equal(pickCaptured(cap, /zzz/).url, "https://a.cdn/one.m3u8");
  assert.equal(pickCaptured(cap, null).url, "https://a.cdn/one.m3u8");
});

test("pickCaptured scans raw requests for an .m3u8 when no media was returned, preferRe-aware", () => {
  const cap = { media: [], requests: [
    { url: "https://ads.x/beacon.js" },
    { url: "https://e.biboguv.cyou/hls/1/index.m3u8", headers: { Referer: "https://mx.to/" } },
    { url: "https://edge.matchora.pro/hls/1/index.m3u8", headers: { Referer: "https://mx.to/" } },
  ] };
  assert.equal(pickCaptured(cap, /matchora/i).url, "https://edge.matchora.pro/hls/1/index.m3u8");
  assert.equal(pickCaptured(cap, null).url, "https://e.biboguv.cyou/hls/1/index.m3u8");
});

test("pickCaptured returns null when there is no media and no .m3u8 request", () => {
  assert.equal(pickCaptured({ media: [], requests: [{ url: "https://x/y.js" }] }, null), null);
  assert.equal(pickCaptured(null, null), null);
});
