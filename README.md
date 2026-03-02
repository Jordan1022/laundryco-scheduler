# Laundry Co. Shift Scheduler

Modern employee shift‑scheduling app for Laundry Co.  
Managers create shifts, assign employees; employees view schedules, request time off/swap.  
In-app + email notifications via Resend.

**Domain:** `schedule.laundryco.example.com`  
**Brand:** Navy blue (`#1e3a8a`) + white

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- **Calendar views**: Daily, weekly, monthly (30‑min intervals)
- **Shift management**: Create, assign, edit, delete shifts
- **Employee portal**: View shifts, request time off, swap shifts
- **Notification center**: In-app alerts for shift updates and request decisions
- **Browser push notifications**: Service-worker push alerts for supported web browsers
- **Manager admin**: Dashboard, bulk actions, approval workflows
- **Email notifications**: Resend-powered transactional alerts
- **Role‑based access**: Employee, Manager, Admin

## Tech Stack

- **Next.js 15** – App Router, React Server Components
- **Tailwind CSS** – Styling
- **shadcn/ui** – Component library
- **PostgreSQL** – Vercel Postgres
- **Drizzle ORM** – Database queries/migrations
- **NextAuth.js** – Authentication
- **Resend** – Email notifications
- **Web Push (VAPID)** – Browser push delivery

## Database Setup

1. Create Vercel Postgres database
2. Set `DATABASE_URL` environment variable
3. Run migrations:
   ```bash
   npm run db:push
   ```

## Environment Variables

Create `.env.local`:
```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="Laundry Co Scheduler <noreply@updates.your-domain.com>"
APP_BASE_URL="http://localhost:3000"
NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
VAPID_SUBJECT="mailto:admin@laundryco.com"
```

Generate VAPID keys:
```bash
npm run generate:vapid
```

## Deployment

```bash
npm run build
vercel --prod
```

Set up custom domain in Vercel dashboard.

## License

Proprietary – Laundry Co.
