import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Types.ObjectId, ref: "Workspace", required: false },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", maxlength: 2000 },
    status: {
      type: String,
      enum: ["todo", "in_progress", "blocked", "done"],
      default: "todo"
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium"
    },
    dueDate: { type: Date, default: null }
    ,
    blockedReason: { type: String, default: "", maxlength: 500 },
    nextAction: { type: String, default: "", maxlength: 500 },
    lastMeaningfulUpdate: { type: Date, default: null }
  },
  { timestamps: true }
);

export const Task = mongoose.model("Task", taskSchema);
