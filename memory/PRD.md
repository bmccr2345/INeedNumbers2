# I Need Numbers - Product Requirements Document

---

## ⚠️ MANDATORY BUILD & DEPLOYMENT RULES — NEVER SKIP ⚠️

### Frontend Changes (anything under /app/frontend/src/)
After making ANY frontend changes, you MUST run:
```bash
cd /app/frontend && yarn build
```
This compiles React source files into the production bundle at `/app/frontend/build/`. The production site serves from that build folder, NOT from raw source files. **If you skip this step, no frontend changes will be visible in production after deployment.**

### Backend Changes (server.py, templates, config)
After making backend changes, restart the backend process:
```bash
sudo supervisorctl restart backend
```

### Before Declaring Deployment Ready, ALWAYS Confirm:
1. ✅ Frontend changes → `yarn build` ran successfully (no errors)
2. ✅ Backend changes → backend process restarted
3. ✅ Verify build output: `ls -la /app/frontend/build/static/js/`

**NEVER assume editing source files is enough. Source edits without a build are INVISIBLE in production.**

---

## Original Problem Statement
Build a real estate agent productivity platform with financial calculators, P&L tracking, AI coaching, and mobile app (Capacitor iOS) support.

## User Personas
- Real estate agents tracking income, expenses, and deals
- Real estate investors analyzing property deals
- Mobile users accessing calculators via iOS app

## Core Requirements
1. Financial calculators (Investor Deal Generator, Commission Split, Seller Net Sheet, Home Affordability, Closing Date)
2. P&L tracker with deal management
3. AI Coach with contextual analysis for different calculator types
4. Dashboard with activity tracking and goal setting
5. Mobile app support via Capacitor for iOS
6. Agent branding on PDF reports

---

## What's Been Implemented

### Session: March 29, 2026

#### Agent Branding for PDF Reports (COMPLETE)
- Added `team` field to BrandAgent model
- Created `fetch_asset_as_base64()` helper for S3/local image fetching
- Created `build_branding_data()` helper for building branding dict
- Enabled branding in all 5 PDF generation endpoints
- Updated all 5 PDF templates with dynamic colors and agent branding block
- Added `credentials: 'include'` to all frontend PDF fetch calls
- Added Team Name field to BrandingProfilePage.js

#### UI/UX Fixes
- Removed "Free" badge on desktop for Investor Deal Generator
- Removed "Cash on Cash" card from AI Coach modal
- Fixed AI Coach authentication (now uses Clerk getToken())
- Fixed Mobile Add Deal form scroll issue (pb-32)
- Fixed Mobile Add Expense modal (full rewrite with recurring support)
- Fixed Clerk login flicker (guarded redirects on /auth/* paths)
- Updated deprecated Clerk props (afterSignInUrl → fallbackRedirectUrl)
- Fixed Closing Date PDF milestone ordering (Under Contract → Due Diligence → Home Inspection first)
- Removed Status column from Closing Date PDF
- Fixed Seller Net Sheet PDF header
- Added Save button to Closing Date Calculator
- Fixed View Timeline button to pass ID in URL
- Added GET/DELETE endpoints for closing-date calculations

---

## Tech Stack
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + Python
- **Database**: MongoDB Atlas
- **Auth**: Clerk
- **Payments**: Stripe
- **Mobile**: Capacitor (iOS)
- **AI**: OpenAI GPT-4o-mini via Emergent LLM Key
- **PDF**: WeasyPrint

---

## Prioritized Backlog

### P0 (Critical)
- None currently

### P1 (High Priority)
- Deploy accumulated fixes to production
- Test PDF branding with complete brand profile

### P2 (Medium Priority)
- Populate `/features/*` pages with final screenshots
- Refactor `server.py` into smaller domain-specific router files
- Deploy separate `ops-frontend` admin application

### P3 (Low Priority)
- Reinstate stricter CORS policy on backend (currently `*`)
- Investigate race condition in axios interceptor (`AuthContext.js`)

---

## Key Files Reference

### Backend
- `/app/backend/server.py` - Main API server (contains PDF generation, branding helpers)
- `/app/backend/templates/*.html` - PDF report templates

### Frontend
- `/app/frontend/src/pages/BrandingProfilePage.js` - Agent branding settings
- `/app/frontend/src/pages/ClosingDateCalculator.js` - Closing date tool
- `/app/frontend/src/pages/FreeCalculator.js` - Investor deal generator
- `/app/frontend/src/components/mobile/MobileAddExpenseModal.js` - Mobile expense form
- `/app/frontend/src/contexts/AuthContext.js` - Clerk auth wrapper

---

## Known Issues
- **Intermittent MongoDB Atlas connectivity** - SSL/auth errors in preview environment (infrastructure issue)

---

## 3rd Party Integrations
- Clerk (Authentication)
- Stripe (Payments)
- MongoDB Atlas (Database)
- OpenAI (AI Coach)
- WeasyPrint (PDF Generation)
- Capacitor (Native iOS/Android)
- AWS S3 (Asset Storage)
