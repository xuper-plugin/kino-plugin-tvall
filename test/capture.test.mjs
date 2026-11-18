import { test } from "node:test";
import assert from "node:assert/strict";
import generic from "../src/handlers/generic.js";

const ctx = { deadline: Date.now() + 18000, settings: {}, fetchText: async () => "" };
const host = { base: "https://ex.com", recipe: { playerURL: "/live/{id}", capture: true, match: "m3u8" } };

test("generic resolve uses kino.browser.capture when recipe.capture is set", async () => {
  let openedUrl, openedMatch;
  globalThis.kino = { browser: { capture: async (url, opts) => {
    openedUrl = url; openedMatch = opts.match;
    return { media: [{ url: "https://cdn.ex.com/5/mono.m3u8?t=1", mime: "application/x-mpegURL", headers: { Referer: "https://player.ex/" } }], subtitles: [], finalUrl: url };
  } } };
  const s = await generic.resolve(host, "5", ctx);
  assert.equal(openedUrl, "https://ex.com/live/5");
  assert.equal(openedMatch, "m3u8");
  assert.equal(s.url, "https://cdn.ex.com/5/mono.m3u8?t=1");
  assert.equal(s.headers.Referer, "https://player.ex/", "uses the headers the captured request carried");
});

test("generic resolve returns null when capture finds no media", async () => {
  globalThis.kino = { browser: { capture: async () => ({ media: [], subtitles: [], finalUrl: "x" }) } };
  assert.equal(await generic.resolve(host, "5", ctx), null);
});
