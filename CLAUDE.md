# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all dependencies (first time)
npm run install:all

# Development (run in separate terminals)
npm run server      # Backend on port 5001
npm run client      # Frontend on port 3000

# Production
npm run build       # Build React app
npm start           # Serve built app from server
```

The React dev server proxies `/api/*` to `localhost:5001` (configured in `client/package.json`).

## Architecture

**Backend** (`server/`) — Express + Node.js 24 built-in `node:sqlite` (no native bindings needed):
- `server.js` — entry point, mounts all routes
- `database.js` — initializes SQLite via `node:sqlite` (`DatabaseSync`), creates all tables on startup
- `middleware/auth.js` — JWT verification middleware
- `routes/auth.js` — POST `/api/auth/register`, `/api/auth/login`
- `routes/leads.js` — CRUD for leads (filtered by `user_id`)
- `routes/ventes.js` — CRUD + `/stats` endpoint (today/week/month totals, 7-day graph data)
- `routes/clients.js` — CRUD for clients
- `routes/notes.js` — GET/PUT single note per user (upsert)

All data is scoped by `user_id` — each user only sees their own records.

**Frontend** (`client/src/`) — React 18, React Router v6, Chart.js:
- `contexts/AuthContext.js` — JWT stored in localStorage, sets `axios` default auth header
- `App.js` — route definitions; `PrivateRoute` redirects to `/login` when unauthenticated
- `components/Layout.js` — sticky navbar with hamburger menu for mobile
- `pages/Dashboard.js` — welcome banner + live clock + stats cards + quick nav links
- `pages/LeadTracker.js` — full CRUD table with status filter and search
- `pages/Ventes.js` — stats row, 7-day bar chart (Chart.js), sales table with CRUD
- `pages/Clients.js` — card grid view with total purchases computed server-side
- `pages/Notes.js` — auto-save textarea (1.5s debounce)

**Shared CSS** in `components/Layout.css` — CSS variables for the rose/beige/gold palette, shared card/button/badge/modal/form/table styles used across all pages.

## Key Technical Notes

- SQLite uses Node's built-in `node:sqlite` (`DatabaseSync`) — requires Node ≥ 22. No compilation needed.
- JWT secret defaults to `sales_tracker_secret_2024`; set `JWT_SECRET` env var in production.
- Stats endpoint computes `clients_fermes` by counting distinct `description` values in `ventes` — a proxy until a proper client-sale join is implemented.
- Server runs on port 5001 (not 5000, which macOS AirPlay occupies).
