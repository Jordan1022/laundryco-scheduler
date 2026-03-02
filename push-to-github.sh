#!/bin/bash
# push-to-github.sh - Initialize this project repo and print push steps

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

echo "Preparing Laundry Co. Scheduler for GitHub..."

if [ ! -d .git ]; then
  git init
fi

git add .

if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  git commit -m "Initial commit: Laundry Co. Employee Shift Scheduler"
else
  echo "Repository already has commits; skipping initial commit."
fi

echo ""
echo "Local repo is ready."
echo ""
echo "Next steps:"
echo "1. Create a new GitHub repository named 'laundryco-scheduler'"
echo "2. Run:"
echo "   git remote add origin https://github.com/<your-username>/laundryco-scheduler.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "Environment variables:"
echo "  Required:"
echo "    DATABASE_URL"
echo "    NEXTAUTH_SECRET"
echo "    NEXTAUTH_URL"
echo "    APP_BASE_URL"
echo "  Notifications:"
echo "    RESEND_API_KEY"
echo "    RESEND_FROM_EMAIL"
echo "  Browser push (optional):"
echo "    NEXT_PUBLIC_VAPID_PUBLIC_KEY"
echo "    VAPID_PUBLIC_KEY"
echo "    VAPID_PRIVATE_KEY"
echo "    VAPID_SUBJECT"
