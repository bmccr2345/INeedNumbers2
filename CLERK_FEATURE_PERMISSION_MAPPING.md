# Clerk Feature & Permission Mapping Plan

## Overview
This document maps "I Need Numbers" features to Clerk's permission/feature system for granular access control based on subscription plans.

**IMPORTANT**: Clerk feature keys use underscores (`_`) not colons (`:`)

---

## Clerk Features/Permissions Structure

### Core Concept
- **Features** = Capabilities that can be enabled/disabled per plan
- **Permissions** = Specific actions users can perform
- Each plan gets assigned specific features/permissions
- Frontend/Backend checks permissions before allowing actions

---

## Recommended Feature Mapping

### 1. Calculator Access Features

#### Feature: `calculator_basic`
**Plans**: FREE, STARTER, PRO  
**Description**: Access to view and use calculators  
**Key**: `calculator_basic`  
**Permissions**:
- `calculator_commission_split_view`
- `calculator_net_sheet_view`
- `calculator_affordability_view`
- `calculator_closing_date_view`

---

### 2. Deal Management Features

#### Feature: `deals_save`
**Plans**: STARTER, PRO  
**Description**: Ability to save deal calculations  
**Key**: `deals_save`  
**Permissions**:
- `deal_create`
- `deal_read`
- `deal_update`
- `deal_delete`

**Limits**:
- STARTER: max 10 deals
- PRO: unlimited

#### Feature: `deal_share`
**Plans**: STARTER, PRO  
**Description**: Share deals via links with clients  
**Key**: `deal_share`  
**Permissions**:
- `deal_share_create_link`
- `deal_share_view_shared`

---

### 3. Portfolio Features

#### Feature: `portfolio_basic`
**Plans**: STARTER  
**Description**: Create and manage 1 portfolio  
**Key**: `portfolio_basic`  
**Permissions**:
- `portfolio_create` (max 1)
- `portfolio_read`
- `portfolio_update`
- `portfolio_delete`

#### Feature: `portfolio_unlimited`
**Plans**: PRO  
**Description**: Create unlimited portfolios  
**Key**: `portfolio_unlimited`  
**Permissions**:
- `portfolio_create` (unlimited)
- `portfolio_read`
- `portfolio_update`
- `portfolio_delete`

---

### 4. Branding & PDF Features

#### Feature: `branding_custom`
**Plans**: STARTER, PRO  
**Description**: Create branded PDFs with custom logo  
**Key**: `branding_custom`  
**Permissions**:
- `pdf_generate_branded`
- `branding_upload_logo`
- `branding_set_colors`
- `branding_create_profile`

#### Feature: `branding_multi_profile`
**Plans**: PRO  
**Description**: Multiple branding profiles  
**Key**: `branding_multi_profile`  
**Permissions**:
- `branding_create_profile` (unlimited)
- `branding_switch_profile`
- `branding_manage_profiles`

---

### 5. P&L Tracker Features

#### Feature: `pnl_tracker`
**Plans**: PRO  
**Description**: Agent P&L business tracker  
**Key**: `pnl_tracker`  
**Permissions**:
- `pnl_view_dashboard`
- `pnl_add_income`
- `pnl_add_expense`
- `pnl_view_reports`
- `pnl_set_goals`

---

### 6. Export & Reporting Features

#### Feature: `reports_export`
**Plans**: PRO  
**Description**: Export reports to PDF/Excel  
**Key**: `reports_export`  
**Permissions**:
- `report_export_pdf`
- `report_export_excel`
- `report_download`

#### Feature: `reports_projections`
**Plans**: PRO  
**Description**: 5-year financial projections  
**Key**: `reports_projections`  
**Permissions**:
- `projection_view`
- `projection_generate`
- `projection_export`

---

### 7. Advanced Features

#### Feature: `advanced_url_prefill`
**Plans**: PRO  
**Description**: Auto-fill from MLS URLs  
**Key**: `advanced_url_prefill`  
**Permissions**:
- `calculator_prefill_from_url`
- `listing_import_data`

---

## Complete Feature Matrix

| Feature Key | FREE | STARTER | PRO | Limit |
|-------------|------|---------|-----|-------|
| `calculator_basic` | ✅ | ✅ | ✅ | View only (FREE) |
| `deals_save` | ❌ | ✅ | ✅ | 0 / 10 / Unlimited |
| `deal_share` | ❌ | ✅ | ✅ | - |
| `portfolio_basic` | ❌ | ✅ | ❌ | Max 1 |
| `portfolio_unlimited` | ❌ | ❌ | ✅ | Unlimited |
| `branding_custom` | ❌ | ✅ | ✅ | - |
| `branding_multi_profile` | ❌ | ❌ | ✅ | Unlimited profiles |
| `pnl_tracker` | ❌ | ❌ | ✅ | - |
| `reports_export` | ❌ | ❌ | ✅ | - |
| `reports_projections` | ❌ | ❌ | ✅ | 5-year |
| `advanced_url_prefill` | ❌ | ❌ | ✅ | - |

---

## Your Current Clerk Setup (From Screenshot)

✅ **Already Created:**
1. `calculator_basic` - access to all calculators
2. `deal_share` - ability to share a deal PDF - for Start and Pro
3. `deals_save` - save deals - only available in Starter and Pro
4. `pnl_tracker` - Pro only - P&L

**Still Need to Create:**
5. `portfolio_basic` (STARTER)
6. `portfolio_unlimited` (PRO)
7. `branding_custom` (STARTER, PRO)
8. `branding_multi_profile` (PRO)
9. `reports_export` (PRO)
10. `reports_projections` (PRO)
11. `advanced_url_prefill` (PRO)

---

## Clerk Configuration Steps

### 1. Create Features in Clerk Dashboard

For each feature above, create in Clerk:

**Example: Feature `deals:save`**
```
Name: Save Deals
Key: deals:save
Description: Ability to save and manage deal calculations
```

**Permissions under this feature:**
- Permission: `deal:create` - Create new deal
- Permission: `deal:read` - View saved deals
- Permission: `deal:update` - Edit saved deals
- Permission: `deal:delete` - Delete saved deals

### 2. Assign Features to Plans

**FREE Plan (`free_user`):**
```
Features:
- calculator:basic
```

**STARTER Plan (`starter`):**
```
Features:
- calculator:basic
- deals:save
- deals:share
- portfolio:basic
- branding:custom
```

**PRO Plan (`pro`):**
```
Features:
- calculator:basic
- deals:save
- deals:share
- portfolio:unlimited
- branding:custom
- branding:multi_profile
- pnl:tracker
- reports:export
- reports:projections
- advanced:url_prefill
```

---

## Implementation in Code

### Frontend Permission Checks

```javascript
import { useUser } from '@clerk/clerk-react';

// Check if user has a feature
const { user } = useUser();
const hasFeature = (featureKey) => {
  return user?.publicMetadata?.features?.includes(featureKey) || false;
};

// Check specific permission
const hasPermission = (permission) => {
  return user?.publicMetadata?.permissions?.includes(permission) || false;
};

// Usage examples
const canSaveDeals = hasFeature('deals_save');
const canExportPDF = hasPermission('report_export_pdf');
const canUsePnL = hasFeature('pnl_tracker');
```

### Backend Permission Validation

```python
# In backend/server.py or dedicated permissions module

def has_feature(clerk_user_metadata, feature_key):
    """Check if user has a specific feature"""
    features = clerk_user_metadata.get('features', [])
    return feature_key in features

def has_permission(clerk_user_metadata, permission):
    """Check if user has a specific permission"""
    permissions = clerk_user_metadata.get('permissions', [])
    return permission in permissions

# Usage in endpoints
@api_router.post("/api/deals/save")
async def save_deal(request: Request):
    # Get Clerk user from request
    clerk_metadata = request.state.clerk_user_metadata
    
    if not has_feature(clerk_metadata, 'deals_save'):
        raise HTTPException(403, "Upgrade to STARTER to save deals")
    
    # Check deal count for STARTER users
    plan = clerk_metadata.get('plan')
    if plan == 'starter':
        deal_count = await get_user_deal_count(user_id)
        if deal_count >= 10:
            raise HTTPException(403, "STARTER plan limited to 10 deals. Upgrade to PRO")
    
    # Proceed with saving deal
    ...
```

### Enhanced AuthContext Integration

```javascript
// Update AuthContext.js
const getFeatures = () => {
  if (isSignedIn && clerkUser?.publicMetadata?.features) {
    return clerkUser.publicMetadata.features;
  }
  return ['calculator_basic']; // Default FREE features
};

const hasFeature = (featureKey) => {
  const features = getFeatures();
  return features.includes(featureKey);
};

const hasPermission = (permission) => {
  if (isSignedIn && clerkUser?.publicMetadata?.permissions) {
    return clerkUser.publicMetadata.permissions.includes(permission);
  }
  return false;
};

// Add to context value
const value = {
  ...existingValues,
  getFeatures,
  hasFeature,
  hasPermission
};
```

---

## UI/UX Implementations

### 1. Conditional Feature Display

```jsx
import { useAuth } from '../contexts/AuthContext';

const DealsList = () => {
  const { hasFeature, hasPermission } = useAuth();
  
  return (
    <div>
      <h2>My Deals</h2>
      
      {!hasFeature('deals_save') && (
        <UpgradePrompt
          title="Save Your Deals"
          message="Upgrade to STARTER to save and manage deals"
          plan="starter"
        />
      )}
      
      {hasFeature('deals_save') && (
        <Button onClick={handleSaveDeal} disabled={!hasPermission('deal_create')}>
          Save Deal
        </Button>
      )}
      
      {hasFeature('deal_share') && (
        <Button onClick={handleShareDeal}>
          Share with Client
        </Button>
      )}
    </div>
  );
};
```

### 2. Feature Gating Component

```jsx
const FeatureGate = ({ feature, fallback, children }) => {
  const { hasFeature } = useAuth();
  
  if (!hasFeature(feature)) {
    return fallback || <UpgradePrompt feature={feature} />;
  }
  
  return children;
};

// Usage
<FeatureGate feature="pnl_tracker">
  <PnLDashboard />
</FeatureGate>
```

### 3. Plan Limit Enforcement

```jsx
const SaveDealButton = () => {
  const { user, hasFeature, getCurrentPlan } = useAuth();
  const [dealCount, setDealCount] = useState(0);
  
  const plan = getCurrentPlan();
  const canSave = hasFeature('deals_save');
  const isLimitReached = plan === 'STARTER' && dealCount >= 10;
  
  return (
    <Button 
      disabled={!canSave || isLimitReached}
      onClick={handleSave}
    >
      {isLimitReached ? 'Upgrade to PRO for Unlimited' : 'Save Deal'}
    </Button>
  );
};
```

---

## Clerk Metadata Structure

### User Public Metadata Format

```json
{
  "plan": "starter",
  "plan_status": "active",
  "features": [
    "calculator_basic",
    "deals_save",
    "deal_share",
    "portfolio_basic",
    "branding_custom"
  ],
  "permissions": [
    "calculator_commission_split_view",
    "calculator_net_sheet_view",
    "deal_create",
    "deal_read",
    "deal_update",
    "deal_delete",
    "deal_share_create_link",
    "portfolio_create",
    "pdf_generate_branded",
    "branding_upload_logo"
  ],
  "limits": {
    "deals": 10,
    "portfolios": 1
  }
}
```

---

## Migration Plan

### Phase 1: Setup Clerk Features (Manual)
1. Go to Clerk Dashboard → Configure → Features
2. Create each feature listed above
3. Add permissions under each feature
4. Assign features to each plan (free_user, starter, pro)

### Phase 2: Update Backend
1. Modify `/api/clerk/sync-user` to read features from metadata
2. Add permission check functions
3. Update protected endpoints with feature gates
4. Add limit enforcement logic

### Phase 3: Update Frontend
1. Enhance AuthContext with `hasFeature()` and `hasPermission()`
2. Create FeatureGate component
3. Update UI components with conditional rendering
4. Add upgrade prompts for locked features

### Phase 4: Testing
1. Test each plan's feature access
2. Verify limits (10 deals for STARTER)
3. Test upgrade/downgrade flows
4. Verify permission checks on all endpoints

---

## Priority Features to Implement First

### High Priority (MVP)
1. ✅ `deals:save` - Core paid feature
2. ✅ `branding:custom` - Key differentiator
3. ✅ `pnl:tracker` - PRO flagship feature

### Medium Priority
4. `portfolio:basic` / `portfolio:unlimited`
5. `deals:share`
6. `reports:export`

### Low Priority (Future)
7. `reports:projections`
8. `advanced:url_prefill`
9. `branding:multi_profile`

---

## Testing Checklist

- [ ] Create features in Clerk Dashboard
- [ ] Assign features to plans
- [ ] Update user metadata structure
- [ ] Implement `hasFeature()` in AuthContext
- [ ] Add permission checks to backend
- [ ] Test FREE user (no paid features)
- [ ] Test STARTER user (10 deal limit)
- [ ] Test PRO user (unlimited access)
- [ ] Verify upgrade prompts show correctly
- [ ] Test downgrade scenario (features lock)

---

## Documentation for Future Features

When adding new features:
1. Create feature in Clerk Dashboard
2. Define permissions under feature
3. Assign to appropriate plans
4. Update code to check permission
5. Add UI/UX for upgrade prompts
6. Document in this file

---

**Next Step**: Start with Clerk Dashboard configuration, then implement backend permission checks, followed by frontend UI updates.
