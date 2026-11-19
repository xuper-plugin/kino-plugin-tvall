import { test } from "node:test";
import assert from "node:assert/strict";
import zicotv from "../src/handlers/zicotv.js";

// A ctx whose fetchText serves canned responses keyed by URL (method/body ignored — the fixture is the
// response the live site would give). Mirrors test/generic.test.mjs's ctxWith.
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

const base = "https://z.example";
// An Inertia page encodes its JSON props in a data-page="..." attribute, HTML-entity-escaped.
const inertiaPage = (props) =>
  `<!doctype html><div id="app" data-page="${JSON.stringify({ component: "events/show", props }).replace(/"/g, "&quot;")}"></div>`;

const chanHost = {
  base,
  type: "zicotv",
  recipe: {
    eventsURL: "/api/events",
    channels: [{ id: 9, name: "Movistar #Vamos" }, { id: 19, name: "Movistar Deportes" }],
  },
};

test("zicotv listChannels returns the static curated channel list from the recipe", async () => {
  const chans = await zicotv.listChannels(chanHost, ctxWith({}));
  assert.deepEqual(chans.map((c) => ({ id: c.id, title: c.title, categoryId: c.categoryId })), [
    { id: "9", title: "Movistar #Vamos", categoryId: "all" },
    { id: "19", title: "Movistar Deportes", categoryId: "all" },
  ]);
});

test("zicotv listChannels is empty when the recipe has no channels", async () => {
  assert.deepEqual(await zicotv.listChannels({ base, recipe: {} }, ctxWith({})), []);
});

test("zicotv listEvents flattens the events JSON, keeps only own-stream events, prefixes id with ev:", async () => {
  const events = {
    success: true,
    events_by_sport: {
      Basketball: {
        leagues: {
          Euroleague: [
            { id: 61832, title: "Málaga vs Pardubice", start_time: "2026-11-18T20:30:00+01:00", has_own_stream: true, has_stream: true },
            { id: 99999, title: "Manual only", start_time: "2026-11-18T21:00:00+01:00", has_own_stream: false, has_manual_stream: true, has_stream: true },
          ],
        },
      },
    },
  };
  const ctx = ctxWith({ "https://z.example/api/events": JSON.stringify(events) });
  const evs = await zicotv.listEvents(chanHost, ctx);
  assert.equal(evs.length, 1);
  assert.equal(evs[0].id, "ev:61832");
  assert.equal(evs[0].title, "Málaga vs Pardubice");
  assert.equal(evs[0].categoryId, "live-now");
  assert.equal(evs[0].start, Date.parse("2026-11-18T20:30:00+01:00"));
});

test("zicotv resolve (channel): player page -> ZT_RENEW -> POST renew -> first non-premium m3u8", async () => {
  const player =
    `<html><script>var ZT_RENEW = {"url":"/api/player/9/renew?expires=1&signature=ab","ttl":1200,"view":true};</script></html>`;
  const renew = JSON.stringify({
    sources: [
      { label: "Premium", url: "https://cdn1.z.example/vamos/index.m3u8?token=p", premium: true },
      { label: "CDN 7", url: "https://cdn7.z.example/vamos/index.m3u8?token=x", premium: false },
    ],
  });
  const ctx = ctxWith({
    "https://z.example/api/player/9": player,
    "https://z.example/api/player/9/renew?expires=1&signature=ab": renew,
  });
  const s = await zicotv.resolve(chanHost, "9", ctx);
  assert.equal(s.url, "https://cdn7.z.example/vamos/index.m3u8?token=x");
  assert.equal(s.mime, "application/x-mpegURL");
  assert.equal(s.headers.Referer, "https://z.example/");
});

test("zicotv resolve (event): events/{id} Inertia props -> ownStreams player pid -> renew -> m3u8", async () => {
  const eventPage = inertiaPage({
    ownStreams: [{ id: 41973, name: "Teledeporte", player_url: "/api/player/41973", is_premium: false }],
  });
  const player =
    `<script>var ZT_RENEW = {"url":"/api/player/41973/renew?expires=2&signature=cd"};</script>`;
  const renew = JSON.stringify({ sources: [{ label: "CDN 3", url: "https://cdn3.z.example/td/index.m3u8?token=y", premium: false }] });
  const ctx = ctxWith({
    "https://z.example/events/61832": eventPage,
    "https://z.example/api/player/41973": player,
    "https://z.example/api/player/41973/renew?expires=2&signature=cd": renew,
  });
  const s = await zicotv.resolve(chanHost, "ev:61832", ctx);
  assert.equal(s.url, "https://cdn3.z.example/td/index.m3u8?token=y");
});

test("zicotv resolve returns null when the renew response has no usable source", async () => {
  const player = `<script>var ZT_RENEW = {"url":"/api/player/9/renew?expires=1&signature=ab"};</script>`;
  const ctx = ctxWith({
    "https://z.example/api/player/9": player,
    "https://z.example/api/player/9/renew?expires=1&signature=ab": JSON.stringify({ sources: [] }),
  });
  assert.equal(await zicotv.resolve(chanHost, "9", ctx), null);
});

test("zicotv resolve returns null when the player page has no ZT_RENEW (site changed)", async () => {
  const ctx = ctxWith({ "https://z.example/api/player/9": "<html>nope</html>" });
  assert.equal(await zicotv.resolve(chanHost, "9", ctx), null);
});
