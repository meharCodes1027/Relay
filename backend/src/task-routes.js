import { Router } from "express";

const statuses = new Set(["todo", "in_progress", "blocked", "done"]);
const priorities = new Set(["low", "medium", "high"]);

function validateTaskInput(body, partial = false) {
  const errors = [];
  if (!partial || body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim().length === 0) {
      errors.push("title is required");
    }
  }
  if (body.status !== undefined && !statuses.has(body.status)) {
    errors.push("status must be todo, in_progress, blocked, or done");
  }
  if (body.priority !== undefined && !priorities.has(body.priority)) {
    errors.push("priority must be low, medium, or high");
  }
  if (body.dueDate !== undefined && body.dueDate !== null && Number.isNaN(Date.parse(body.dueDate))) {
    errors.push("dueDate must be a valid date");
  }
  for (const field of ["blockedReason", "nextAction"]) {
    if (body[field] !== undefined && typeof body[field] !== "string") {
      errors.push(`${field} must be a string`);
    }
    if (body.description !== undefined && (typeof body.description !== "string" || body.description.length > 2000)) {
      errors.push("description must be a string with at most 2000 characters");
    }
  }
  if (body.lastMeaningfulUpdate !== undefined && body.lastMeaningfulUpdate !== null && Number.isNaN(Date.parse(body.lastMeaningfulUpdate))) {
    errors.push("lastMeaningfulUpdate must be a valid date");
  }
  return errors;
}

export function createTaskRouter({ repository }) {
  const router = Router();

  router.get("/", async (request, response, next) => {
    try {
      const { search = "", status } = request.query;
      const tasks = await repository.list({
        search: String(search),
        status: status ? String(status) : undefined,
        workspace: request.workspaceId
      });
      response.json({ tasks });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (request, response, next) => {
    try {
      const errors = validateTaskInput(request.body);
      if (errors.length) {
        response.status(400).json({ error: "Invalid task", details: errors });
        return;
      }
      const task = await repository.create({ ...request.body, workspace: request.workspaceId });
      response.status(201).json({ task });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", async (request, response, next) => {
    try {
      const errors = validateTaskInput(request.body, true);
      if (errors.length) {
        response.status(400).json({ error: "Invalid task", details: errors });
        return;
      }
      const task = await repository.update(request.params.id, request.body, request.workspaceId);
      if (!task) {
        response.status(404).json({ error: "Task not found" });
        return;
      }
      response.json({ task });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (request, response, next) => {
    try {
      const deleted = await repository.remove(request.params.id, request.workspaceId);
      if (!deleted) {
        response.status(404).json({ error: "Task not found" });
        return;
      }
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
