# Relay

Relay is a momentum-aware project management workspace for small teams.
It helps teams see which work is blocked, overdue, stale, or missing a clear
next action—then gives them the context needed to move it forward.

The product combines a calm Forest & Chalk interface with workspace-scoped
task management, deterministic focus signals, authentication, collaboration
data, and operational insights.

## What Relay provides

- Public product landing page at `/`
- Authenticated workspace at `/app`
- Registration and sign-in
- Workspace membership and tenant isolation
- Searchable project board with task statuses and priorities
- Focus Queue for blocked, overdue, stale, and directionless tasks
- Task detail editing for descriptions, due dates, priorities, next actions,
  and blocked reasons
- Workspace insights and recent activity
- Collaboration API foundations for notes, comments, invitations, and activity
- Health and database-readiness endpoints
- Responsive, keyboard-friendly interface

## Architecture

Relay is a monorepo managed with npm workspaces:

```text
relay/
├── frontend/                 React + TypeScript + Vite client
│   ├── src/main.tsx          Landing page and authenticated workspace UI
│   ├── src/styles.css        Forest & Chalk design system
│   └── vite.config.ts        Dev server and local API proxy
├── backend/                  Node.js + Express API
│   ├── src/app.js            Express middleware and public API setup
│   ├── src/server.js         Local server entry point
│   ├── src/runtime.js        Serverless-compatible application factory
│   ├── src/auth.js           JWT authentication and workspace authorization
│   ├── src/task-model.js     Mongoose task schema
│   ├── src/task-routes.js    Task CRUD and validation
│   ├── src/momentum.js       Deterministic focus-signal rules
│   └── test/                 Node test runner coverage
├── api/index.mjs             Vercel serverless API entry point
├── vercel.json               Single-project Vercel routing
└── package.json              Root workspace scripts
```

### Request flow

```text
Browser
  │
  ├── Vite dev proxy ────────> Express API ────────> MongoDB Atlas
  │
  └── Vercel same-origin ────> /api serverless entry
                                  │
                                  └───────────────> MongoDB Atlas
```

The backend scopes protected data by the authenticated user's workspace
membership. Task, focus, collaboration, and insight requests require a valid
JWT and workspace authorization.

## Local development

### Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- MongoDB locally or a MongoDB Atlas database

### Setup

```bash
git clone https://github.com/YOUR_USERNAME/relay.git
cd relay
npm install
cp .env.example .env
```

Update `.env` with a real database connection and a strong secret:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/relay
CLIENT_ORIGIN=http://localhost:5174
JWT_SECRET=replace-with-a-random-secret-at-least-32-characters-long
```

Start the application:

```bash
npm run dev
```

Open:

- Frontend: http://localhost:5174
- API: http://localhost:3000
- API health: http://localhost:3000/api/health
- API readiness: http://localhost:3000/api/readiness

## Commands

Run these from the repository root:

```bash
npm run dev       # Start frontend and backend together
npm test          # Run backend tests
npm run build     # Create the production frontend build
npm start         # Start the backend production server
```

## API surface

### Public

```text
GET  /api/health
GET  /api/readiness
POST /api/account/register
POST /api/account/signin
```

### Authenticated and workspace-scoped

```text
GET    /api/tasks
POST   /api/tasks
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
GET    /api/focus
GET    /api/insights
GET    /api/collaboration/activity
GET    /api/collaboration/notes
POST   /api/collaboration/notes
GET    /api/collaboration/tasks/:taskId/comments
POST   /api/collaboration/tasks/:taskId/comments
POST   /api/collaboration/invitations
```

Protected requests use:

```text
Authorization: Bearer <token>
x-workspace-id: <workspace-id>
```

## Deployment on Vercel

Relay supports a single Vercel project. Vercel serves the Vite frontend and
routes `/api/*` to the Express serverless function in `api/index.mjs`.

1. Push this repository to GitHub.
2. Go to https://vercel.com/new and import the repository.
3. Keep the project root at the repository root.
4. Add these Production environment variables:

   ```text
   MONGODB_URI=your MongoDB Atlas connection string
   JWT_SECRET=your random secret with at least 32 characters
   CLIENT_ORIGIN=https://your-project.vercel.app
   ```

5. Leave `VITE_API_URL` unset because the deployed frontend uses same-origin
   `/api` requests.
6. Deploy and verify:

   ```text
   https://your-project.vercel.app/api/health
   https://your-project.vercel.app/api/readiness
   ```

In MongoDB Atlas, configure Network Access so the Vercel deployment can connect.
For an initial prototype, `0.0.0.0/0` is commonly used; restrict database access
further when your hosting/network setup supports stable outbound IPs.

## Deployment on Render

The repository includes `render.yaml` for the backend API. Render's Blueprint
schema does not provision the Vite static site here, so create the frontend as a
separate Render Static Site:

- Build command: `npm ci && npm run build --workspace frontend`
- Publish directory: `frontend/dist`
- Frontend variable: `VITE_API_URL=https://your-api.onrender.com`
- Backend variable: `CLIENT_ORIGIN=https://your-frontend.onrender.com`

## Security and operational notes

- `.env` is ignored and must never be committed.
- `JWT_SECRET` must be at least 32 characters in deployed environments.
- CORS is restricted using `CLIENT_ORIGIN`.
- JSON request bodies are limited to 100 KB.
- Authentication attempts are rate-limited.
- Baseline security response headers are enabled.
- MongoDB readiness is exposed separately from process health.
- Authentication currently uses browser local storage for the access token.
  HTTP-only secure cookies are recommended before handling sensitive production
  data at scale.

## Testing and quality

The CI workflow runs:

```bash
npm ci
npm test
npm run build
```

Before deploying, verify registration, sign-in, task creation, task detail
editing, Focus Queue behavior, workspace isolation, and mobile layouts.

## License

This project is currently distributed without a published open-source license.
