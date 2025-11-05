# Clerk Billing + Stripe Integration - Complete Implementation Guide

## 🎉 Implementation Status: COMPLETE

The complete Clerk Billing + Stripe subscription management system has been successfully implemented and integrated into your FastAPI backend and React frontend.

---

## 📋 What Was Implemented

### Backend (FastAPI)

#### New Modules Created

**1. `/app/backend/app/clerk_billing.py`**
- `ClerkBillingClient`: Handles all Clerk REST API interactions
- Methods:
  - `get_user()`: Fetch user data from Clerk API
  - `update_user_metadata()`: Update public/private metadata
  - `get_user_subscriptions()`: Fetch subscription data
  - `extract_plan_from_metadata()`: Parse plan from Clerk metadata
- Plan mapping between Clerk keys and internal plan IDs

**2. `/app/backend/app/stripe_billing.py`**
- `StripeBillingClient`: Handles Stripe billing operations
- Methods:
  - `create_billing_portal_session()`: Generate Stripe Customer Portal URL
  - `create_checkout_session()`: Create Stripe Checkout for new subscriptions
  - `verify_webhook_signature()`: Validate Stripe webhook events
  - `get_subscription()`: Retrieve subscription details from Stripe

#### New API Endpoints

All endpoints are prefixed with `/api/clerk/`:

**1. `POST /api/clerk/assign-plan`**
- Assigns selected plan to user after signup
- Updates Clerk public metadata
- Syncs with MongoDB
- Request:
  ```json
  {
    "clerk_user_id": "user_xxx",
    "plan": "starter" | "pro" | "free"
  }
  ```
- Response:
  ```json
  {
    "success": true,
    "plan": "starter",
    "requires_payment": true
  }
  ```

**2. `GET /api/clerk/subscription-status`**
- Returns current subscription status for user
- Query param: `clerk_user_id`
- Response:
  ```json
  {
    "clerk_user_id": "user_xxx",
    "email": "user@example.com",
    "plan": "STARTER",
    "subscription_status": "inactive",
    "requires_payment": true
  }
  ```

**3. `POST /api/clerk/billing-portal`**
- Creates Stripe Customer Portal session
- Requires existing Stripe customer ID
- Request:
  ```json
  {
    "clerk_user_id": "user_xxx",
    "return_url": "https://yourdomain.com/dashboard"
  }
  ```
- Response:
  ```json
  {
    "success": true,
    "url": "https://billing.stripe.com/session/xxx"
  }
  ```

**4. `POST /api/clerk/create-checkout`**
- Creates Stripe Checkout session for new subscription
- Request:
  ```json
  {
    "clerk_user_id": "user_xxx",
    "plan": "starter" | "pro",
    "success_url": "https://yourdomain.com/dashboard",
    "cancel_url": "https://yourdomain.com/subscription-setup"
  }
  ```
- Response:
  ```json
  {
    "success": true,
    "url": "https://checkout.stripe.com/pay/xxx",
    "plan": "starter"
  }
  ```

**5. `POST /api/clerk/webhook`**
- Handles Stripe webhook events
- Validates webhook signature
- Supported events:
  - `checkout.session.completed`: Updates plan after successful payment
  - `customer.subscription.created`: Records new subscription
  - `customer.subscription.updated`: Updates subscription status
  - `customer.subscription.deleted`: Downgrades to FREE plan

### Frontend (React)

#### Updated Components

**1. `/app/frontend/src/components/ClerkPricingTable.js`**
- Enhanced `handleSubscribe()` function
- Stores selected plan in localStorage
- Redirects to `/auth/register?plan=<plan>` for non-authenticated users
- Redirects to `/subscription-setup` for authenticated users selecting paid plans

**2. `/app/frontend/src/pages/RegisterPage.js`**
- Reads plan from URL query params or localStorage
- Displays selected plan during signup
- After signup completion:
  - Calls `/api/clerk/assign-plan` to assign plan
  - Redirects Free users to `/dashboard`
  - Redirects Starter/Pro users to `/subscription-setup`
- Shows loading state during plan assignment

#### New Components

**3. `/app/frontend/src/pages/SubscriptionSetupPage.js`** (NEW)
- Post-signup subscription completion page
- Features:
  - Fetches subscription status from backend
  - Displays selected plan details and pricing
  - Shows included features
  - "Complete Payment & Start Trial" button
  - Creates Stripe Checkout session
  - Redirects to Stripe payment page
  - "Skip for now" option (downgrades to FREE)
- Auto-redirects to dashboard if subscription is already active

**4. Updated `/app/frontend/src/App.js`**
- Added route: `/subscription-setup` → `<SubscriptionSetupPage />`
- Imported `SubscriptionSetupPage` component

---

## 🔧 Configuration

### Backend Environment Variables

Added to `/app/backend/.env`:
```bash
# Clerk Configuration
CLERK_SECRET_KEY="sk_test_4tu9nuCJQYBKXLQt3kaxjnc9xUfjljhkaj0EUwHJxM"

# Existing Stripe Configuration
STRIPE_SECRET_KEY="sk_test_51S8kbH0OkW2f3TP8Xdw3vrAwLwNe7wuXDTDCRmlw8eEeTFKKx4o4f5JYMokyf5Pr1DRkXaZ4A8vLRK5beSH6AaRO00goJ4rLbK"
STRIPE_WEBHOOK_SECRET="whsec_test_placeholder"  # ⚠️ UPDATE THIS
STRIPE_PRICE_STARTER_MONTHLY="price_1S8ocz0OkW2f3TP8sggLpERD"
STRIPE_PRICE_PRO_MONTHLY="price_1S8ocz0OkW2f3TP8gflJmdy3"
```

### Frontend Environment Variables

Already configured in `/app/frontend/.env`:
```bash
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_YXBwYXJlbnQtZHJhZ29uLTY1LmNsZXJrLmFjY291bnRzLmRldiQ
REACT_APP_BACKEND_URL=https://clerk-migrate-fix.preview.emergentagent.com
```

### Backend Config

Updated `/app/backend/config.py`:
- Added `CLERK_SECRET_KEY` field to Config class
- Field is required (uses `Field(...)`)

---

## 🚀 Complete User Flow

### For New Users (Signup Flow)

1. **Plan Selection**
   - User visits `/pricing`
   - Clicks on Starter or Pro plan
   - Plan is stored in localStorage
   - Redirected to `/auth/register?plan=starter`

2. **Signup**
   - User completes Clerk signup form
   - Selected plan is displayed during signup
   - After authentication succeeds:
     - Backend assigns plan via `/api/clerk/assign-plan`
     - Clerk metadata is updated
     - MongoDB record is synced

3. **Routing**
   - **Free Plan**: Direct to `/dashboard`
   - **Paid Plan**: Redirect to `/subscription-setup`

4. **Payment (Paid Plans Only)**
   - `/subscription-setup` page displays:
     - Selected plan details
     - Pricing and features
     - 30-day free trial notice
   - User clicks "Complete Payment & Start Trial"
   - Backend creates Stripe Checkout session
   - User redirected to Stripe payment page

5. **Post-Payment**
   - Stripe webhook fires: `checkout.session.completed`
   - Backend updates:
     - Clerk metadata: `subscription_status: "active"`
     - MongoDB: `plan: "STARTER"` or `"PRO"`
   - User redirected back to `/dashboard?checkout=success`

### For Existing Users

1. **Plan Upgrade/Downgrade**
   - User visits `/pricing`
   - Selects different plan
   - If authenticated, redirected to `/subscription-setup`
   - Can manage billing via Stripe Customer Portal

2. **Subscription Management**
   - User accesses billing portal (future implementation)
   - Can update payment method
   - Can cancel subscription
   - Webhook updates backend on changes

---

## 📊 Data Flow

### Plan Metadata Structure

**Clerk Public Metadata:**
```json
{
  "plan": "starter",  // or "pro", "free_user"
  "subscription_status": "active",  // or "inactive"
  "assigned_at": "2025-01-15T10:30:00Z"
}
```

**Clerk Private Metadata:**
```json
{
  "stripe_customer_id": "cus_xxx"
}
```

**MongoDB User Document:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "clerk_user_id": "user_xxx",
  "plan": "STARTER",  // or "PRO", "FREE"
  "stripe_customer_id": "cus_xxx",
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

### Plan Mapping

| User Selection | Clerk Metadata | MongoDB | Display Name |
|----------------|----------------|---------|--------------|
| `free` | `free_user` | `FREE` | Free |
| `starter` | `starter` | `STARTER` | Starter |
| `pro` | `pro` | `PRO` | Pro |

---

## 🧪 Testing Checklist

### Backend API Testing

Test each endpoint with curl:

```bash
# 1. Assign Plan
curl -X POST https://clerk-migrate-fix.preview.emergentagent.com/api/clerk/assign-plan \
  -H "Content-Type: application/json" \
  -d '{"clerk_user_id": "user_xxx", "plan": "starter"}'

# 2. Get Subscription Status
curl "https://clerk-migrate-fix.preview.emergentagent.com/api/clerk/subscription-status?clerk_user_id=user_xxx"

# 3. Create Checkout Session
curl -X POST https://clerk-migrate-fix.preview.emergentagent.com/api/clerk/create-checkout \
  -H "Content-Type: application/json" \
  -d '{
    "clerk_user_id": "user_xxx",
    "plan": "starter",
    "success_url": "https://yourdomain.com/dashboard",
    "cancel_url": "https://yourdomain.com/subscription-setup"
  }'
```

### Frontend Flow Testing

**Test Case 1: Free Plan Signup**
1. Visit `/pricing`
2. Click "Get Started" on Free plan
3. Complete signup
4. Verify redirect to `/dashboard`
5. Check plan in dashboard shows "Free"

**Test Case 2: Starter Plan Signup**
1. Visit `/pricing`
2. Click "Buy Now" on Starter plan
3. Verify localStorage has `selected_plan: "starter"`
4. Complete signup
5. Verify redirect to `/subscription-setup`
6. Verify plan details shown correctly
7. Click "Complete Payment & Start Trial"
8. Verify redirect to Stripe Checkout
9. Use test card: `4242 4242 4242 4242`
10. Complete payment
11. Verify redirect to `/dashboard?checkout=success`
12. Check plan shows "Starter"

**Test Case 3: Pro Plan Signup**
1. Same as Test Case 2, but select Pro plan
2. Verify pricing shows $49.99/month
3. Complete payment flow
4. Verify plan shows "Pro"

**Test Case 4: Skip Payment**
1. Select paid plan
2. Complete signup
3. On `/subscription-setup`, click "Skip for now"
4. Verify redirect to `/dashboard`
5. Verify plan downgraded to "Free"

### Stripe Webhook Testing

**Setup:**
1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Forward webhooks:
   ```bash
   stripe listen --forward-to https://clerk-migrate-fix.preview.emergentagent.com/api/clerk/webhook
   ```
3. Trigger test events:
   ```bash
   stripe trigger checkout.session.completed
   stripe trigger customer.subscription.updated
   stripe trigger customer.subscription.deleted
   ```

**Verify:**
- Check backend logs for webhook processing
- Check Clerk metadata updates
- Check MongoDB plan updates

---

## 🔐 Security Considerations

### Implemented Security Measures

1. **Webhook Signature Verification**
   - All Stripe webhooks are verified using `stripe.Webhook.construct_event()`
   - Prevents malicious webhook injection

2. **Server-Side Plan Assignment**
   - Plans are assigned via backend, not client-side
   - Prevents users from manually assigning paid plans

3. **Metadata Validation**
   - Plan values are validated against allowed list
   - Invalid plans are rejected with 400 error

4. **Private Metadata for Sensitive Data**
   - Stripe customer IDs stored in private metadata (not exposed to frontend)
   - Public metadata only contains plan and status

5. **HTTPS Enforcement**
   - All API calls use HTTPS
   - Webhook endpoints require HTTPS

### Security Best Practices

1. **Rotate Keys Regularly**
   - Update `CLERK_SECRET_KEY` every 90 days
   - Update `STRIPE_SECRET_KEY` on security events

2. **Monitor Webhook Logs**
   - Check for failed webhook deliveries
   - Alert on suspicious patterns

3. **Rate Limiting**
   - Implement rate limits on `/assign-plan` endpoint (future)
   - Prevent abuse of checkout session creation

4. **Audit Logs**
   - Log all plan changes
   - Track subscription events for compliance

---

## ⚠️ Important Notes

### Required Updates Before Production

1. **Update Stripe Webhook Secret**
   ```bash
   # Current value is placeholder
   STRIPE_WEBHOOK_SECRET="whsec_test_placeholder"
   
   # Get real value from Stripe Dashboard > Developers > Webhooks
   ```

2. **Configure Stripe Webhook Endpoint**
   - Go to Stripe Dashboard > Developers > Webhooks
   - Add endpoint: `https://yourdomain.com/api/clerk/webhook`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Copy webhook signing secret to `.env`

3. **Update Stripe Price IDs**
   - Verify `STRIPE_PRICE_STARTER_MONTHLY` is correct
   - Verify `STRIPE_PRICE_PRO_MONTHLY` is correct
   - These IDs must match your Stripe Product prices

4. **Configure Clerk Billing**
   - In Clerk Dashboard, enable Clerk Billing (if using Clerk's billing features)
   - OR use direct Stripe integration (current implementation)

### Known Limitations

1. **Trial Period Handling**
   - Current implementation mentions "30-day trial" in UI
   - Actual trial configuration must be set in Stripe Dashboard
   - Alternative: Configure trial in checkout session creation

2. **Subscription Cancellation**
   - Webhook handles `customer.subscription.deleted`
   - But no UI endpoint to cancel (uses Stripe Customer Portal)

3. **Proration on Upgrades**
   - Not currently handled
   - Stripe will handle proration automatically if configured

4. **Multiple Subscriptions**
   - Current implementation assumes one subscription per user
   - Additional logic needed for multiple subscriptions

---

## 🐛 Troubleshooting

### Backend Issues

**Problem: "CLERK_SECRET_KEY environment variable is required"**
- Solution: Verify `.env` file has `CLERK_SECRET_KEY`
- Restart backend: `sudo supervisorctl restart backend`

**Problem: "Failed to fetch user from Clerk"**
- Check Clerk Secret Key is valid
- Verify Clerk user ID format (starts with `user_`)
- Check network connectivity to `api.clerk.com`

**Problem: "Stripe price ID not configured"**
- Verify `STRIPE_PRICE_STARTER_MONTHLY` is set
- Verify `STRIPE_PRICE_PRO_MONTHLY` is set
- Get price IDs from Stripe Dashboard > Products

**Problem: "Webhook signature verification failed"**
- Update `STRIPE_WEBHOOK_SECRET` with correct value
- Get from Stripe Dashboard > Developers > Webhooks
- Must match webhook endpoint signing secret

### Frontend Issues

**Problem: Redirect loop after signup**
- Check browser console for errors
- Clear localStorage: `localStorage.clear()`
- Verify backend `/api/clerk/assign-plan` is accessible

**Problem: "Failed to create checkout session"**
- Verify Stripe is properly configured
- Check backend logs for error details
- Ensure user has valid email in Clerk

**Problem: Subscription status not updating**
- Check webhook delivery in Stripe Dashboard
- Verify webhook endpoint is reachable
- Check backend logs for webhook processing errors

---

## 📚 API Reference

### Plan Values

**Frontend → Backend (user selection):**
- `"free"` - Free plan
- `"starter"` - Starter plan ($19.99/month)
- `"pro"` - Pro plan ($49.99/month)

**Clerk Metadata (clerk_plan_key):**
- `"free_user"` - Free plan
- `"starter"` - Starter plan
- `"pro"` - Pro plan

**MongoDB (internal):**
- `"FREE"` - Free plan
- `"STARTER"` - Starter plan
- `"PRO"` - Pro plan

### Subscription Status Values

- `"active"` - Subscription is active and paid
- `"inactive"` - No active subscription
- `"trialing"` - In trial period
- `"past_due"` - Payment failed, grace period
- `"canceled"` - Subscription canceled
- `"unpaid"` - Payment failed, no grace period

---

## 🎯 Next Steps

### Immediate Actions

1. **Update Stripe Webhook Secret**
   - Get from Stripe Dashboard
   - Update in `/app/backend/.env`
   - Restart backend

2. **Test Complete Flow**
   - Follow testing checklist above
   - Use Stripe test cards
   - Verify all redirects work

3. **Configure Stripe Trial**
   - Set trial period in Stripe Dashboard
   - OR update checkout session creation code

### Future Enhancements

1. **Billing Portal Access**
   - Add "Manage Billing" button in dashboard
   - Use `/api/clerk/billing-portal` endpoint
   - Allow users to update payment method

2. **Usage Tracking**
   - Track deal creation count
   - Enforce plan limits (10 deals for Starter)
   - Show usage in dashboard

3. **Email Notifications**
   - Welcome email after signup
   - Payment confirmation email
   - Trial ending reminder (7 days before)
   - Payment failed notification

4. **Admin Dashboard**
   - View all subscriptions
   - See revenue metrics
   - Manual plan changes
   - Refund processing

5. **Proration Handling**
   - Allow mid-cycle upgrades
   - Calculate prorated amounts
   - Show preview before upgrade

---

## 📝 File Structure Summary

### Backend Files Created/Modified

```
/app/backend/
├── app/
│   ├── clerk_billing.py         [NEW] Clerk API client
│   └── stripe_billing.py        [NEW] Stripe API client
├── server.py                     [MODIFIED] Added 5 new endpoints
├── config.py                     [MODIFIED] Added CLERK_SECRET_KEY
└── .env                          [MODIFIED] Added CLERK_SECRET_KEY
```

### Frontend Files Created/Modified

```
/app/frontend/src/
├── components/
│   └── ClerkPricingTable.js     [MODIFIED] Enhanced plan selection
├── pages/
│   ├── RegisterPage.js          [MODIFIED] Plan assignment logic
│   └── SubscriptionSetupPage.js [NEW] Payment completion page
└── App.js                        [MODIFIED] Added subscription-setup route
```

---

## ✅ Implementation Complete

All components of the Clerk Billing + Stripe integration have been successfully implemented:

- ✅ Backend Clerk API integration
- ✅ Backend Stripe API integration  
- ✅ 5 new FastAPI endpoints
- ✅ Plan assignment logic
- ✅ Subscription status tracking
- ✅ Checkout session creation
- ✅ Webhook handling
- ✅ Frontend plan selection flow
- ✅ Post-signup routing
- ✅ Subscription setup page
- ✅ Environment configuration
- ✅ Error handling
- ✅ Loading states
- ✅ User feedback messages

**Status:** Ready for testing and deployment! 🚀
