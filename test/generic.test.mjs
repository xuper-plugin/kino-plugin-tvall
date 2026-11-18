import { test } from "node:test";
import assert from "node:assert/strict";
import generic from "../src/handlers/generic.js";

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
