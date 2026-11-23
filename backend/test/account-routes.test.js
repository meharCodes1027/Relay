import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createAccountRouter } from "../src/account-routes.js";

process.env.JWT_SECRET = "test-secret";

// In-memory stand-ins for the Mongoose models the router uses.
function makeModels() {
  const users = [];
  return {
    users,
    User: {
      exists: async ({ email }) => users.some((user) => user.email === email),
      create: async (input) => {
        const user = { _id: `user-${users.length + 1}`, ...input };
        users.push(user);
        return user;
      },
      findOne: async ({ email }) => users.find((user) => user.email === email) ?? null
    },
    Workspace: { create: async (input) => ({ _id: "workspace-1", ...input }) },
    Membership: {
      create: async (input) => input,
      findOne: () => ({ populate: () => ({ lean: async () => null }) })
    }
  };
}

async function withAccountServer(models, callback) {
  const app = express();
  app.use(express.json());
  app.use("/api/account", createAccountRouter(models));
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const post = (path, body) => fetch(`http://127.0.0.1:${port}/api/account${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    await callback(post);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("register rejects malformed emails, blank names, and over-long passwords", async () => {
  await withAccountServer(makeModels(), async (post) => {
    const badEmail = await post("/register", { email: "not-an-email", name: "Ana", password: "password123" });
    assert.equal(badEmail.status, 400);

    const blankName = await post("/register", { email: "ana@example.com", name: "   ", password: "password123" });
    assert.equal(blankName.status, 400);

    const longPassword = await post("/register", { email: "ana@example.com", name: "Ana", password: "x".repeat(73) });
    assert.equal(longPassword.status, 400);
  });
});

test("sign-in normalises the email the same way registration does", async () => {
  const models = makeModels();
  await withAccountServer(models, async (post) => {
    const registered = await post("/register", { email: "  Ana@Example.com ", name: " Ana ", password: "password123" });
    assert.equal(registered.status, 201);
    assert.equal(models.users[0].email, "ana@example.com");
    assert.equal(models.users[0].name, "Ana");

    const signedIn = await post("/signin", { email: " ANA@example.com", password: "password123" });
    assert.equal(signedIn.status, 200);
  });
});

test("sign-in with missing credentials returns 400", async () => {
  await withAccountServer(makeModels(), async (post) => {
    const response = await post("/signin", {});
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Email and password are required" });
  });
});
