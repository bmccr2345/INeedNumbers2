# I Need Numbers - Product Requirements Document

## Original Problem Statement
Build a real estate agent productivity platform with financial calculators, P&L tracking, AI coaching, and mobile app (Capacitor iOS) support.

## User Personas
- Real estate agents tracking income, expenses, and deals
- Real estate investors analyzing property deals
- Mobile users accessing calculators via iOS app

## Core Requirements
1. Financial calculators (Investor Deal Generator, Commission Split, Seller Net Sheet, Home Affordability)
2. P&L tracker with deal management
3. AI Coach with contextual analysis for different calculator types
4. Dashboard with activity tracking and goal setting
5. Mobile app support via Capacitor for iOS

---

## What's Been Implemented (Current Session - March 26, 2026)

### Desktop vs Mobile UI Optimizations
- Hid Quick Actions, All Tools, and specific tool tiles on desktop using `lg:hidden`
- Moved Financial Progress metrics directly onto Desktop Dashboard
- Fixed iOS Capacitor PDF downloads with GET endpoints and `window.open()`

### Investor Deal Generator Fixes
- **"Free" badge hidden on desktop** - Now only shows on mobile (`lg:hidden`)
- **"Cash on Cash" card removed** from Fairy AI Coach modal (user request)
- **AI Coach authentication fixed** - Now uses Clerk's `getToken()` instead of legacy localStorage token

### Commission Split & Seller Net Sheet Panels
- Wired to live backend CRUD endpoints
- History panels load from DB instead of mock data
- View/Delete functionality working

### Authentication & Auth Flicker Fix
- Fixed Clerk Auth login flicker with route guards in `AuthContext.js`
- Removed legacy cookie auth fallback - now strictly Clerk-only

### P&L Updates
- Fixed deal updates (changed PUT to PATCH)
- Fixed NaN formatting on Cash on Cash metric

---

## Tech Stack
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + Python
- **Database**: MongoDB Atlas
- **Auth**: Clerk
- **Payments**: Stripe
- **Mobile**: Capacitor (iOS)
- **AI**: OpenAI GPT-4o-mini via Emergent LLM Key

---

## Prioritized Backlog

### P0 (Critical)
- None currently

### P1 (High Priority)
- Deploy accumulated fixes to production
- Populate `/features/*` pages with final screenshots

### P2 (Medium Priority)
- Refactor `server.py` into smaller domain-specific router files
- Deploy separate `ops-frontend` admin application
- Investigate race condition in axios interceptor (`AuthContext.js`)

### P3 (Low Priority)
- Reinstate stricter CORS policy on backend (currently `*`)

---

## Key Files Reference
- `/app/frontend/src/pages/FreeCalculator.js` - Investor Deal Generator
- `/app/frontend/src/components/InvestorAICoach.js` - AI Coach modal for investor analysis
- `/app/backend/app/routes/ai_coach.py` - AI Coach backend logic
- `/app/frontend/src/contexts/AuthContext.js` - Clerk auth wrapper

---

## Known Issues
- **Intermittent MongoDB Atlas connectivity** - SSL/auth errors in preview environment (infrastructure issue)
