import { FormEvent, StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type View = "Focus" | "Projects" | "Inbox" | "Insights";
type Status = "todo" | "in_progress" | "blocked" | "done";
type Task = {
  _id: string;
  title: string;
  description: string;
  status: Status;
  priority: "low" | "medium" | "high";
  dueDate?: string | null;
  blockedReason?: string;
  nextAction?: string;
};
type FocusItem = { task: Task; signals: { type: string; label: string; reason: string }[] };
type AuthResponse = {
  token: string;
  user: { id: string; email: string; name: string };
  workspace?: { id: string; name: string };
};
type Workspace = { _id?: string; id?: string; name: string; role?: string };
type InsightReport = {
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  completionRate: number;
  activityLast30Days: number;
};
type Activity = { _id: string; action: string; createdAt: string; user?: { name: string } };

const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${API_URL}${path}`, init);
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const body = await response.text();
  if (!body) {
    throw new Error(
      response.status >= 500
        ? "The API is unavailable. Make sure the backend and MongoDB are running."
        : `The API returned an empty response (${response.status}).`
    );
  }
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(`The API returned an unexpected response (${response.status}).`);
  }
}

const navigation: { label: View; icon: string }[] = [
  { label: "Focus", icon: "◎" },
  { label: "Projects", icon: "▣" },
  { label: "Inbox", icon: "⌁" },
  { label: "Insights", icon: "◒" }
];

function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <a className="landing-brand" href="/">
          <span className="brand-mark brand-mark--light" aria-hidden="true">R</span>
          <span>relay</span>
        </a>
        <nav className="landing-links" aria-label="Landing page navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#principles">Principles</a>
          <a href="/app">Sign in</a>
        </nav>
        <a className="landing-nav-cta" href="/app">Open workspace <span aria-hidden="true">↗</span></a>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <p className="landing-kicker"><span className="kicker-line" /> Momentum for the work that matters</p>
            <h1>Know what is stuck.<br /><em>Move what matters.</em></h1>
            <p className="landing-lede">
              Relay gives small teams a clear view of work that needs attention, why it is slowing down, and what to do next.
            </p>
            <div className="landing-actions">
              <a className="landing-primary-button" href="/app">Start with your workspace <span aria-hidden="true">→</span></a>
              <a className="landing-text-link" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a>
            </div>
            <p className="landing-note"><span aria-hidden="true">✦</span> Calm project clarity, without the noise.</p>
          </div>
          <div className="landing-demo" aria-label="Illustration of the Relay focus queue">
            <div className="demo-window">
              <div className="demo-window-top"><span className="demo-dots">● ● ●</span><span>Northstar / Focus</span><span>···</span></div>
              <div className="demo-window-body">
                <div className="demo-sidebar"><strong>relay</strong><span className="demo-sidebar-active">◎ Focus <b>4</b></span><span>▣ Projects</span><span>⌁ Inbox</span><span>◒ Insights</span></div>
                <div className="demo-content"><small>WEDNESDAY, OCTOBER 29</small><h2>Good morning, Maya.</h2><p>Here’s what deserves your attention today.</p><div className="demo-card"><div className="demo-card-top"><span>FOCUS QUEUE</span><span className="demo-badge">NEEDS ATTENTION</span></div><h3>Finalize onboarding flow</h3><div className="demo-signal"><b>Next action missing</b><span>There is no recorded next action for this task.</span></div><div className="demo-card-footer"><span>Northstar / Product</span><span className="demo-action">Open task&nbsp; →</span></div></div></div>
              </div>
            </div>
            <div className="demo-caption"><span className="caption-dot" /> A quieter way to keep momentum visible.</div>
          </div>
        </section>

        <section className="landing-principles" id="principles">
          <p className="landing-kicker"><span className="kicker-line" /> Built for the in-between</p>
          <div className="principle-grid">
            <article><span className="principle-number">01</span><h2>See the signal.</h2><p>Relay surfaces blocked, overdue, stale, and directionless work before it disappears into a status column.</p></article>
            <article><span className="principle-number">02</span><h2>Understand the why.</h2><p>Every item comes with a plain-language reason, so attention starts with context instead of guesswork.</p></article>
            <article><span className="principle-number">03</span><h2>Choose what moves next.</h2><p>Turn a moment of friction into a clear next action and keep the team moving together.</p></article>
          </div>
        </section>

        <section className="landing-how" id="how-it-works">
          <div><p className="landing-kicker"><span className="kicker-line" /> The Relay perspective</p><h2>Less reporting.<br /><em>More forward motion.</em></h2></div>
          <p>Project management should not ask your team to become full-time project managers. Relay keeps the structure light and the important work close.</p>
        </section>

        <section className="landing-process">
          <div className="process-intro">
            <p className="landing-kicker"><span className="kicker-line" /> A useful loop</p>
            <h2>From friction<br /><em>to forward.</em></h2>
          </div>
          <div className="process-steps">
            <article className="process-step">
              <span className="process-icon">01</span>
              <div><h3>Notice</h3><p>Relay checks the work already in your workspace for clear momentum signals.</p></div>
            </article>
            <article className="process-step">
              <span className="process-icon">02</span>
              <div><h3>Understand</h3><p>Each item explains why it needs attention, without hiding the rule behind a vague score.</p></div>
            </article>
            <article className="process-step">
              <span className="process-icon">03</span>
              <div><h3>Move</h3><p>Choose the next action, update the task, and make progress visible to the team.</p></div>
            </article>
          </div>
        </section>

        <section className="landing-final-cta">
          <p className="landing-kicker"><span className="kicker-line" /> Start with the work in front of you</p>
          <h2>A clearer next step<br /><em>is closer than it looks.</em></h2>
          <a className="landing-primary-button" href="/app">Open your workspace <span aria-hidden="true">→</span></a>
        </section>
      </main>
      <footer className="landing-footer"><a className="landing-brand" href="/"><span className="brand-mark brand-mark--dark" aria-hidden="true">R</span><span>relay</span></a><span>Make progress visible.</span><span>© 2026 Relay</span></footer>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("relay_token") ?? "");
  const [workspaceId, setWorkspaceId] = useState(() => localStorage.getItem("relay_workspace") ?? "");
  const [workspaceName, setWorkspaceName] = useState(() => localStorage.getItem("relay_workspace_name") ?? "Workspace");
  const [authMode, setAuthMode] = useState<"signin" | "register">("signin");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [activeView, setActiveView] = useState<View>("Focus");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskError, setTaskError] = useState("");
  const [search, setSearch] = useState("");
  const [showNewTask, setShowNewTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskSaving, setTaskSaving] = useState(false);
  const [focusItems, setFocusItems] = useState<FocusItem[]>([]);
  const [insights, setInsights] = useState<InsightReport | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);

  const apiHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}`, "x-workspace-id": workspaceId }),
    [token, workspaceId]
  );

  useEffect(() => {
    if (!token) return;
    const headers = apiHeaders;
    apiFetch("/api/tasks", { headers })
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 401) throw new Error("Authentication required");
          throw new Error("Unable to load tasks");
        }
        return response.json();
      })
      .then((data: { tasks: Task[] }) => setTasks(data.tasks))
      .catch((error: unknown) => {
        if (error instanceof Error && error.message === "Authentication required") {
          localStorage.removeItem("relay_token");
          setToken("");
        } else {
          setTaskError("Connect the API to load project tasks.");
        }
      });
    apiFetch("/api/focus", { headers })
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 401) throw new Error("Authentication required");
          throw new Error("Unable to load focus queue");
        }
        return response.json();
      })
      .then((data: { items: FocusItem[] }) => setFocusItems(data.items))
      .catch((error: unknown) => {
        if (error instanceof Error && error.message === "Authentication required") {
          localStorage.removeItem("relay_token");
          setToken("");
        } else {
          setTaskError("Connect the API to load the focus queue.");
        }
      });
    apiFetch("/api/insights", { headers })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load insights");
        return response.json();
      })
      .then((data: { report: InsightReport }) => setInsights(data.report))
      .catch(() => setTaskError("Connect the API to load workspace insights."));
    apiFetch("/api/collaboration/activity", { headers })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load activity");
        return response.json();
      })
      .then((data: { activity: Activity[] }) => setActivity(data.activity))
      .catch(() => setTaskError("Connect the API to load workspace activity."));
  }, [token, workspaceId]);

  useEffect(() => {
    if (!showNewTask && !selectedTask) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowNewTask(false);
        setSelectedTask(null);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [selectedTask, showNewTask]);

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      ...(authMode === "register"
        ? { name: String(form.get("name") ?? ""), workspaceName: String(form.get("workspaceName") ?? "") }
        : {})
    };
    try {
      const response = await apiFetch(`/api/account/${authMode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      let data: Partial<AuthResponse> & { error?: string };
      try {
        data = await readJsonResponse<Partial<AuthResponse> & { error?: string }>(response);
      } catch (error) {
        throw error;
      }
      if (!response.ok || !data.token) throw new Error(data.error ?? "Authentication failed");
      localStorage.setItem("relay_token", data.token);
      if (data.workspace) {
        localStorage.setItem("relay_workspace", data.workspace.id);
        localStorage.setItem("relay_workspace_name", data.workspace.name);
        setWorkspaceId(data.workspace.id);
        setWorkspaceName(data.workspace.name);
      }
      setToken(data.token);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  }

  if (!token) {
    return (
      <main className="auth-page">
        <form className="auth-card" onSubmit={authenticate}>
          <div className="brand"><span className="brand-mark" aria-hidden="true">R</span><span>relay</span></div>
          <h1>{authMode === "signin" ? "Welcome back." : "Create your workspace."}</h1>
          <p>{authMode === "signin" ? "Sign in to keep your team moving." : "Start making progress visible."}</p>
          {authMode === "register" && <><label>Your name<input name="name" required autoComplete="name" /></label><label>Workspace name<input name="workspaceName" placeholder="Northstar" autoComplete="organization" /></label></>}
          <label>Email<input name="email" type="email" required autoComplete="email" /></label>
          <label>Password<input name="password" type="password" required minLength={8} autoComplete={authMode === "signin" ? "current-password" : "new-password"} /></label>
          {authError && <p className="error-message" role="alert">{authError}</p>}
          <button className="primary-button" type="submit" disabled={authLoading}>{authLoading ? "Working..." : authMode === "signin" ? "Sign in" : "Create account"}</button>
          <button className="auth-switch" type="button" onClick={() => { setAuthMode(authMode === "signin" ? "register" : "signin"); setAuthError(""); }}>
            {authMode === "signin" ? "Need an account? Register" : "Already have an account? Sign in"}
          </button>
        </form>
      </main>
    );
  }

  const filteredTasks = useMemo(
    () => tasks.filter((task) => task.title.toLowerCase().includes(search.toLowerCase())),
    [search, tasks]
  );

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    if (!title) return;
    const response = await apiFetch("/api/tasks", {
      method: "POST",
      headers: { ...apiHeaders, "content-type": "application/json" },
      body: JSON.stringify({ title, priority: form.get("priority") })
    });
    if (!response.ok) {
      setTaskError("The task could not be created.");
      return;
    }
    const data = (await response.json()) as { task: Task };
    setTasks((current) => [data.task, ...current]);
    setFocusItems((current) => [...current, { task: data.task, signals: [{ type: "next_action_missing", label: "Next action missing", reason: "There is no recorded next action for this task." }] }]);
    setShowNewTask(false);
  }

  async function updateTaskStatus(task: Task, status: Status) {
    const response = await apiFetch(`/api/tasks/${task._id}`, {
      method: "PATCH",
      headers: { ...apiHeaders, "content-type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (!response.ok) {
      setTaskError("The task could not be updated.");
      return;
    }
    const data = (await response.json()) as { task: Task };
    setTasks((current) => current.map((item) => (item._id === task._id ? data.task : item)));
    setFocusItems((current) => current.filter((item) => item.task._id !== task._id || status !== "done"));
  }

  async function updateTaskDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTask) return;
    setTaskSaving(true);
    setTaskError("");
    const form = new FormData(event.currentTarget);
    const response = await apiFetch(`/api/tasks/${selectedTask._id}`, {
      method: "PATCH",
      headers: { ...apiHeaders, "content-type": "application/json" },
      body: JSON.stringify({
        title: String(form.get("title") ?? "").trim(),
        description: String(form.get("description") ?? ""),
        status: form.get("status"),
        priority: form.get("priority"),
        dueDate: form.get("dueDate") ? String(form.get("dueDate")) : null,
        nextAction: String(form.get("nextAction") ?? ""),
        blockedReason: String(form.get("blockedReason") ?? "")
      })
    });
    if (!response.ok) {
      setTaskError("The task details could not be saved.");
      setTaskSaving(false);
      return;
    }
    const data = (await response.json()) as { task: Task };
    setTasks((current) => current.map((item) => item._id === data.task._id ? data.task : item));
    setSelectedTask(null);
    setTaskSaving(false);
  }

  function navigate(view: View) {
    setActiveView(view);
    setSidebarOpen(false);
  }

  function logout() {
    localStorage.removeItem("relay_token");
    localStorage.removeItem("relay_workspace");
    localStorage.removeItem("relay_workspace_name");
    setToken("");
    setWorkspaceId("");
    setWorkspaceName("Workspace");
  }

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`sidebar ${sidebarOpen ? "sidebar--open" : ""}`}>
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            R
          </span>
          <span>relay</span>
        </div>

        <div className="workspace-switcher">
          <span className="workspace-avatar">N</span>
          <span className="workspace-name">{workspaceName}</span>
          <span className="workspace-chevron" aria-hidden="true">
            ⌄
          </span>
        </div>

        <nav className="primary-nav" aria-label="Primary navigation">
          <p className="nav-label">Workspace</p>
          {navigation.map((item) => (
            <button
              className={`nav-item ${activeView === item.label ? "nav-item--active" : ""}`}
              key={item.label}
              onClick={() => navigate(item.label)}
              aria-current={activeView === item.label ? "page" : undefined}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
              {item.label === "Focus" && <span className="nav-count">4</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item">
            <span className="nav-icon" aria-hidden="true">
              ?
            </span>
            <span>Help &amp; shortcuts</span>
          </button>
          <div className="user-profile">
            <span className="user-avatar">MC</span>
            <span className="user-details">
              <strong>Relay member</strong>
              <small>{workspaceName}</small>
            </span>
            <button className="user-more" type="button" onClick={logout}>Sign out</button>
          </div>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button
            className="menu-button"
            aria-label="Open navigation"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>
          <div className="breadcrumbs">
            <span>{workspaceName}</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{activeView}</strong>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Search">
              ⌕
            </button>
            <button className="icon-button notification-button" aria-label="Notifications">
              ♢<span className="notification-dot" />
            </button>
            <button className="avatar-button" aria-label="Open profile">MC</button>
          </div>
        </header>

        <main className="content">
          <div className="content-heading">
            <div>
              <p className="eyebrow">Wednesday, October 29</p>
              <h1>{activeView === "Focus" ? "Good morning, Maya." : activeView}</h1>
              <p className="heading-description">
                {activeView === "Focus"
                  ? "Here’s what deserves your attention today."
                  : `${activeView} is ready for your team’s work.`}
              </p>
            </div>
            <button className="primary-button" onClick={() => setShowNewTask(true)}>
              <span aria-hidden="true">+</span> New task
            </button>
          </div>

          {activeView === "Projects" ? (
            <section className="board-section" aria-label="Project board">
              <div className="board-toolbar">
                <input
                  className="search-input"
                  placeholder="Search tasks"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search tasks"
                />
                <span className="task-count">{filteredTasks.length} tasks</span>
              </div>
              {taskError && <p className="error-message">{taskError}</p>}
              <div className="board">
                {([
                  ["todo", "To do"],
                  ["in_progress", "In progress"],
                  ["blocked", "Blocked"],
                  ["done", "Done"]
                ] as [Status, string][]).map(([status, label]) => (
                  <div className="board-column" key={status}>
                    <div className="column-heading"><span>{label}</span><span>{filteredTasks.filter((task) => task.status === status).length}</span></div>
                    <div className="task-list">
                      {filteredTasks.filter((task) => task.status === status).map((task) => (
                        <article
                          className="task-card"
                          key={task._id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedTask(task)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedTask(task);
                            }
                          }}
                          aria-label={`Edit ${task.title}`}
                        >
                          <h3>{task.title}</h3>
                          <span className={`priority priority--${task.priority}`}>{task.priority}</span>
                          <select value={task.status} onClick={(event) => event.stopPropagation()} onChange={(event) => updateTaskStatus(task, event.target.value as Status)} aria-label={`Update ${task.title} status`}>
                            <option value="todo">To do</option>
                            <option value="in_progress">In progress</option>
                            <option value="blocked">Blocked</option>
                            <option value="done">Done</option>
                          </select>
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : activeView === "Focus" ? (
            <section className="focus-queue" aria-label="Focus queue">
              {taskError && <p className="error-message">{taskError}</p>}
              {focusItems.length === 0 ? (
                <div className="empty-state"><div className="empty-state-icon" aria-hidden="true">✓</div><h2>Your focus queue is clear.</h2><p>Tasks that are blocked, overdue, stale, or missing a next action will appear here.</p></div>
              ) : (
                <div className="focus-list">
                  {focusItems.map(({ task, signals }) => (
                    <article className="focus-card" key={task._id}>
                      <div className="focus-card-heading"><div><span className="focus-project">Northstar</span><h2>{task.title}</h2></div><span className={`priority priority--${task.priority}`}>{task.priority}</span></div>
                      <div className="signal-list">
                        {signals.map((signal) => <div className="signal" key={signal.type}><span className="signal-label">{signal.label}</span><span>{signal.reason}</span></div>)}
                      </div>
                      <div className="focus-card-actions"><button className="secondary-button" onClick={() => setSelectedTask(task)}>Open task</button><button className="primary-button" onClick={() => updateTaskStatus(task, "done")}>Mark done</button></div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : activeView === "Insights" ? (
            <section className="insights-grid" aria-label="Workspace insights">
              <div className="insight-card insight-card--wide"><span className="insight-label">Completion rate</span><strong>{insights?.completionRate ?? 0}%</strong><p>Completed tasks across this workspace.</p></div>
              <div className="insight-card"><span className="insight-label">Active tasks</span><strong>{insights?.activeTasks ?? 0}</strong><p>Work still in motion.</p></div>
              <div className="insight-card"><span className="insight-label">Activity</span><strong>{insights?.activityLast30Days ?? 0}</strong><p>Updates in the last 30 days.</p></div>
              <div className="activity-panel"><div className="panel-heading"><h2>Recent activity</h2><span>{activity.length} events</span></div>{activity.length === 0 ? <p className="muted-copy">Activity will appear here as your team works.</p> : activity.map((event) => <div className="activity-row" key={event._id}><span className="activity-dot" /><span>{event.user?.name ?? "A teammate"} {event.action}</span><time>{new Date(event.createdAt).toLocaleDateString()}</time></div>)}</div>
            </section>
          ) : activeView === "Inbox" ? (
            <section className="inbox-panel" aria-label="Workspace inbox">
              <div className="panel-heading"><h2>Team activity</h2><span>{activity.length} events</span></div>
              <p className="muted-copy">Comments, notes, and invitations will appear here as your team collaborates.</p>
              {activity.slice(0, 5).map((event) => <div className="activity-row" key={event._id}><span className="activity-dot" /><span>{event.action}</span><time>{new Date(event.createdAt).toLocaleDateString()}</time></div>)}
            </section>
          ) : (
            <section className="empty-state" aria-label={`${activeView} preview`}>
              <div className="empty-state-icon" aria-hidden="true">✦</div>
              <h2>{`${activeView} starts here.`}</h2>
              <p>{`${activeView} will be connected in a later milestone.`}</p>
            </section>
          )}
        </main>
      </div>
      {showNewTask && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="new-task-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowNewTask(false); }}>
          <form className="task-modal" onSubmit={createTask}>
            <div className="modal-heading"><h2 id="new-task-title">New task</h2><button type="button" onClick={() => setShowNewTask(false)} aria-label="Close new task dialog">×</button></div>
            <label>Task title<input name="title" autoFocus placeholder="What needs to move forward?" /></label>
            <label>Priority<select name="priority" defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
            <button className="primary-button" type="submit">Create task</button>
          </form>
        </div>
      )}
      {selectedTask && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="task-detail-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedTask(null); }}>
          <form className="task-modal task-detail-modal" onSubmit={updateTaskDetails}>
            <div className="modal-heading"><div><p className="modal-kicker">Task details</p><h2 id="task-detail-title">Edit task</h2></div><button type="button" onClick={() => setSelectedTask(null)} aria-label="Close task details">×</button></div>
            <label>Title<input name="title" defaultValue={selectedTask.title} required maxLength={200} /></label>
            <label>Description<textarea name="description" defaultValue={selectedTask.description} maxLength={2000} rows={4} /></label>
            <div className="detail-form-grid">
              <label>Status<select name="status" defaultValue={selectedTask.status}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="blocked">Blocked</option><option value="done">Done</option></select></label>
              <label>Priority<select name="priority" defaultValue={selectedTask.priority}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
            </div>
            <label>Due date<input name="dueDate" type="date" defaultValue={selectedTask.dueDate?.slice(0, 10) ?? ""} /></label>
            <label>Next action<input name="nextAction" defaultValue={selectedTask.nextAction ?? ""} maxLength={500} placeholder="What should happen next?" /></label>
            <label>Blocked reason<textarea name="blockedReason" defaultValue={selectedTask.blockedReason ?? ""} maxLength={500} rows={3} placeholder="What is holding this up?" /></label>
            {taskError && <p className="error-message" role="alert">{taskError}</p>}
            <button className="primary-button" type="submit" disabled={taskSaving}>{taskSaving ? "Saving..." : "Save changes"}</button>
          </form>
        </div>
      )}
    </div>
  );
}

const root = document.getElementById("root")!;
createRoot(root).render(
  <StrictMode>
    {window.location.pathname === "/app" ? <App /> : <LandingPage />}
  </StrictMode>
);
