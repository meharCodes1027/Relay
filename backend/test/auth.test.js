import assert from "node:assert/strict";
import test from "node:test";
import { createToken, requireAuth } from "../src/auth.js";

test("workspace authorization denies a user from another workspace", async () => {
  const middleware = requireAuth({
    User: { findById: () => ({ select: () => ({ lean: async () => ({ _id: "user-1" }) }) }) },
    Membership: { findOne: () => ({ lean: async () => null }) }
  });
  process.env.JWT_SECRET = "test-secret";
  const request = { headers: { authorization: `Bearer ${createToken("user-1")}`, "x-workspace-id": "64b7f0c2a1b2c3d4e5f60719" } };
  const result = { statusCode: 200, body: null };
  const response = {
    status(code) { result.statusCode = code; return this; },
    json(body) { result.body = body; }
  };
  await middleware(request, response, () => {});
  assert.equal(result.statusCode, 403);
  assert.deepEqual(result.body, { error: "Workspace access denied" });
});

test("malformed workspace id header is rejected with 400", async () => {
  const middleware = requireAuth({
    User: { findById: () => ({ select: () => ({ lean: async () => ({ _id: "user-1" }) }) }) },
    Membership: { findOne: () => { throw new Error("database should not be queried"); } }
  });
  process.env.JWT_SECRET = "test-secret";
  const request = { headers: { authorization: `Bearer ${createToken("user-1")}`, "x-workspace-id": "not-an-id" } };
  const result = { statusCode: 200, body: null };
  const response = {
    status(code) { result.statusCode = code; return this; },
    json(body) { result.body = body; }
  };
  await middleware(request, response, () => {});
  assert.equal(result.statusCode, 400);
  assert.deepEqual(result.body, { error: "Invalid workspace id" });
});
