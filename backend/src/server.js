import dotenv from "dotenv";
import { disconnectDatabase } from "./database.js";
import { getApp } from "./runtime.js";

dotenv.config({ path: new URL("../../.env", import.meta.url) });
dotenv.config();

const port = Number(process.env.PORT ?? 3000);
const app = await getApp();
const server = app.listen(port, () => console.log(`Relay API listening on port ${port}`));

async function shutdown(signal) {
  console.log(`${signal} received; shutting down`);
  await disconnectDatabase();
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
