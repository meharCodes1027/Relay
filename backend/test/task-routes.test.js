import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";

function makeServer(repository) {
  return createApp({
    getDatabaseState: () => "connected",
    taskRepository: repository
  }).listen(0);
}

test("task API validates and creates tasks", async () => {
  const tasks = [];
  const repository = {
    list: async () => tasks,
    create: async (input) => ({ _id: "1", ...input }),
    update: async () => null,
    remove: async () => false
  };
  const server = makeServer(repository);
  const { port } = server.address();

  try {
    const invalid = await fetch(`http://127.0.0.1:${port}/api/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "" })
    });
    assert.equal(invalid.status, 400);

    const created = await fetch(`http://127.0.0.1:${port}/api/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Ship board", priority: "high" })
    });
    assert.equal(created.status, 201);
    assert.equal((await created.json()).task.title, "Ship board");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("task API ignores fields clients are not allowed to write", async () => {
  let updateInput;
  let createInput;
  const repository = {
    list: async () => [],
    create: async (input) => { createInput = input; return { _id: "1", ...input }; },
    update: async (_id, input) => { updateInput = input; return { _id: "1", ...input }; },
    remove: async () => false
  };
  const server = makeServer(repository);
  const { port } = server.address();

  try {
    const patched = await fetch(`http://127.0.0.1:${port}/api/tasks/64b7f0c2a1b2c3d4e5f60718`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Renamed", workspace: "someone-elses-workspace", createdAt: "2000-01-01" })
    });
    assert.equal(patched.status, 200);
    assert.deepEqual(updateInput, { title: "Renamed" });

    await fetch(`http://127.0.0.1:${port}/api/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "New", _id: "forged", workspace: "someone-elses-workspace" })
    });
    assert.deepEqual(createInput, { title: "New", workspace: undefined });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
