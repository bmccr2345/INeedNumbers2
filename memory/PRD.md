# I Need Numbers - Product Requirements Document

**Last Updated:** April 2, 2026

---

## Recent Changes (April 2026)

### Round 2 Bug Fixes - COMPLETED ✅ (April 2, 2026)
- **ClosingDatePanel.js**: Removed fake download feature (generated text files), changed Eye icon to Edit icon, made timeline titles clickable
- **InvestorPanel.js**: Fixed confirm → window.confirm, removed "Actions" column header (now blank), property name clickable for edit
- **FreeCalculator.js**: Added location.state editDeal loading, fixed footer spacing (py-8 → pt-8 pb-16)

### Investor Analysis Panel - 4 Bug Fixes - COMPLETED ✅ (April 2, 2026)
- Removed "Created" header column from desktop table
- Added useLocation to FreeCalculator.js to populate form when editing deals
- Made property names clickable in the investor panel
- Replaced mockDashboardAPI.investor.delete() with pure axios.delete() calls
- Removed all download PDF functionality from the panel

### Homepage Redesign v2 - COMPLETED ✅
- Created new homepage at `/app/frontend/src/pages/HomePageRedesign.jsx` and `/app/frontend/src/pages/HomePageRedesign.css`
- Features: Dark green gradient hero, interactive dashboard mockup with animated cursor, AI Coach spotlight section, 8 "pain point" feature sections, mobile app banner, pricing card, trust section, final CTA
- Preserves existing Navigation bar and Footer components
- Implements Intersection Observer for scroll-triggered fade-up animations
- Routes `/` to new homepage, old landing page available at `/landing-old`
- iOS app restrictions remain in place (pricing/signup hidden on Capacitor)

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

## 🚨 PRE-DEPLOYMENT CHECKLIST — MANDATORY BEFORE EVERY DEPLOY 🚨

Before deploying ANY frontend changes, complete ALL steps below:

### Step 1: Clean Build
```bash
cd /app/frontend
rm -rf build node_modules/.cache
yarn build
```

### Step 2: Verify CSS File Size
Check that the CSS bundle is the expected size (~16KB):
```bash
ls -la /app/frontend/build/static/css/
```
If CSS file is abnormally small (<5KB), the build is corrupted. DO NOT DEPLOY.

### Step 3: Visual Verification in Preview
Take screenshots of BOTH:
1. **Homepage** (`/`) — Must show proper layout, navigation, hero section with green gradient
2. **The page you changed** — Verify your changes look correct

### Step 4: Verify No Regressions
Check that:
- [ ] Navigation bar appears once (not duplicated)
- [ ] All fonts are loading correctly
- [ ] Green gradient hero is visible on homepage
- [ ] Buttons and interactive elements have proper styling

### Step 5: Only Then Deploy
If ALL above checks pass, the build is safe to deploy.

**If ANY visual issues appear in preview, DO NOT DEPLOY. Investigate and fix first.**

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

### Session: April 1, 2026

#### Settings Page API Integration (COMPLETE)
- Settings.js now saves/loads branding data to/from the API instead of localStorage only
- Added auth context import and API calls with `credentials: 'include'`
- Maps flat Settings fields to nested API structure for POST
- Maps nested API response to flat Settings fields for GET
- Falls back to localStorage for unauthenticated users

#### Login MFA Double Email Fix (COMPLETE)
- Connected ClerkProvider to React Router with `routerPush`/`routerReplace` props
- Service worker now excludes `/auth/*` routes from caching
- Removed `/` from STATIC_ASSETS to prevent stale HTML during auth flows
- Conditional StrictMode (development only) to prevent double mount issues

### Session: March 31, 2026

#### Branding Profile Bug Fix (COMPLETE)
- Fixed POST /api/brand/profile hanging issue
- Backend: Added proper None handling when `get_brand_profile` returns None
- Frontend: Fixed debouncing - was creating multiple concurrent requests on every keystroke
- Frontend: Added `useRef` for proper debounce timer with cleanup on unmount
- Frontend: Removed orphaned `Cookies.remove()` calls (import was already removed)
- Increased debounce delay from 1s to 1.5s to reduce request frequency

#### Blog Page Theme Update (COMPLETE)
- Updated BlogListPage.jsx hero section to use homepage green gradient (`#1a5c3a` → `#2FA163` → `#3db574`)
- Replaced dark gray theme (`gray-900` → `gray-800`) with brand-consistent green gradient
- Updated text colors for contrast (white/80 for links, white/90 for subtext)

### Session: March 29, 2026

#### Blog Feature (COMPLETE)
- Full Blog architecture with React frontend and FastAPI backend
- JSON-based posts stored in `/app/frontend/src/data/blog/posts/`
- Auto-generated index via `/app/scripts/generate-blog-index.js`
- SEO support via react-helmet-async
- View tracking and email subscription via MongoDB
- Backend routes: `POST /api/blog/view/{slug}`, `POST /api/blog/subscribe`, `GET /api/blog/popular`

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
- Test Blog email subscription end-to-end (saving to MongoDB)
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
- `/app/frontend/src/pages/BlogListPage.jsx` - Blog listing page
- `/app/frontend/src/pages/BlogPostPage.jsx` - Individual blog post page
- `/app/frontend/src/components/blog/*` - Blog components (BlogCard, BlogHeader, EmailCapture, etc.)
- `/app/frontend/src/data/blog/` - Blog JSON data and index
- `/app/frontend/src/pages/ClosingDateCalculator.js` - Closing date tool
- `/app/frontend/src/pages/FreeCalculator.js` - Investor deal generator
- `/app/frontend/src/components/mobile/MobileAddExpenseModal.js` - Mobile expense form
- `/app/frontend/src/contexts/AuthContext.js` - Clerk auth wrapper
- `/app/frontend/nginx.conf` - Cache-control headers for Cloudflare

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
