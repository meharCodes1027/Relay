import assert from "node:assert/strict";
import test from "node:test";
import { escapeRegex } from "../src/validation.js";

test("escapeRegex makes user input match literally", () => {
  assert.equal(escapeRegex("fix (urgent)"), String.raw`fix \(urgent\)`);
  assert.doesNotThrow(() => new RegExp(escapeRegex("(")));
  assert.ok(new RegExp(escapeRegex("a.b")).test("a.b"));
  assert.ok(!new RegExp(escapeRegex("a.b")).test("axb"));
  assert.ok(!new RegExp(escapeRegex(".*")).test("anything"));
});
