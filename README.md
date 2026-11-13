# Relay

Relay is a momentum-aware project management workspace.

## Development

1. Copy `.env.example` to `.env` and adjust the MongoDB connection if needed.
2. Install dependencies with `npm install`.
3. Run the frontend and backend with `npm run dev`.

The API listens on `http://localhost:3000` by default:

- `GET /api/health` reports that the process is running.
- `GET /api/readiness` reports whether MongoDB is connected.

The Vite frontend listens on `http://localhost:5174` because port 5173 is used by
another local project on this machine.

## Foundation status

Milestone 0 establishes the repository, development scripts, environment configuration,
health/readiness endpoints, and MongoDB connection lifecycle. Product features are
intentionally not included until the foundation is verified.

Milestone 1 establishes the initial Forest & Chalk design system and responsive
application shell. Navigation is intentionally local until application routes and
persisted product data are introduced.

Milestone 2 adds persisted task CRUD through the API and a searchable three-column
project board. The Vite development server proxies `/api` requests to the backend.

Milestones 5–7 add account registration/sign-in, workspace membership authorization,
workspace-scoped collaboration endpoints, activity/notes/comments/invitations, and
workspace-scoped insights. Set a strong `JWT_SECRET` before starting the API.

The public marketing landing page is available at `/`. The authenticated application
shell is available at `/app`. The landing page uses the Forest & Chalk palette and a
minimal editorial product demonstration. The GhostFibers effect remains an optional
future enhancement and is intentionally not part of the authenticated application shell.

## Deployment configuration

Required backend variables:

- `MONGODB_URI`: MongoDB connection string.
- `JWT_SECRET`: long, random secret used to sign access tokens.
- `PORT`: optional HTTP port, default `3000`.
- `CLIENT_ORIGIN`: production frontend origin, or a comma-separated list of allowed
  origins when frontend and API are deployed separately.

The API refuses to start without `MONGODB_URI` or `JWT_SECRET` when authentication
is used. Never commit `.env` or use the example secret in a deployed environment.

### Phase 1 deployment checklist

1. Provision MongoDB Atlas and allow only the deployment provider's outbound access.
2. Set `MONGODB_URI`, a random `JWT_SECRET` of at least 32 characters, `CLIENT_ORIGIN`,
   and the provider-provided `PORT`.
3. Build the frontend with `npm run build`; serve `frontend/dist` from the frontend
   host and run the API with `npm start` from the repository root.
4. Configure the frontend host to proxy `/api` to the backend, or use the same origin.
5. Verify `/api/health`, `/api/readiness`, registration, sign-in, task creation, and
   task detail editing before sharing the URL.

The API limits JSON request bodies to 100 KB, applies baseline security headers,
restricts CORS to `CLIENT_ORIGIN`, and rate-limits registration/sign-in attempts.
Authentication tokens are currently stored in browser local storage; use HTTPS and
plan an HTTP-only cookie migration before handling sensitive production data.

### Render deployment

This repository includes a [`render.yaml`](./render.yaml) Blueprint for two services:
`relay-api` (Node web service) and `relay-frontend` (static site).

1. Push the repository to GitHub and create a new Render Blueprint from that repository.
2. Set `MONGODB_URI` and `JWT_SECRET` on `relay-api`.
3. Deploy `relay-api`, copy its URL, and set `CLIENT_ORIGIN` on `relay-api` to the
   frontend URL (for example `https://relay-frontend.onrender.com`).
4. Set `VITE_API_URL` on `relay-frontend` to the API URL (for example
   `https://relay-api.onrender.com`), then redeploy the frontend.
5. Confirm the API health check, frontend landing page, registration, sign-in, and
   task editing.

Render's free web services can sleep after inactivity. Use a paid instance or an
external uptime monitor if the application needs consistently low-latency requests.

CI runs `npm ci`, the backend test suite, and the frontend production build on every
push and pull request.
