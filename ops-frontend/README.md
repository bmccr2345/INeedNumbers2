# Ops Frontend - Admin Command Center

This is a separate React application for the Admin Command Center (ops.ineednumbers.com).

## Purpose
- Internal-only observability dashboard
- Separated from customer-facing SPA for security and bundle size
- Requires Clerk admin role to access

## Environment Variables
- `REACT_APP_CLERK_PUBLISHABLE_KEY` - Same Clerk project as main app
- `REACT_APP_BACKEND_URL` - Production API URL

## Build & Deploy
- Only deploy to ops.ineednumbers.com
- Uses same backend as main app
- Requires NODE_ENV=production for backend admin routes
