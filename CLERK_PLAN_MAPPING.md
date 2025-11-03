# I Need Numbers - Clerk Plan Feature Mapping

## Overview
This document maps all features to their corresponding plans for integration with Clerk.dev's public metadata system.

---

## Plan Structure

### FREE (Default)
**Price**: $0/forever  
**Target Users**: New users, trying out calculators  
**Storage Limits**:
- Deals: 0 (cannot save)
- Portfolios: 0 (cannot create)
- Branding: false (no branded PDFs)

### STARTER
**Price**: $19/month  
**Target Users**: Individual agents starting to organize their business  
**Storage Limits**:
- Deals: 10 (can save up to 10 deals)
- Portfolios: 1 (can create 1 portfolio)
- Branding: true (can create branded PDFs)

### PRO
**Price**: $49/month  
**Target Users**: Professional agents with active businesses  
**Storage Limits**:
- Deals: -1 (unlimited)
- Portfolios: -1 (unlimited)
- Branding: true (can create branded PDFs)

---

## Feature Breakdown by Plan

### 🆓 FREE Plan Features

#### Calculators (Read-Only Access)
✅ **Commission Split Calculator**
- Calculate commission splits
- View results
- ❌ Cannot save or share

✅ **Seller Net Sheet Calculator**
- Estimate seller net proceeds
- Basic calculations
- ❌ Cannot save or share

✅ **Mortgage & Affordability Calculator**
- Calculate affordability
- Estimate monthly payments
- ❌ Cannot save or share

✅ **Closing Date Calculator**
- Calculate important dates
- Timeline visualization
- ❌ Cannot save or share

#### Account Features
✅ Create free account
✅ Basic profile management
❌ No data persistence
❌ No sharing capabilities
❌ No branded outputs

---

### 💼 STARTER Plan Features

#### Everything in FREE, Plus:

#### Deal Management
✅ **Save up to 10 deals**
- Store calculation results
- Access saved deals anytime
- Edit and update deals

✅ **Share deals with clients**
- Generate shareable links
- Client can view calculations
- Professional presentation

✅ **Basic portfolio (1 portfolio max)**
- Organize deals into a portfolio
- Track deals in one place

#### Reports & Branding
✅ **Branded PDF reports**
- Add your logo and colors
- Professional client-facing documents
- Custom branding profile

#### Actions Available
- `save_deal` ✅ (up to 10)
- `share_deal` ✅
- `branded_pdf` ✅
- `create_portfolio` ✅ (1 max)

---

### 🚀 PRO Plan Features

#### Everything in STARTER, Plus:

#### Unlimited Storage
✅ **Unlimited deals**
- Save as many deals as needed
- No storage restrictions
- Full deal history

✅ **Unlimited portfolios**
- Create multiple portfolios
- Organize by client, property type, etc.
- Advanced portfolio management

#### Business Intelligence
✅ **Agent P&L Tracker**
- Track income and expenses
- Business performance dashboard
- Commission tracking
- Expense categorization
- Monthly/yearly summaries

✅ **Financial Analytics**
- Profit & Loss statements
- Revenue vs. expenses charts
- Goal tracking and progress
- Financial forecasting

#### Advanced Reporting
✅ **Exportable reports (PDF/Excel)**
- Download P&L reports
- Export deal data
- Generate business summaries

✅ **5-year projections**
- Long-term financial planning
- Growth projections
- Business planning tools

#### Professional Features
✅ **Multi-brand profiles**
- Multiple branding profiles
- Switch between brands
- Team/brokerage options

✅ **URL prefill from listings**
- Auto-populate from MLS URLs
- Quick data entry
- Integration capabilities

✅ **Advanced customization**
- Detailed branding options
- Custom templates
- Professional outputs

#### Future Pro Features
✅ **Access to all future Pro features**
- New tools and calculators
- Advanced integrations
- Priority feature access

#### Actions Available
- `save_deal` ✅ (unlimited)
- `share_deal` ✅ (unlimited)
- `branded_pdf` ✅
- `create_portfolio` ✅ (unlimited)

---

## Clerk.dev Integration Strategy

### Public Metadata Structure

Store plan information in Clerk's user public metadata:

```javascript
{
  "plan": "FREE" | "STARTER" | "PRO",
  "plan_status": "active" | "trialing" | "cancelled" | "expired",
  "subscription_id": "stripe_subscription_id",
  "started_at": "2025-01-01T00:00:00Z",
  "expires_at": "2025-02-01T00:00:00Z" // null for FREE
}
```

### Private Metadata (Optional)

Store sensitive subscription data in private metadata:

```javascript
{
  "stripe_customer_id": "cus_xxx",
  "stripe_subscription_id": "sub_xxx",
  "billing_email": "user@example.com"
}
```

---

## Implementation Checklist

### Backend Changes Needed

- [ ] Create Clerk webhook handler for user creation
- [ ] Set default plan to "FREE" in public metadata
- [ ] Create endpoint to update plan after Stripe payment
- [ ] Update `canPerformAction()` to read from Clerk metadata
- [ ] Sync Clerk metadata with MongoDB user record

### Frontend Changes Needed

- [ ] Update AuthContext to read plan from `clerkUser.publicMetadata.plan`
- [ ] Update `getPlanLimits()` to use Clerk plan data
- [ ] Add plan upgrade flow with Stripe
- [ ] Display current plan in dashboard
- [ ] Add upgrade prompts for FREE users

### Stripe Integration

- [ ] Create Stripe products for STARTER and PRO
- [ ] Set up Stripe webhooks:
  - `checkout.session.completed` → Upgrade user plan
  - `customer.subscription.updated` → Update plan status
  - `customer.subscription.deleted` → Downgrade to FREE
- [ ] Update Clerk metadata after successful payment

---

## Plan Enforcement Logic

### Current Implementation (AuthContext.js)

```javascript
const getPlanLimits = (plan) => {
  switch (plan) {
    case 'STARTER':
      return { deals: 10, portfolios: 1, branding: true };
    case 'PRO':
      return { deals: -1, portfolios: -1, branding: true };
    default: // FREE
      return { deals: 0, portfolios: 0, branding: false };
  }
};

const canPerformAction = (action, plan = user?.plan) => {
  const limits = getPlanLimits(plan);
  
  switch (action) {
    case 'save_deal':
      return limits.deals !== 0 && 
             (limits.deals === -1 || (user?.deals_count || 0) < limits.deals);
    case 'branded_pdf':
      return limits.branding;
    case 'share_deal':
      return limits.deals !== 0;
    case 'create_portfolio':
      return limits.portfolios !== 0;
    default:
      return true;
  }
};
```

### Clerk Integration Update

```javascript
// Read plan from Clerk user metadata
const plan = clerkUser?.publicMetadata?.plan || 'FREE';
const planStatus = clerkUser?.publicMetadata?.plan_status || 'active';

// Enforce active subscription
if (plan !== 'FREE' && planStatus !== 'active') {
  // Downgrade to FREE if subscription expired
  return 'FREE';
}

return plan;
```

---

## Migration Path

### Existing Users (MongoDB)
1. Keep MongoDB user records with current plan
2. Sync plan to Clerk metadata on first login
3. MongoDB remains source of truth for app data (P&L, deals)
4. Clerk becomes source of truth for plan/subscription status

### New Users (Clerk-first)
1. User signs up via Clerk
2. Default plan set to "FREE" in public metadata
3. User record created in MongoDB with Clerk user ID
4. Plan upgrades update both Clerk metadata and MongoDB

---

## Upgrade Flow

### FREE → STARTER
1. User clicks "Upgrade to Starter" ($19/month)
2. Redirect to Stripe Checkout
3. On success → Stripe webhook → Update Clerk metadata
4. User can now save up to 10 deals
5. User can create 1 portfolio
6. User can generate branded PDFs

### STARTER → PRO
1. User clicks "Upgrade to Pro" ($49/month)
2. Stripe updates subscription
3. Webhook updates Clerk metadata to PRO
4. User gets unlimited deals and portfolios
5. Access to P&L Tracker unlocked
6. Advanced features enabled

### PRO → FREE (Cancellation)
1. User cancels subscription
2. Access continues until period end
3. At period end → webhook → Update Clerk metadata to FREE
4. Existing deals preserved (read-only)
5. Cannot create new deals
6. P&L Tracker locked (data preserved)

---

## Testing Strategy

### Plan Preview Mode (Non-Production)
Use existing plan preview system:
```javascript
// Set cookie to test plan features
document.cookie = 'plan_preview=PRO; path=/';

// Test PRO features without payment
// Test limits and restrictions
```

### Production Testing
1. Create test Stripe products
2. Use Stripe test mode
3. Test upgrade flow end-to-end
4. Verify Clerk metadata updates
5. Test downgrade scenarios

---

## Summary

| Feature | FREE | STARTER | PRO |
|---------|------|---------|-----|
| **All Calculators** | ✅ View Only | ✅ Full Access | ✅ Full Access |
| **Save Deals** | ❌ | ✅ Up to 10 | ✅ Unlimited |
| **Share Deals** | ❌ | ✅ | ✅ |
| **Portfolios** | ❌ | ✅ 1 Portfolio | ✅ Unlimited |
| **Branded PDFs** | ❌ | ✅ | ✅ |
| **P&L Tracker** | ❌ | ❌ | ✅ |
| **Export Reports** | ❌ | ❌ | ✅ PDF/Excel |
| **5-Year Projections** | ❌ | ❌ | ✅ |
| **Multi-Brand Profiles** | ❌ | ❌ | ✅ |
| **URL Prefill** | ❌ | ❌ | ✅ |
| **Price** | $0 | $19/mo | $49/mo |

---

**Next Steps:**
1. Review and confirm feature mapping
2. Set up Stripe products
3. Implement Clerk metadata sync
4. Create upgrade flow UI
5. Test with real Stripe payments (test mode)
