# I Need Numbers - Product Requirements Document

## Original Problem Statement
I Need Numbers is an AI-powered business system for real estate agents. The platform provides tools for tracking deals, commissions, P&L, and an AI Coach for daily business insights.

## Recent Major Work: Homepage & Pricing Redesign (Feb 2026)

### Design Direction
- **Tone**: Minimal luxury, modern, confident
- **Mobile-first design** (real estate agents use phones)
- **Primary color**: Brand green (#2FA163)
- **Accent**: Subtle gold (#D4AF37) for micro-details
- **Typography**: Playfair Display (serif) for headlines + Inter (sans) for body
- **Positioning**: AI-powered business system, not a tool library

### Homepage Structure (/)
1. **Hero Section (Pain First)**
   - Full-width green gradient background with cinematic agent image
   - Rotating pain points carousel (5 items, 4-second cycle)
   - "Start My AI Coach" CTA
   - Mobile hamburger menu

2. **Solution Mapping Section**
   - Desktop: Two-column (pain tabs left, solution card right)
   - Mobile: Accordion with embedded screenshots
   - Maps each pain point to its solution

3. **All Tools Section**
   - Deal & Client Tools group
   - Business Intelligence group
   - No Free/Pro badges - single tier only
   - "Everything Included. $49.99/month" CTA

4. **Built by Agents Section**
   - AI-generated lifestyle image
   - Emotional copy: "We built what we wished existed..."
   - CTA

### Pricing Page (/pricing)
- Single tier: $49.99/month
- "One Plan. Everything Included."
- "No tiers. No upsells. No confusion."
- "Cancel anytime. No contracts."
- Two organized feature lists

## Tech Stack
- **Frontend**: React, Tailwind CSS, CRACO
- **Backend**: FastAPI, Python
- **Database**: MongoDB Atlas
- **Auth**: Clerk (production keys configured)
- **Fonts**: Playfair Display, Inter

## Key Files Modified
- `/app/frontend/src/pages/LandingPage.js` - Complete redesign
- `/app/frontend/src/pages/PricingPage.js` - Single tier redesign
- `/app/frontend/src/App.js` - Updated routing (/ now shows LandingPage)
- `/app/frontend/public/index.html` - Added Playfair Display font
- `/app/frontend/src/index.css` - Added custom animations

## Critical Architecture Files
- `/app/frontend/src/config/api.js` - **SINGLE SOURCE OF TRUTH** for backend API URL. Uses runtime hostname detection. DO NOT use `process.env.REACT_APP_BACKEND_URL` directly anywhere else in the codebase.
- `/app/frontend/public/sw.js` - Service worker with cache-busting (update version on deployments)

## Previous Issues Fixed
1. **Clerk Production Auth**: Changed hardcoded dev URL (apparent-dragon-65.accounts.dev) to production URL (clerk.ineednumbers.com)
2. **Blank Production Page**: Removed `.env.production` that was overriding deployment panel values
3. **Mobile Accordion Crash**: Added bounds check for activeSolution index
4. **AI Coach & Deal Add Auth Bug (Mar 2026)**: Fixed JWKS URL mismatch in `/app/backend/app/clerk_auth.py` - was using dev Clerk instance (`apparent-dragon-65.clerk.accounts.dev`) instead of production (`clerk.ineednumbers.com`). This caused JWT validation to fail for all authenticated API calls.
5. **Mobile Deals Display Bug (Mar 5, 2026)**: Fixed 4 bugs in PnLPanel.js mobile card view:
   - `handleDeleteDeal()` → `deleteDeal()` (function didn't exist)
   - `commission_percentage` → `commission_percent` (wrong property name)
   - `your_split` → `split_percent` (wrong property name)
   - `team_brokerage_split` → `team_brokerage_split_percent` (wrong property name)
6. **Commission Cap Breaking Add Deal (Mar 5, 2026)**: ROOT CAUSE - Onboarding service was NOT saving `cap_period_type` field which is required by CapConfiguration model. Fixed by:
   - `/app/backend/app/services/onboarding_service.py` - Now saves `cap_period_type: "calendar_year"` and proper datetime serialization
   - `/app/backend/server.py` GET `/cap-tracker/config` - Now auto-repairs broken data on read (adds missing `cap_period_type`, removes invalid fields)
   - `/app/backend/server.py` GET `/cap-tracker/progress` - Added validation for required fields with helpful error message
   - `/app/backend/server.py` POST `/cap-tracker/repair` - New endpoint to manually repair broken cap configs
   - Added auth headers to all PnLPanel.js API calls
   - Added `.limit()` to MongoDB queries for performance
7. **DateTime Timezone Bug (Mar 6, 2026)**: Fixed "can't compare offset-naive and offset-aware datetimes" error by normalizing all datetime comparisons to timezone-naive in Add Deal and Cap Progress endpoints
8. **Desktop Reflection Logging Bug (Mar 6, 2026)**: Fixed `ActionTrackerPanel.js` - was calling undefined `getHeaders()` function. Added:
   - Import `useAuth` from `@clerk/clerk-react` to get `getToken`
   - Defined async `getHeaders()` function that properly gets auth token
   - Updated all fetch calls to await the async headers
   - Added `mood: null` to reflection payload to match backend model
9. **Commission Cap Percentage Display (Mar 6, 2026)**: Fixed floating point precision showing "9.58000000000002%" instead of "9.58%" via `formatPercentage()` with `.toFixed(2)`
10. **Desktop Account Dropdown (Mar 6, 2026)**: Simplified to: Profile & Billing, Support, Business Setup, Logout
11. **Double Email 2FA Bug (Mar 7, 2026)**: Fixed Clerk sending 2 emails during 2FA login. ROOT CAUSE - custom `navigate` prop in ClerkProvider conflicted with Clerk's internal navigation. Fixed by removing the `navigate` prop; `signInUrl`/`signUpUrl` props already prevent external redirects.
12. **Production Outage - Wrong Backend URL (Mar 13, 2026)**: RECURRING ISSUE (2nd occurrence). Frontend `.env` had `REACT_APP_BACKEND_URL` pointing to preview URL (`backend-url-debug.preview.emergentagent.com`) instead of production (`https://ineednumbers.com`). Fixed by correcting `.env`, rebuilding frontend, and verifying the correct URL was embedded in the final JS bundle via grep.
13. **PERMANENT FIX: API Routing Refactor (Mar 17, 2026)**: ROOT CAUSE - The recurring production outages were caused by build-time environment variable injection (`process.env.REACT_APP_BACKEND_URL`). The platform frequently reset the `.env` file to preview URLs before builds, baking the wrong URL into production JS bundles. **SOLUTION**: Created a runtime-based API configuration system:
    - **NEW FILE**: `/app/frontend/src/config/api.js` - Single source of truth for backend URL
    - Uses `window.location.hostname` at **runtime** (not build time) to determine correct backend
    - Production domains (`ineednumbers.com`, `www.ineednumbers.com`) → `https://ineednumbers.com`
    - Mobile/Capacitor (`localhost`) → `https://ineednumbers.com`
    - Preview environments → Falls back to `.env` or production
    - **Safety guard**: Throws fatal error if preview backend detected in production
    - Refactored **45+ frontend files** to use the new centralized config
    - Updated service worker (`sw.js`) with cache-busting version numbers
    - Testing agent verified 100% success rate on all public pages

## Routes
- `/` - New redesigned landing page
- `/home-legacy` - Old homepage (preserved)
- `/pricing` - Single tier pricing
- `/auth/login` - Clerk login
- `/auth/register` - Clerk registration
- `/dashboard` - User dashboard (requires auth)

## Screenshots Used
- AI Coach: IMG_2414.jpeg
- P&L/Expenses: IMG_2418.jpeg
- Action Tracker: IMG_2419.jpeg
- Calculators: IMG_2420.jpeg
- Commission Cap: IMG_2421.jpeg

## Generated Images
- Hero: frustrated_agent_hero.png (AI-generated)
- Built by Agents: built_by_agents_hero.png (AI-generated)

## Apple App Store Guideline 3.1.1 Compliance (Mar 2026)

### Overview
Implemented frontend restrictions to prevent iOS Capacitor app users from signing up or purchasing subscriptions within the app. This complies with Apple's requirement that subscriptions purchased inside apps must use Apple IAP. Instead of implementing IAP, we block signup/payment in the iOS app and direct users to subscribe via the website.

### iOS Detection
Simple Capacitor runtime check:
```javascript
export const isIOSApp = () => {
  return window.Capacitor?.getPlatform?.() === "ios";
};
```

### Files Modified
| File | Changes |
|------|---------|
| `/app/frontend/src/utils/platform.js` | **NEW** - `isIOSApp()` detection utility |
| `/app/frontend/src/components/IOSRestrictionMessage.js` | **NEW** - Reusable restriction message component |
| `/app/frontend/src/pages/LandingPage.js` | Hide CTAs and pricing links when `isIOSApp()` |
| `/app/frontend/src/pages/RegisterPage.js` | Show restriction message instead of signup |
| `/app/frontend/src/pages/PricingPage.js` | Show restriction message instead of pricing |
| `/app/frontend/src/pages/CompleteSubscriptionPage.js` | Show restriction message instead of checkout |
| `/app/frontend/src/pages/SubscriptionSetupPage.js` | Show restriction message instead of setup |
| `/app/frontend/src/pages/MyAccountPage.js` | Hide upgrade/billing buttons |
| `/app/frontend/src/components/ClerkPricingTable.js` | Disable paid plan subscribe buttons |

### Platform Scope
- **Capacitor iOS app**: Signup/payment blocked, shows restriction message
- **Desktop browsers**: Full functionality (unchanged)
- **Mobile Safari**: Full functionality (unchanged)
- **Android browsers**: Full functionality (unchanged)

### Restriction Message
Shows: "Subscription Required - To create an account and subscribe, please visit ineednumbers.com on your computer or mobile browser." with "Sign In" button for existing users.

### Routes Blocked on iOS
- `/auth/register`
- `/pricing`
- `/complete-subscription`
- `/subscription-setup`

## Test Report
All tests passing - see `/app/test_reports/iteration_1.json`




## Development Rules (IMPORTANT)

### Debug-First Policy
**NEVER apply code fixes without explicit user permission.** When a bug is reported:
1. Ask what information is needed to debug
2. Investigate and explain the root cause
3. Propose the fix and explain what it will change
4. Wait for user approval before implementing

This rule applies to ALL bug fixes and changes - no exceptions.
