import { test } from "node:test";
import assert from "node:assert/strict";
import { handlerFor } from "../src/handlers/index.js";

const METHODS = ["listChannels", "listEvents", "resolve", "health"];

test("handlerFor returns a handler with the full contract for a known type", () => {
  const h = handlerFor({ type: "generic" });
  assert.ok(h, "generic handler exists");
  for (const m of METHODS) assert.equal(typeof h[m], "function", `generic has ${m}()`);
});

test("handlerFor returns the daddylive handler too", () => {
  const h = handlerFor({ type: "daddylive" });
  assert.ok(h);
  for (const m of METHODS) assert.equal(typeof h[m], "function", `daddylive has ${m}()`);
});

test("handlerFor returns null for an unknown type", () => {
  assert.equal(handlerFor({ type: "nope" }), null);
  assert.equal(handlerFor({}), null);
});
