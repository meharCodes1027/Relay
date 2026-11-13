import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";

async function withServer(databaseState, callback) {
  const app = createApp({ getDatabaseState: () => databaseState });
  const server = app.listen(0);

  try {
    const { port } = server.address();
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("health endpoint reports a running API", async () => {
  await withServer("disconnected", async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: "ok",
      service: "relay-api"
    });
  });
});

test("readiness endpoint reflects database connectivity", async () => {
  await withServer("connected", async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/readiness`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: "ready",
      database: "connected"
    });
  });

  await withServer("disconnected", async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/readiness`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      status: "not_ready",
      database: "disconnected"
    });
  });
});
