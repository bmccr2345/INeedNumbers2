# 🚀 I Need Numbers - Production Environment Variables Guide

## 📋 Overview
This guide provides the **EXACT** environment variables needed for your production deployment.

**Production Setup:**
- **Frontend Domain**: `https://ineednumbers.com`
- **Backend Domain**: `https://agent-financials.emergent.host`
- **Database**: MongoDB (test_database with 5 users)

---

## 🔧 Backend Environment Variables (`/app/backend/.env`)

### ✅ CRITICAL - MUST CHANGE FOR PRODUCTION

```bash
# ===================================
# ENVIRONMENT & DEPLOYMENT
# ===================================
NODE_ENV=production
# ⚠️ MUST be "production" for proper security settings

DEBUG=false
# ⚠️ MUST be false in production

LOG_LEVEL=INFO
# Options: DEBUG, INFO, WARNING, ERROR, CRITICAL

# ===================================
# URLS & CORS (CRITICAL FOR AUTH)
# ===================================
FRONTEND_URL=https://ineednumbers.com
# ⚠️ MUST match your actual frontend domain

BACKEND_URL=https://agent-financials.emergent.host
# ⚠️ MUST match your actual backend domain

CORS_ORIGINS=https://ineednumbers.com
# ⚠️ MUST include ONLY your production frontend domain
# Multiple origins: https://ineednumbers.com,https://www.ineednumbers.com

# ===================================
# DATABASE (CONFIRMED WORKING)
# ===================================
MONGO_URL=mongodb://localhost:27017
# ✅ Current setup - uses local MongoDB

DB_NAME=test_database
# ✅ CONFIRMED - Contains your 5 production users
# ⚠️ DO NOT CHANGE unless you've migrated data

# ===================================
# SECURITY - CRITICAL SECRETS
# ===================================
JWT_SECRET_KEY=<CHANGE_THIS_32_CHAR_MINIMUM_SECRET>
# ⚠️ CRITICAL: Generate new secret for production
# ⚠️ If you change this, ALL users must re-login
# Generate: openssl rand -base64 48

CSRF_SECRET_KEY=<CHANGE_THIS_32_CHAR_MINIMUM_SECRET>
# ⚠️ CRITICAL: Generate new secret for production
# Generate: openssl rand -base64 48

# ===================================
# STRIPE (SWITCH TO LIVE KEYS)
# ===================================
STRIPE_API_KEY=sk_live_XXXXXXXXXXXXXXXXXXXXXXXX
# ⚠️ CHANGE FROM sk_test_ TO sk_live_ for production

STRIPE_PUBLIC_KEY=pk_live_XXXXXXXXXXXXXXXXXXXXXXXX
# ⚠️ CHANGE FROM pk_test_ TO pk_live_ for production

STRIPE_SECRET_KEY=sk_live_XXXXXXXXXXXXXXXXXXXXXXXX
# ⚠️ Usually same as STRIPE_API_KEY

STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXXXXX
# ⚠️ Get from Stripe dashboard for production webhook endpoint

STRIPE_PRICE_STARTER_MONTHLY=price_XXXXXXXXXXXXXXXX
# ⚠️ Use production price IDs from Stripe

STRIPE_PRICE_PRO_MONTHLY=price_XXXXXXXXXXXXXXXX
# ⚠️ Use production price IDs from Stripe

# ===================================
# OPENAI / AI COACH
# ===================================
OPENAI_API_KEY=sk-proj-XXXXXXXXXXXXXXXXXXXXXXXX
# ✅ Your current key (appears valid)
# ⚠️ Monitor usage limits and quotas

OPENAI_MODEL=gpt-4o-mini
# ✅ Cost-effective model choice

AI_COACH_ENABLED=true
# ✅ Enable AI Coach for PRO users

AI_COACH_MAX_TOKENS=800
# ✅ Reasonable token limit

AI_COACH_TEMPERATURE=0.2
# ✅ Low temperature for consistent responses

AI_COACH_RATE_LIMIT_PER_MIN=15
# ✅ Prevents abuse

AI_CACHE_TTL_SECONDS=300
# ✅ 5-minute cache reduces API costs

# ===================================
# REDIS (REQUIRED FOR PRODUCTION)
# ===================================
REDIS_URL=redis://localhost:6379
# ⚠️ REQUIRED in production for:
#    - Rate limiting
#    - Session management
#    - Cache management
# If using Redis Cloud: redis://username:password@host:port

REDIS_PASSWORD=<your_redis_password>
# Only if Redis requires authentication

REDIS_DB=0
# Redis database number (0-15)

# ===================================
# S3 STORAGE (REQUIRED FOR UPLOADS)
# ===================================
STORAGE_DRIVER=s3
# ✅ Using S3 for file storage

S3_REGION=us-east-2
# ✅ Your configured region

S3_BUCKET=inn-branding-staging-bj-0922
# ⚠️ Consider using production bucket name
# Recommended: inn-branding-production

S3_ACCESS_KEY_ID=<YOUR_AWS_ACCESS_KEY>
# ⚠️ REQUIRED for branding uploads to work
# ⚠️ Get from AWS IAM console

S3_SECRET_ACCESS_KEY=<YOUR_AWS_SECRET_KEY>
# ⚠️ REQUIRED for branding uploads to work
# ⚠️ Get from AWS IAM console

S3_ENDPOINT_URL=
# Leave empty for standard AWS S3
# Use only if using S3-compatible service

# ===================================
# FILE UPLOAD LIMITS
# ===================================
ASSET_MAX_MB=5
# ✅ Max file size for uploads

ALLOWED_MIME=image/png,image/jpeg,image/svg+xml,image/webp
# ✅ Allowed file types

MAX_JSON_BODY_KB=256
# ✅ Prevents large payload attacks

# ===================================
# SECURITY SETTINGS
# ===================================
COOKIE_SECURE=true
# ✅ MUST be true for HTTPS (production)

COOKIE_SAMESITE=none
# ✅ REQUIRED for cross-domain (ineednumbers.com -> agent-financials.emergent.host)

# ===================================
# RATE LIMITING
# ===================================
RATE_LIMIT_ENABLED=true
# ✅ Prevents abuse

RATE_LIMIT_REQUESTS=100
# Requests allowed per window

RATE_LIMIT_WINDOW=3600
# Window in seconds (3600 = 1 hour)

# ===================================
# LOGGING (OPTIONAL)
# ===================================
LOG_FILE=/var/log/ineednumbers/app.log
# Optional: Log to file

LOG_MAX_BYTES=10485760
# Max log file size (10MB)

LOG_BACKUP_COUNT=5
# Number of backup log files

# ===================================
# OPTIONAL SERVICES
# ===================================
SENTRY_DSN=
# Optional: Error tracking with Sentry

HEALTH_CHECK_ENABLED=true
# ✅ Required for production monitoring

EMERGENT_LLM_KEY=sk-emergent-913Cb5203F3E6666d9
# ✅ Legacy fallback key (can keep)
```

---

## 🌐 Frontend Environment Variables (`/app/frontend/.env`)

### ✅ CRITICAL - PRODUCTION FRONTEND

```bash
# ===================================
# BACKEND CONNECTION (CRITICAL)
# ===================================
REACT_APP_BACKEND_URL=https://agent-financials.emergent.host
# ⚠️ MUST match your production backend domain
# ⚠️ NO TRAILING SLASH

# ===================================
# ASSETS & CDN
# ===================================
REACT_APP_ASSETS_URL=https://customer-assets.emergentagent.com
# ✅ Emergent assets CDN

# ===================================
# WEBPACK DEV SERVER (ONLY FOR PREVIEW)
# ===================================
WDS_SOCKET_PORT=443
# ⚠️ Can remove in production build

# ===================================
# FEATURE FLAGS
# ===================================
REACT_APP_ENABLE_VISUAL_EDITS=false
# ✅ Disable for production
```

---

## 🔐 Security Checklist

### Before Going Live:

- [ ] **JWT_SECRET_KEY** - Changed from dev default
- [ ] **CSRF_SECRET_KEY** - Changed from dev default
- [ ] **NODE_ENV** - Set to "production"
- [ ] **DEBUG** - Set to false
- [ ] **CORS_ORIGINS** - Contains ONLY production frontend
- [ ] **STRIPE Keys** - Switched from test to live keys
- [ ] **S3 Credentials** - Added AWS keys for uploads
- [ ] **REDIS_URL** - Configured Redis for production
- [ ] **COOKIE_SECURE** - Set to true
- [ ] **Database** - Confirmed DB_NAME=test_database has your users

---

## 🚨 Common Issues After Deployment

### Issue 1: "Authentication required" errors
**Cause:** CORS_ORIGINS doesn't include frontend domain  
**Fix:** Add `https://ineednumbers.com` to CORS_ORIGINS

### Issue 2: Cookies not working
**Cause:** Wrong SameSite setting for cross-domain  
**Fix:** Code already updated to use `samesite=none`

### Issue 3: "Failed to load cap configuration"
**Cause:** Database connection issues or wrong DB_NAME  
**Fix:** Verify MONGO_URL and DB_NAME=test_database

### Issue 4: All users logged out
**Cause:** JWT_SECRET_KEY was changed  
**Fix:** Expected behavior - users must re-login with new secret

### Issue 5: File uploads not working
**Cause:** Missing S3 credentials  
**Fix:** Add S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY

---

## 📊 Environment Comparison

| Variable | Development | Production |
|----------|------------|------------|
| NODE_ENV | development | production |
| FRONTEND_URL | http://localhost:3000 | https://ineednumbers.com |
| BACKEND_URL | http://localhost:8001 | https://agent-financials.emergent.host |
| CORS_ORIGINS | localhost:3000 | https://ineednumbers.com |
| STRIPE_API_KEY | sk_test_... | sk_live_... |
| REDIS_URL | Optional | **REQUIRED** |
| S3 Keys | Optional | **REQUIRED** |
| COOKIE_SECURE | false | true |
| DEBUG | true | false |

---

## 🧪 Testing Production Config

After updating environment variables:

```bash
# 1. Restart backend
sudo supervisorctl restart backend

# 2. Check backend logs
tail -f /var/log/supervisor/backend.*.log

# 3. Test health endpoint
curl https://agent-financials.emergent.host/health

# 4. Test authentication
curl -X POST https://agent-financials.emergent.host/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'

# 5. Check for CORS headers
curl -I https://agent-financials.emergent.host/api/auth/me \
  -H "Origin: https://ineednumbers.com"
```

---

## 📞 Need Help?

If issues persist after updating these variables:

1. Check backend logs: `tail -100 /var/log/supervisor/backend.*.log`
2. Check MongoDB connection: `mongosh test_database --eval "db.users.countDocuments()"`
3. Verify CORS headers in browser DevTools Network tab
4. Confirm cookies are being set with `Secure; SameSite=None`

---

## 🎯 Quick Start Commands

```bash
# Generate secure secrets
openssl rand -base64 48  # For JWT_SECRET_KEY
openssl rand -base64 48  # For CSRF_SECRET_KEY

# Test MongoDB connection
mongosh test_database --eval "db.users.find().limit(1)"

# Restart services after env changes
sudo supervisorctl restart backend
sudo supervisorctl restart frontend

# Check service status
sudo supervisorctl status
```

---

**Last Updated:** After fixing cross-domain authentication issue (SameSite=none)  
**Production Status:** ✅ Code updated, environment variables need updating  
**Critical Path:** Update .env files → Restart services → Test authentication
