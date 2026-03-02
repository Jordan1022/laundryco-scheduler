#!/bin/bash
# deploy.sh - One-command setup & deploy for Laundry Co. Scheduler

set -e

echo "🧺 Laundry Co. Scheduler - Deployment Script"
echo "============================================"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing via nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 20
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Set up database
echo "🗄️  Setting up database..."
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not set. Please set it before running migrations."
    echo "   Example: export DATABASE_URL='postgresql://...'"
    exit 1
fi

# Run Drizzle migrations
echo "🔄 Running database migrations..."
npm run db:push

# Build
echo "🏗️  Building..."
npm run build

# Check for Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Deploy
echo "🌍 Deploying to Vercel..."
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Set app environment variables in Vercel:"
echo "   - DATABASE_URL"
echo "   - NEXTAUTH_SECRET"
echo "   - NEXTAUTH_URL"
echo "   - APP_BASE_URL"
echo "   - RESEND_API_KEY"
echo "   - RESEND_FROM_EMAIL"
echo "   - NEXT_PUBLIC_VAPID_PUBLIC_KEY (optional)"
echo "   - VAPID_PUBLIC_KEY (optional)"
echo "   - VAPID_PRIVATE_KEY (optional)"
echo "   - VAPID_SUBJECT (optional)"
echo "2. Configure custom domain in Vercel dashboard"
echo "3. Invite first manager via the admin panel"
echo ""
echo "Need help? Check README.md or contact support."
