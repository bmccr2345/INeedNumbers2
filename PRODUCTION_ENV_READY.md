# Production .env Files - Ready to Copy

## Backend .env (agent-financials.emergent.host)

```bash
# ===================================
# CRITICAL - URLS & CORS
# ===================================
NODE_ENV=production
FRONTEND_URL=https://ineednumbers.com
BACKEND_URL=https://agent-financials.emergent.host
CORS_ORIGINS=https://ineednumbers.com

# ===================================
# DATABASE (KEEP AS-IS)
# ===================================
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database

# ===================================
# SECURITY SECRETS (GENERATE NEW!)
# ===================================
# Generate with: openssl rand -base64 48
JWT_SECRET_KEY=YOUR_NEW_JWT_SECRET_HERE_MINIMUM_32_CHARACTERS
CSRF_SECRET_KEY=YOUR_NEW_CSRF_SECRET_HERE_MINIMUM_32_CHARACTERS

# ===================================
# STRIPE (USE LIVE KEYS)
# ===================================
STRIPE_API_KEY=sk_live_YOUR_LIVE_KEY
STRIPE_PUBLIC_KEY=pk_live_YOUR_LIVE_KEY
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
STRIPE_PRICE_STARTER_MONTHLY=price_YOUR_STARTER_PRICE_ID
STRIPE_PRICE_PRO_MONTHLY=price_YOUR_PRO_PRICE_ID

# ===================================
# OPENAI / AI COACH (CURRENT VALUES)
# ===================================
OPENAI_API_KEY=sk-proj-YOUR_OPENAI_API_KEY_HERE
OPENAI_MODEL=gpt-4o-mini
AI_COACH_MAX_TOKENS=800
AI_COACH_TEMPERATURE=0.2
AI_COACH_RATE_LIMIT_PER_MIN=15
AI_CACHE_TTL_SECONDS=300
AI_COACH_ENABLED=true

# ===================================
# REDIS (REQUIRED FOR PRODUCTION)
# ===================================
REDIS_URL=redis://localhost:6379
# If using Redis Cloud/remote, use: redis://username:password@host:port
REDIS_PASSWORD=
REDIS_DB=0

# ===================================
# S3 STORAGE (REQUIRED FOR UPLOADS)
# ===================================
STORAGE_DRIVER=s3
S3_REGION=us-east-2
S3_BUCKET=inn-branding-production
S3_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_HERE
S3_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_KEY_HERE
S3_ENDPOINT_URL=

# ===================================
# FILE UPLOAD LIMITS
# ===================================
ASSET_MAX_MB=5
ALLOWED_MIME=image/png,image/jpeg,image/svg+xml,image/webp
MAX_JSON_BODY_KB=256

# ===================================
# SECURITY SETTINGS
# ===================================
COOKIE_SECURE=true
COOKIE_SAMESITE=none
DEBUG=false
LOG_LEVEL=INFO

# ===================================
# RATE LIMITING
# ===================================
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=3600

# ===================================
# OPTIONAL SERVICES
# ===================================
HEALTH_CHECK_ENABLED=true
SENTRY_DSN=
LOG_FILE=
EMERGENT_LLM_KEY=sk-emergent-913Cb5203F3E6666d9
```

---

## Frontend .env (ineednumbers.com)

```bash
REACT_APP_BACKEND_URL=https://agent-financials.emergent.host
REACT_APP_ASSETS_URL=https://customer-assets.emergentagent.com
REACT_APP_ENABLE_VISUAL_EDITS=false
```

---

## Quick Setup Commands

```bash
# 1. Generate JWT Secret
openssl rand -base64 48

# 2. Generate CSRF Secret  
openssl rand -base64 48

# 3. After updating .env files
sudo supervisorctl restart backend
sudo supervisorctl restart frontend

# 4. Test health
curl https://agent-financials.emergent.host/health

# 5. Test login
curl -X POST https://agent-financials.emergent.host/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://ineednumbers.com" \
  -d '{"email":"test@example.com","password":"password"}'
```

---

## What You MUST Fill In

1. **JWT_SECRET_KEY** - Generate with `openssl rand -base64 48`
2. **CSRF_SECRET_KEY** - Generate with `openssl rand -base64 48`
3. **STRIPE_API_KEY** - Get from Stripe Dashboard (live mode)
4. **STRIPE_PUBLIC_KEY** - Get from Stripe Dashboard (live mode)
5. **STRIPE_WEBHOOK_SECRET** - Get from Stripe Webhook settings
6. **STRIPE_PRICE_STARTER_MONTHLY** - Your Stripe price ID
7. **STRIPE_PRICE_PRO_MONTHLY** - Your Stripe price ID
8. **S3_ACCESS_KEY_ID** - Get from AWS IAM Console
9. **S3_SECRET_ACCESS_KEY** - Get from AWS IAM Console

Everything else can stay as shown.

---

## Important Notes

- ⚠️ **JWT_SECRET_KEY**: If you change this, all users must re-login
- ⚠️ **Redis**: Install if not present: `sudo apt install redis-server`
- ⚠️ **S3**: Uploads won't work without valid AWS credentials
- ✅ **OPENAI_API_KEY**: Your current key is already in the file above
