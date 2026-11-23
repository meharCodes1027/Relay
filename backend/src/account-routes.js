import crypto from "node:crypto";
import { Router } from "express";
import { createToken, hashPassword, verifyPassword } from "./auth.js";
import { isObjectId } from "./validation.js";

export function createAccountRouter({ User, Workspace, Membership, requireAuthMiddleware }) {
  const router = Router();
  if (requireAuthMiddleware) {
    router.get("/me", requireAuthMiddleware, (request, response) => {
      response.json({ user: request.user });
    });
  }
  router.post("/register", async (request, response, next) => {
    try {
      const { email, name, password, workspaceName } = request.body;
      if (typeof email !== "string" || typeof name !== "string" || typeof password !== "string" || password.length < 8) {
        response.status(400).json({ error: "Name, email, and a password of at least 8 characters are required" });
        return;
      }
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        response.status(400).json({ error: "A valid email address is required" });
        return;
      }
      if (await User.exists({ email: normalizedEmail })) {
        response.status(409).json({ error: "Unable to create account with those details" });
        return;
      }
      const user = await User.create({ email: normalizedEmail, name: name.trim(), passwordHash: await hashPassword(password) });
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

export function createCollaborationRouter({ Workspace, Membership, Invitation, Activity, Note, Comment, User, requireAuthMiddleware, authOnlyMiddleware, mailer }) {
  const router = Router();

  router.get("/invitations/:token", async (request, response, next) => {
    try {
      const tokenHash = crypto.createHash("sha256").update(request.params.token).digest("hex");
      const invitation = await Invitation.findOne({
        tokenHash,
        expiresAt: { $gt: new Date() }
      }).populate("workspace", "name").lean();
      if (!invitation) return response.status(404).json({ error: "This invitation is invalid or has expired" });
      response.json({
        invitation: {
          email: invitation.email,
          role: invitation.role,
          workspace: { id: invitation.workspace._id, name: invitation.workspace.name }
        }
      });
    } catch (error) { next(error); }
  });

  router.post("/invitations/:token/accept", authOnlyMiddleware ?? requireAuthMiddleware, async (request, response, next) => {
    try {
      const tokenHash = crypto.createHash("sha256").update(request.params.token).digest("hex");
      const invitation = await Invitation.findOne({
        tokenHash,
        expiresAt: { $gt: new Date() }
      });
      if (!invitation) return response.status(404).json({ error: "This invitation is invalid or has expired" });
      if (request.user.email.toLowerCase() !== invitation.email) {
        return response.status(403).json({ error: "Sign in with the email address this invitation was sent to" });
      }
      await Membership.findOneAndUpdate(
        { user: request.user._id, workspace: invitation.workspace },
        { role: invitation.role },
        { upsert: true, new: true }
      );
      await Activity.create({
        workspace: invitation.workspace,
        user: request.user._id,
        action: "joined the workspace",
        entityType: "membership",
        entityId: request.user._id
      });
      await invitation.deleteOne();
      response.json({ workspace: await Workspace.findById(invitation.workspace).select("name").lean() });
    } catch (error) { next(error); }
  });

  router.use(requireAuthMiddleware);
  router.param("taskId", (request, response, next, taskId) => {
    if (!isObjectId(taskId)) return response.status(400).json({ error: "Invalid task id" });
    next();
  });
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
    try {
      const body = typeof request.body.body === "string" ? request.body.body.trim() : "";
      if (!body) return response.status(400).json({ error: "A note is required" });
      const note = await Note.create({ workspace: request.workspaceId, author: request.user._id, body });
      await Activity.create({ workspace: request.workspaceId, user: request.user._id, action: "shared a team note", entityType: "note", entityId: note._id, metadata: { preview: body.slice(0, 120) } });
      response.status(201).json({ note });
    } catch (error) { next(error); }
  });
  router.get("/tasks/:taskId/comments", async (request, response, next) => {
    try { response.json({ comments: await Comment.find({ workspace: request.workspaceId, task: request.params.taskId }).populate("author", "name").lean() }); } catch (error) { next(error); }
  });
  router.post("/tasks/:taskId/comments", async (request, response, next) => {
    try {
      const body = typeof request.body.body === "string" ? request.body.body.trim() : "";
      if (!body) return response.status(400).json({ error: "A comment is required" });
      const comment = await Comment.create({ workspace: request.workspaceId, task: request.params.taskId, author: request.user._id, body, mentions: Array.isArray(request.body.mentions) ? request.body.mentions : [] });
      await Activity.create({ workspace: request.workspaceId, user: request.user._id, action: "added a task comment", entityType: "comment", entityId: comment._id });
      response.status(201).json({ comment });
    } catch (error) { next(error); }
  });
  router.post("/invitations", async (request, response, next) => {
    try {
      if (!["owner", "admin"].includes(request.membership?.role)) return response.status(403).json({ error: "Insufficient workspace permissions" });
      if (!mailer) return response.status(503).json({ error: "Email delivery is not configured" });
      const email = typeof request.body.email === "string" ? request.body.email.trim().toLowerCase() : "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return response.status(400).json({ error: "A valid email address is required" });
      const existingUser = await User.findOne({ email }).select("_id").lean();
      if (existingUser && await Membership.exists({ user: existingUser._id, workspace: request.workspaceId })) {
        return response.status(409).json({ error: "This person is already a workspace member" });
      }
      if (await Invitation.exists({ workspace: request.workspaceId, email, expiresAt: { $gt: new Date() } })) {
        return response.status(409).json({ error: "An invitation has already been sent to this email" });
      }
      const rawToken = crypto.randomBytes(32).toString("hex");
      const invitation = await Invitation.create({ workspace: request.workspaceId, email, role: request.body.role === "admin" ? "admin" : "member", tokenHash: crypto.createHash("sha256").update(rawToken).digest("hex"), expiresAt: new Date(Date.now() + 7 * 86400000) });
      const workspace = await Workspace.findById(request.workspaceId).select("name").lean();
      try {
        await mailer.sendInvitation({ recipient: invitation.email, workspaceName: workspace.name, token: rawToken });
      } catch (error) {
        await Invitation.deleteOne({ _id: invitation._id });
        response.status(502).json({ error: "Unable to deliver the invitation email" });
        return;
      }
      await Activity.create({ workspace: request.workspaceId, user: request.user._id, action: `invited ${invitation.email}`, entityType: "invitation", entityId: invitation._id });
      response.status(201).json({ invitationId: invitation._id, email: invitation.email });
    } catch (error) { next(error); }
  });
  return router;
}
