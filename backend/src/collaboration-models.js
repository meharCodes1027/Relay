import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema(
  { name: { type: String, required: true, trim: true, maxlength: 120 } },
  { timestamps: true }
);
const membershipSchema = new mongoose.Schema(
  { user: { type: mongoose.Types.ObjectId, ref: "User", required: true }, workspace: { type: mongoose.Types.ObjectId, ref: "Workspace", required: true }, role: { type: String, enum: ["owner", "admin", "member"], default: "member" } },
  { timestamps: true }
);
membershipSchema.index({ user: 1, workspace: 1 }, { unique: true });
const userSchema = new mongoose.Schema(
  { email: { type: String, required: true, unique: true, lowercase: true, trim: true }, name: { type: String, required: true, trim: true }, passwordHash: { type: String, required: true } },
  { timestamps: true }
);
const invitationSchema = new mongoose.Schema(
  { workspace: { type: mongoose.Types.ObjectId, ref: "Workspace", required: true }, email: { type: String, required: true, lowercase: true, trim: true }, role: { type: String, enum: ["admin", "member"], default: "member" }, tokenHash: { type: String, required: true }, expiresAt: { type: Date, required: true } },
  { timestamps: true }
);
const activitySchema = new mongoose.Schema(
  { workspace: { type: mongoose.Types.ObjectId, ref: "Workspace", required: true }, user: { type: mongoose.Types.ObjectId, ref: "User", required: true }, action: { type: String, required: true }, entityType: { type: String, required: true }, entityId: { type: mongoose.Types.ObjectId, required: true }, metadata: { type: mongoose.Schema.Types.Mixed, default: {} } },
  { timestamps: true }
);
const noteSchema = new mongoose.Schema(
  { workspace: { type: mongoose.Types.ObjectId, ref: "Workspace", required: true }, author: { type: mongoose.Types.ObjectId, ref: "User", required: true }, body: { type: String, required: true, maxlength: 5000 } },
  { timestamps: true }
);
const commentSchema = new mongoose.Schema(
  { workspace: { type: mongoose.Types.ObjectId, ref: "Workspace", required: true }, task: { type: mongoose.Types.ObjectId, ref: "Task", required: true }, author: { type: mongoose.Types.ObjectId, ref: "User", required: true }, body: { type: String, required: true, maxlength: 2000 }, mentions: [{ type: mongoose.Types.ObjectId, ref: "User" }] },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
export const Workspace = mongoose.model("Workspace", workspaceSchema);
export const Membership = mongoose.model("Membership", membershipSchema);
export const Invitation = mongoose.model("Invitation", invitationSchema);
export const Activity = mongoose.model("Activity", activitySchema);
export const Note = mongoose.model("Note", noteSchema);
export const Comment = mongoose.model("Comment", commentSchema);
