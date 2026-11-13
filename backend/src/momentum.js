const STALE_DAYS = 7;

function daysSince(date, now) {
  return Math.floor((now.getTime() - new Date(date).getTime()) / 86400000);
}

export function getMomentumSignals(task, now = new Date()) {
  if (task.status === "done") return [];

  const signals = [];
  if (task.status === "blocked") {
    signals.push({
      type: "blocked",
      label: "Blocked",
      reason: task.blockedReason || "This task is marked as blocked."
    });
  }
  if (task.dueDate && new Date(task.dueDate) < now) {
    signals.push({
      type: "overdue",
      label: "Overdue",
      reason: `This task passed its due date on ${new Date(task.dueDate).toLocaleDateString()}.`
    });
  }
  const lastUpdate = task.lastMeaningfulUpdate || task.updatedAt;
  if (lastUpdate && daysSince(lastUpdate, now) >= STALE_DAYS) {
    signals.push({
      type: "stale",
      label: "Stale",
      reason: `No meaningful update in ${daysSince(lastUpdate, now)} days.`
    });
  }
  if (!task.nextAction?.trim()) {
    signals.push({
      type: "next_action_missing",
      label: "Next action missing",
      reason: "There is no recorded next action for this task."
    });
  }
  return signals;
}

export function getFocusItems(tasks, now = new Date()) {
  return tasks
    .map((task) => ({ task, signals: getMomentumSignals(task, now) }))
    .filter((item) => item.signals.length > 0);
}
