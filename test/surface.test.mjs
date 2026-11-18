import { test } from "node:test";
import assert from "node:assert/strict";
import { allChannels, resolveRef } from "../src/aggregate.js";

const ctx = { deadline: Date.now() + 18000, settings: {}, fetchText: async () => "" };

const cat = { hosts: [
  { id: "a", type: "x", enabled: true, status: "up", weight: 10, provides: ["channels"], base: "https://a" },
  { id: "b", type: "y", enabled: true, status: "up", weight: 5, provides: ["channels"], base: "https://b" },
  { id: "c", type: "z", enabled: true, status: "up", weight: 1, provides: ["channels"], base: "https://c" },
  { id: "d", type: "x", enabled: true, status: "down", weight: 20, provides: ["channels"], base: "https://d" },
] };

const handlers = {
  x: { async listChannels() { return [{ id: "1", title: "ESPN" }, { id: "2", title: "TNT" }]; }, async resolve() { return null; } },
  y: { async listChannels() { return [{ id: "9", title: "ESPN" }]; }, async resolve() { return { url: "https://s/b.m3u8", mime: "m", headers: {} }; } },
  z: { async listChannels() { throw new Error("down"); }, async resolve() { return null; } },
};
const hf = (host) => handlers[host.type] || null;

test("allChannels merges up hosts, de-dupes by title, and isolates a throwing host", async () => {
  const chans = await allChannels(cat, ctx, hf);
  assert.deepEqual([...new Set(chans.map((c) => c.title))].sort(), ["ESPN", "TNT"]);
  assert.equal(chans.filter((c) => c.title === "ESPN").length, 1, "ESPN de-duped to one");
});

test("every channel carries a ref Kino can resolve (not just an id)", async () => {
  const chans = await allChannels(cat, ctx, hf);
  for (const c of chans) assert.ok(c.ref, `channel ${c.title} has a ref`);
  const espn = chans.find((c) => c.title === "ESPN");
  const stream = await resolveRef(cat, espn.ref, ctx, hf);
  assert.equal(stream.url, "https://s/b.m3u8");
});

test("a status:down host contributes nothing", async () => {
  const chans = await allChannels(cat, ctx, hf);
  // host d (down) would add ESPN/TNT again; de-dupe + the down filter keep exactly 2 titles.
  assert.equal(chans.length, 2);
});

test("resolveRef tries hosts by weight and falls through on failure", async () => {
  const chans = await allChannels(cat, ctx, hf);
  const espn = chans.find((c) => c.title === "ESPN");
  const stream = await resolveRef(cat, espn.id, ctx, hf);
  assert.equal(stream.url, "https://s/b.m3u8", "fell through from a (null) to b (works)");
});

test("resolveRef returns null when every candidate fails", async () => {
  const chans = await allChannels(cat, ctx, hf);
  const tnt = chans.find((c) => c.title === "TNT"); // only on host a, whose resolve returns null
  assert.equal(await resolveRef(cat, tnt.id, ctx, hf), null);
});
