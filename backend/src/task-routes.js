import { Router } from "express";
import { isObjectId } from "./validation.js";

const statuses = new Set(["todo", "in_progress", "blocked", "done"]);
const priorities = new Set(["low", "medium", "high"]);

// Only these fields may be written by clients. Everything else in the request
// body (workspace, _id, createdAt, ...) is ignored so a user cannot reassign a
// task to another workspace or tamper with server-managed fields.
const editableFields = [
  "title",
  "description",
  "status",
  "priority",
  "dueDate",
  "blockedReason",
  "nextAction",
  "lastMeaningfulUpdate"
];

function pickEditableFields(body) {
  const input = {};
  for (const field of editableFields) {
    if (body[field] !== undefined) input[field] = body[field];
  }
  return input;
}

function validateTaskInput(body, partial = false) {
  const errors = [];
  if (!partial || body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim().length === 0) {
      errors.push("title is required");
    } else if (body.title.trim().length > 200) {
      errors.push("title must be at most 200 characters");
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
  // Limits mirror task-model.js so invalid input is rejected with a 400 here
  // instead of failing later as a Mongoose validation error (500).
  for (const field of ["blockedReason", "nextAction"]) {
    if (body[field] !== undefined && (typeof body[field] !== "string" || body[field].length > 500)) {
      errors.push(`${field} must be a string with at most 500 characters`);
    }
  }
  if (body.description !== undefined && (typeof body.description !== "string" || body.description.length > 2000)) {
    errors.push("description must be a string with at most 2000 characters");
  }
  if (body.lastMeaningfulUpdate !== undefined && body.lastMeaningfulUpdate !== null && Number.isNaN(Date.parse(body.lastMeaningfulUpdate))) {
    errors.push("lastMeaningfulUpdate must be a valid date");
  }
  return errors;
}

export function createTaskRouter({ repository }) {
  const router = Router();

  router.param("id", (request, response, next, id) => {
    if (!isObjectId(id)) {
      response.status(400).json({ error: "Invalid task id" });
      return;
    }
    next();
  });

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
      const task = await repository.create({ ...pickEditableFields(request.body), workspace: request.workspaceId });
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
      const task = await repository.update(request.params.id, pickEditableFields(request.body), request.workspaceId);
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
