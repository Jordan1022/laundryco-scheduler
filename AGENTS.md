# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Laundry Co. Shift Scheduler — a single Next.js 14 (App Router) application with PostgreSQL (Drizzle ORM), NextAuth.js credential auth, and Tailwind CSS / shadcn/ui styling.

### Services

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| Next.js dev server | `npm run dev` | 3000 | Main application |
| PostgreSQL | system service (`sudo pg_ctlcluster 16 main start`) | 5432 | Must be running before dev server |

### Environment variables

Create `.env.local` in the project root with:
- `DATABASE_URL` — PostgreSQL connection string (e.g. `postgresql://ubuntu:devpass@localhost:5432/laundryco`)
- `NEXTAUTH_SECRET` — any string for JWT signing
- `NEXTAUTH_URL` — `http://localhost:3000`

Drizzle-kit does **not** load `.env.local` automatically. When running `npm run db:push` or other drizzle-kit commands, prefix with `DATABASE_URL=...` or export it first.

### Database setup

1. Start PostgreSQL: `sudo pg_ctlcluster 16 main start`
2. Push schema: `DATABASE_URL="postgresql://ubuntu:devpass@localhost:5432/laundryco" npm run db:push`
3. Seed admin user: `DATABASE_URL="postgresql://ubuntu:devpass@localhost:5432/laundryco" npm run create-user`
   - Default credentials: `admin@laundryco.com` / `password123`

### Lint / Test / Dev

- **Lint**: `npm run lint` (requires `.eslintrc.json` — uses `next/core-web-vitals`)
- **Dev**: `npm run dev` (starts on port 3000)
- **No automated test suite** exists in this repo; manual testing via the browser is the primary verification method.

### Gotchas

- The ESLint config file (`.eslintrc.json`) is not present in the original repo. `next lint` will prompt interactively without it. The setup branch adds one.
- Twilio SDK is listed in `package.json` but is **not used** in any application code — no Twilio credentials are needed.
