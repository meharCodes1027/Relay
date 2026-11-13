import mongoose from "mongoose";

export async function connectDatabase(uri) {
  await mongoose.connect(uri);
}

export function getDatabaseState() {
  return mongoose.connection.readyState === 1 ? "connected" : "disconnected";
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
