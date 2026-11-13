import { createApp } from "./app.js";
import {
  connectDatabase,
  getDatabaseState
} from "./database.js";
import { Task } from "./task-model.js";
import { User, Workspace, Membership, Invitation, Activity, Note, Comment } from "./collaboration-models.js";
import { requireAuth, requireWorkspace } from "./auth.js";
import { createAccountRouter, createCollaborationRouter } from "./account-routes.js";
import { createInsightsRouter } from "./insights-routes.js";

let appPromise;

export function getApp() {
  if (!appPromise) {
    appPromise = createRuntimeApp();
  }
  return appPromise;
}

async function createRuntimeApp() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }

  const taskRepository = {
    list: async ({ search, status, workspace }) => {
      const query = {};
      if (status) query.status = status;
      if (search) query.title = { $regex: search, $options: "i" };
      if (workspace) query.workspace = workspace;
      return Task.find(query).sort({ createdAt: -1 }).lean();
    },
    create: (input) => Task.create(input).then((task) => task.toObject()),
    update: (id, input, workspace) => Task.findOneAndUpdate({ _id: id, ...(workspace ? { workspace } : {}) }, input, { new: true, runValidators: true }).lean(),
    remove: (id, workspace) => Task.findOneAndDelete({ _id: id, ...(workspace ? { workspace } : {}) })
  };

  const authMiddleware = requireAuth({ User, Membership });
  const scopedAuth = (request, response, next) => authMiddleware(request, response, (error) => {
    if (error) return next(error);
    return requireWorkspace(request, response, next);
  });
  const app = createApp({ getDatabaseState, taskRepository, authMiddleware: scopedAuth });
  app.use("/api/account", createAccountRouter({ User, Workspace, Membership }));
  app.use("/api/collaboration", createCollaborationRouter({
    Workspace, Membership, Invitation, Activity, Note, Comment, User, requireAuthMiddleware: scopedAuth
  }));
  app.use("/api/insights", createInsightsRouter({ Task, Activity, requireAuthMiddleware: scopedAuth }));
  await connectDatabase(process.env.MONGODB_URI);
  return app;
}
