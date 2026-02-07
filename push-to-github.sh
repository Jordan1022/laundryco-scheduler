#!/bin/bash
# push-to-github.sh - Create repo and push Laundry Co. Scheduler

set -e

echo "🧺 Preparing Laundry Co. Scheduler for GitHub..."

# Initialize git
cd laundryco-scheduler
git init
git add .
git commit -m "Initial commit: Laundry Co. Employee Shift Scheduler"

echo ""
echo "✅ Local repo ready."
echo ""
echo "Next steps manually:"
echo "1. Go to https://github.com/new"
echo "2. Create repo named 'laundryco-scheduler' (private recommended)"
echo "3. Run these commands:"
echo ""
echo "   git remote add origin https://github.com/your-username/laundryco-scheduler.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "4. Deploy to Vercel:"
echo "   vercel --prod"
echo ""
echo "Your scheduler will be live at your custom subdomain."
echo ""
echo "Environment variables needed:"
echo "   DATABASE_URL"
echo "   NEXTAUTH_SECRET"
echo "   NEXTAUTH_URL"
echo "   TWILIO_ACCOUNT_SID"
echo "   TWILIO_AUTH_TOKEN"
echo "   TWILIO_PHONE_NUMBER"
echo ""
echo "Need help? I'm here."