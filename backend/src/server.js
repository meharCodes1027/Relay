import dotenv from "dotenv";
import { disconnectDatabase } from "./database.js";
import { getApp } from "./runtime.js";

dotenv.config({ path: new URL("../../.env", import.meta.url) });
dotenv.config();

const port = Number(process.env.PORT ?? 3000);
const app = await getApp();
const server = app.listen(port, () => console.log(`Relay API listening on port ${port}`));

// Graceful shutdown order matters: first stop accepting connections and let
// in-flight requests finish (server.close waits for them), and only then close
// the database. Closing the database first made requests that were still
// running during a deploy fail with 500s.
async function shutdown(signal) {
  console.log(`${signal} received; shutting down`);
  try {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await disconnectDatabase();
  } catch (error) {
    console.error("Shutdown failed", error);
    process.exitCode = 1;
  }
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
