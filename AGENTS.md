# Laundry Co. Shift Scheduler

Single Next.js 14 app (App Router) with PostgreSQL, Drizzle ORM, NextAuth.js credentials auth, Tailwind CSS + shadcn/ui.

## Cursor Cloud specific instructions

### Services

| Service | How to run |
|---|---|
| PostgreSQL | `sudo pg_ctlcluster 16 main start` (already installed on VM) |
| Next.js dev server | `npm run dev` (port 3000) |

### Database

- Connection: `DATABASE_URL="postgresql://laundryco:laundryco_dev@localhost:5432/laundryco_dev"`
- Push schema: `DATABASE_URL="..." npm run db:push`
- The `create-user` script uses `dotenv/config` which reads `.env` (not `.env.local`). Either set `DATABASE_URL` as an env var prefix or ensure `.env` exists alongside `.env.local`.

### Environment variables

Required env vars are in `.env.local` and `.env` (both contain the same values). Key required vars:
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — JWT signing secret (≥32 chars)
- `NEXTAUTH_URL` — App URL (`http://localhost:3000`)

Optional (degrade gracefully): `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, VAPID keys.

### Common commands

See `package.json` scripts. Key ones:
- `npm run dev` — start dev server
- `npm run lint` — ESLint
- `npm run db:push` — push Drizzle schema to PostgreSQL
- `npm run create-user -- <email> <password> <role> <name>` — seed a user

### Test user

Default admin: `admin@laundryco.com` / `password123` (role: admin).

### Gotchas

- The date-time picker component (`components/ui/date-time-picker.tsx`) uses `readOnly` and `pointer-events-none` on inputs. Calendar date clicks (not direct text entry) trigger shift creation from the dashboard.
- Drizzle Kit `db:push` requires `DATABASE_URL` as a shell env var since `drizzle.config.ts` reads `process.env.DATABASE_URL` directly (not from dotenv).
- No automated test suite exists in this codebase.
