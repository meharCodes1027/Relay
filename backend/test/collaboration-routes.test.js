import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createCollaborationRouter } from "../src/account-routes.js";

const WORKSPACE_ID = "64b7f0c2a1b2c3d4e5f60719";
const USER_ID = "64b7f0c2a1b2c3d4e5f60720";

function signedInAs(user) {
  return (request, _response, next) => {
    request.user = user;
    request.workspaceId = WORKSPACE_ID;
    next();
  };
}

async function withCollaborationServer(models, callback) {
  const app = express();
  app.use(express.json());
  const auth = signedInAs({ _id: USER_ID, email: "owner@example.com" });
  app.use("/api/collaboration", createCollaborationRouter({ ...models, requireAuthMiddleware: auth, authOnlyMiddleware: auth }));
  const server = app.listen(0);
  try {
    const { port } = server.address();
    await callback(`http://127.0.0.1:${port}/api/collaboration`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("accepting an invitation never overwrites an existing member's role", async () => {
  let membershipUpdate;
  const models = {
    Invitation: {
      findOne: async () => ({ workspace: WORKSPACE_ID, email: "owner@example.com", role: "member", deleteOne: async () => {} })
    },
    Membership: {
      findOneAndUpdate: async (_filter, update) => { membershipUpdate = update; return {}; }
    },
    Activity: { create: async () => ({}) },
    Workspace: { findById: () => ({ select: () => ({ lean: async () => ({ name: "Team" }) }) }) }
  };

  await withCollaborationServer(models, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/invitations/some-token/accept`, { method: "POST" });
    assert.equal(response.status, 200);
    assert.deepEqual(membershipUpdate, { $setOnInsert: { role: "member" } });
  });
});
