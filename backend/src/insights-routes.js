import { Router } from "express";

export function createInsightsRouter({ Task, Activity, requireAuthMiddleware }) {
  const router = Router();
  router.use(requireAuthMiddleware);
  router.get("/", async (request, response, next) => {
    try {
      const workspace = request.workspaceId;
      const [total, completed, active, activity] = await Promise.all([
        Task.countDocuments({ workspace }),
        Task.countDocuments({ workspace, status: "done" }),
        Task.countDocuments({ workspace, status: { $ne: "done" } }),
        Activity.countDocuments({ workspace, createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } })
      ]);
      response.json({ report: { totalTasks: total, completedTasks: completed, activeTasks: active, completionRate: total ? Math.round((completed / total) * 100) : 0, activityLast30Days: activity } });
    } catch (error) { next(error); }
  });
  return router;
}
