import { test } from "node:test";
import assert from "node:assert/strict";
import { liveNow, catalogHasEvents } from "../src/aggregate.js";

const ctx = { deadline: Date.now() + 18000, settings: {}, fetchText: async () => "" };
const NOW = 1_800_000_000_000;
const MIN = 60_000;

const withEvents = { hosts: [
  { id: "e", type: "ev", enabled: true, status: "up", weight: 5, provides: ["events"], base: "https://e" },
] };
const noEvents = { hosts: [
  { id: "c", type: "ch", enabled: true, status: "up", weight: 5, provides: ["channels"], base: "https://c" },
] };

const handlers = {
  ev: { async listEvents() { return [
    { id: "live1", title: "Boca vs River", start: NOW - 30 * MIN },   // started 30 min ago → live now
    { id: "old1", title: "Ayer FC", start: NOW - 5 * 60 * MIN },      // 5 h ago → past, dropped
    { id: "soon1", title: "Pronto United", start: NOW + 5 * MIN },    // starts in 5 min → keep
  ]; }, async resolve() { return null; } },
  ch: { async listChannels() { return [{ id: "1", title: "ESPN" }]; }, async listEvents() { return []; } },
};
const hf = (host) => handlers[host.type] || null;

test("liveNow keeps current/upcoming events and drops past ones", async () => {
  const evs = await liveNow(withEvents, ctx, hf, NOW);
  assert.deepEqual(evs.map((e) => e.title).sort(), ["Boca vs River", "Pronto United"]);
});

test("catalogHasEvents reflects whether any active host provides events", () => {
  assert.equal(catalogHasEvents(withEvents), true);
  assert.equal(catalogHasEvents(noEvents), false);
});
