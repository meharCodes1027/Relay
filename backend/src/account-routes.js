import crypto from "node:crypto";
import { Router } from "express";
import { createToken, hashPassword, verifyPassword } from "./auth.js";

export function createAccountRouter({ User, Workspace, Membership }) {
  const router = Router();
  router.post("/register", async (request, response, next) => {
    try {
      const { email, name, password, workspaceName } = request.body;
      if (typeof email !== "string" || typeof name !== "string" || typeof password !== "string" || password.length < 8) {
        response.status(400).json({ error: "Name, email, and a password of at least 8 characters are required" });
        return;
      }
      if (await User.exists({ email: email.toLowerCase() })) {
        response.status(409).json({ error: "Unable to create account with those details" });
        return;
      }
      const user = await User.create({ email, name, passwordHash: await hashPassword(password) });
      const workspace = await Workspace.create({ name: typeof workspaceName === "string" && workspaceName.trim() ? workspaceName : `${name}'s workspace` });
      await Membership.create({ user: user._id, workspace: workspace._id, role: "owner" });
      response.status(201).json({ token: createToken(user._id.toString()), user: { id: user._id, email: user.email, name: user.name }, workspace: { id: workspace._id, name: workspace.name } });
    } catch (error) { next(error); }
  });
  router.post("/signin", async (request, response, next) => {
    try {
      const { email, password } = request.body;
      const user = await User.findOne({ email: String(email).toLowerCase() });
      if (!user || !(await verifyPassword(String(password), user.passwordHash))) {
        response.status(401).json({ error: "Invalid email or password" });
        return;
      }
      const membership = await Membership.findOne({ user: user._id }).populate("workspace", "name").lean();
      response.json({
        token: createToken(user._id.toString()),
        user: { id: user._id, email: user.email, name: user.name },
        workspace: membership ? { id: membership.workspace._id, name: membership.workspace.name } : undefined
      });
    } catch (error) { next(error); }
  });
  return router;
}

export function createCollaborationRouter({ Workspace, Membership, Invitation, Activity, Note, Comment, User, requireAuthMiddleware }) {
  const router = Router();
  router.use(requireAuthMiddleware);
  router.get("/workspaces", async (request, response, next) => {
    try {
      const memberships = await Membership.find({ user: request.user._id }).populate("workspace", "name").lean();
      response.json({ workspaces: memberships.map(({ workspace, role }) => ({ ...workspace, role })) });
    } catch (error) { next(error); }
  });
  router.post("/workspaces", async (request, response, next) => {
    try {
      const name = typeof request.body.name === "string" ? request.body.name.trim() : "";
      if (!name) return response.status(400).json({ error: "Workspace name is required" });
      const workspace = await Workspace.create({ name });
      await Membership.create({ user: request.user._id, workspace: workspace._id, role: "owner" });
      response.status(201).json({ workspace });
    } catch (error) { next(error); }
  });
  router.get("/activity", async (request, response, next) => {
    try { response.json({ activity: await Activity.find({ workspace: request.workspaceId }).sort({ createdAt: -1 }).limit(50).populate("user", "name").lean() }); } catch (error) { next(error); }
  });
  router.post("/notes", async (request, response, next) => {
    try { const note = await Note.create({ workspace: request.workspaceId, author: request.user._id, body: request.body.body }); response.status(201).json({ note }); } catch (error) { next(error); }
  });
  router.get("/tasks/:taskId/comments", async (request, response, next) => {
    try { response.json({ comments: await Comment.find({ workspace: request.workspaceId, task: request.params.taskId }).populate("author", "name").lean() }); } catch (error) { next(error); }
  });
  router.post("/tasks/:taskId/comments", async (request, response, next) => {
    try { const comment = await Comment.create({ workspace: request.workspaceId, task: request.params.taskId, author: request.user._id, body: request.body.body, mentions: Array.isArray(request.body.mentions) ? request.body.mentions : [] }); response.status(201).json({ comment }); } catch (error) { next(error); }
  });
  router.post("/invitations", async (request, response, next) => {
    try {
      if (!["owner", "admin"].includes(request.membership?.role)) return response.status(403).json({ error: "Insufficient workspace permissions" });
      const rawToken = crypto.randomBytes(32).toString("hex");
      const invitation = await Invitation.create({ workspace: request.workspaceId, email: request.body.email, role: request.body.role === "admin" ? "admin" : "member", tokenHash: crypto.createHash("sha256").update(rawToken).digest("hex"), expiresAt: new Date(Date.now() + 7 * 86400000) });
      response.status(201).json({ invitationId: invitation._id, token: rawToken });
    } catch (error) { next(error); }
  });
  return router;
}
