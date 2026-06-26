#!/bin/bash
set -e

# Load environment variables from .env.local
if [ ! -f .env.local ]; then
  echo "❌ Error: .env.local not found"
  exit 1
fi

set -a
source .env.local
set +a

echo "🔐 Updating Wrangler secrets..."

# Function to set secret safely
set_secret() {
  local key=$1
  local value=$2
  
  if [ -z "$value" ]; then
    echo "⚠️  Skipping $key (empty value)"
    return
  fi
  
  echo "$value" | npx wrangler secret put "$key" > /dev/null 2>&1
  echo "✅ $key updated"
}

# Set all secrets
set_secret "SUPABASE_URL" "$SUPABASE_URL"
set_secret "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY"
set_secret "SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY"
set_secret "DEEPSEEK_API_KEY" "$DEEPSEEK_API_KEY"
set_secret "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET"

echo ""
echo "✨ All secrets updated!"
echo "Now run: npm run deploy"
