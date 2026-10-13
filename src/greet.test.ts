import assert from "node:assert/strict";
import { test } from "node:test";
import { greet } from "./greet.js";

test("greets a named person", () => {
  assert.equal(greet("Ada"), "Hello, Ada!");
});

test("rejects an empty name", () => {
  assert.throws(() => greet("  "), /non-empty/);
});
