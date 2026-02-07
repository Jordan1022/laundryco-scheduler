# Laundry Co. Shift Scheduler

Modern employee shift‑scheduling app for Laundry Co.  
Managers create shifts, assign employees; employees view schedules, request time off/swap.  
SMS notifications via Twilio.

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
- **Manager admin**: Dashboard, bulk actions, approval workflows
- **SMS notifications**: Twilio integration for shift reminders/updates
- **Role‑based access**: Employee, Manager, Admin

## Tech Stack

- **Next.js 15** – App Router, React Server Components
- **Tailwind CSS** – Styling
- **shadcn/ui** – Component library
- **PostgreSQL** – Vercel Postgres
- **Drizzle ORM** – Database queries/migrations
- **NextAuth.js** – Authentication
- **Twilio** – SMS notifications

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
TWILIO_ACCOUNT_SID="..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+1234567890"
```

## Deployment

```bash
npm run build
vercel --prod
```

Set up custom domain in Vercel dashboard.

## License

Proprietary – Laundry Co.