#!/bin/bash
# Run this script to set Cloudflare Pages environment variables
# Requires: CLOUDFLARE_API_TOKEN env var set

PROJECT="tawala"

echo "Setting Cloudflare Pages secrets for project: $PROJECT"

# Add each secret (you'll be prompted for the value)
npx wrangler pages secret put NEXT_PUBLIC_SUPABASE_URL --project-name $PROJECT
npx wrangler pages secret put NEXT_PUBLIC_SUPABASE_ANON_KEY --project-name $PROJECT
npx wrangler pages secret put SUPABASE_SERVICE_ROLE_KEY --project-name $PROJECT
npx wrangler pages secret put GEMINI_API_KEY --project-name $PROJECT
npx wrangler pages secret put NVIDIA_API_KEY --project-name $PROJECT
npx wrangler pages secret put NEXT_PUBLIC_GOOGLE_CLIENT_ID --project-name $PROJECT
npx wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name $PROJECT

echo "Done! All secrets set."
