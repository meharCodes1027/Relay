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
