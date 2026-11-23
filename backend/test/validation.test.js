import assert from "node:assert/strict";
import test from "node:test";
import { escapeRegex, isObjectId } from "../src/validation.js";

test("escapeRegex makes user input match literally", () => {
  assert.equal(escapeRegex("fix (urgent)"), String.raw`fix \(urgent\)`);
  assert.doesNotThrow(() => new RegExp(escapeRegex("(")));
  assert.ok(new RegExp(escapeRegex("a.b")).test("a.b"));
  assert.ok(!new RegExp(escapeRegex("a.b")).test("axb"));
  assert.ok(!new RegExp(escapeRegex(".*")).test("anything"));
});

test("isObjectId accepts only 24-character hex strings", () => {
  assert.ok(isObjectId("64b7f0c2a1b2c3d4e5f60718"));
  assert.ok(!isObjectId("not-an-id"));
  assert.ok(!isObjectId("64b7f0c2a1b2c3d4e5f6071"));
  assert.ok(!isObjectId("zzb7f0c2a1b2c3d4e5f60718"));
  assert.ok(!isObjectId(undefined));
});
