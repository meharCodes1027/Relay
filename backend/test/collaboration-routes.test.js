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

test("comments keep only mentions of workspace members and reject oversized bodies", async () => {
  const MEMBER_ID = "64b7f0c2a1b2c3d4e5f60721";
  const OUTSIDER_ID = "64b7f0c2a1b2c3d4e5f60722";
  let createdComment;
  let membershipQuery;
  const models = {
    Membership: {
      find: (query) => {
        membershipQuery = query;
        const members = query.user.$in.filter((id) => id === MEMBER_ID).map((user) => ({ user }));
        return { select: () => ({ lean: async () => members }) };
      }
    },
    Comment: { create: async (input) => { createdComment = input; return { _id: "comment-1", ...input }; } },
    Activity: { create: async () => ({}) }
  };

  await withCollaborationServer(models, async (baseUrl) => {
    const post = (body) => fetch(`${baseUrl}/tasks/64b7f0c2a1b2c3d4e5f60718/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });

    const created = await post({ body: "Looks good", mentions: [MEMBER_ID, MEMBER_ID, OUTSIDER_ID, "junk", 42] });
    assert.equal(created.status, 201);
    assert.deepEqual(membershipQuery.user.$in, [MEMBER_ID, OUTSIDER_ID]);
    assert.deepEqual(createdComment.mentions, [MEMBER_ID]);

    const oversized = await post({ body: "x".repeat(2001) });
    assert.equal(oversized.status, 400);
  });
});

test("notes longer than the schema limit are rejected with 400", async () => {
  const models = { Note: { create: async () => { throw new Error("should not be called"); } }, Activity: { create: async () => ({}) } };
  await withCollaborationServer(models, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: "x".repeat(5001) })
    });
    assert.equal(response.status, 400);
  });
});
