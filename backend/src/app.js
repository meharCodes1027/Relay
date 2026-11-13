import cors from "cors";
import express from "express";
import { createTaskRouter } from "./task-routes.js";
import { getFocusItems } from "./momentum.js";

export function createApp({ getDatabaseState, taskRepository, authMiddleware }) {
  const app = express();
  const authAttempts = new Map();

  app.use(cors({
    origin: process.env.CLIENT_ORIGIN?.split(",").map((origin) => origin.trim()) ?? false
  }));
  app.disable("x-powered-by");
  app.use((request, response, next) => {
    if (request.method === "POST" || request.method === "PATCH" || request.method === "DELETE") {
      response.setHeader("Cache-Control", "no-store");
    }
    next();
  });
  app.use(express.json({ limit: "100kb" }));
  app.use("/api/account", (request, response, next) => {
    if (request.method !== "POST" || !["/signin", "/register"].includes(request.path)) {
      next();
      return;
    }
    const now = Date.now();
    const key = request.ip;
    const attempts = (authAttempts.get(key) ?? []).filter((timestamp) => now - timestamp < 60_000);
    if (attempts.length >= 10) {
      response.status(429).json({ error: "Too many authentication attempts. Try again shortly." });
      return;
    }
    attempts.push(now);
    authAttempts.set(key, attempts);
    next();
  });
  app.use((request, response, next) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok", service: "relay-api" });
  });

  app.get("/api/readiness", (_request, response) => {
    const database = getDatabaseState();
    const ready = database === "connected";

    response.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "not_ready",
      database
    });
  });

  if (taskRepository) {
    if (authMiddleware) app.use("/api/tasks", authMiddleware);
    app.use("/api/tasks", createTaskRouter({ repository: taskRepository }));
    if (authMiddleware) app.use("/api/focus", authMiddleware);
    app.get("/api/focus", async (_request, response, next) => {
      try {
        response.json({ items: getFocusItems(await taskRepository.list({ workspace: _request.workspaceId })) });
      } catch (error) {
        next(error);
      }
    });
  }

  app.use((error, _request, response, _next) => {
    console.error("Request failed", error);
    response.status(500).json({ error: "Internal server error" });
  });

  return app;
}
