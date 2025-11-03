# Clerk Feature & Permission Mapping Plan

## Overview
This document maps "I Need Numbers" features to Clerk's permission/feature system for granular access control based on subscription plans.

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

#### Feature: `calculator:basic`
**Plans**: FREE, STARTER, PRO  
**Description**: Access to view and use calculators  
**Key**: `calculator:basic`  
**Permissions**:
- `calculator:commission_split:view`
- `calculator:net_sheet:view`
- `calculator:affordability:view`
- `calculator:closing_date:view`

---

### 2. Deal Management Features

#### Feature: `deals:save`
**Plans**: STARTER, PRO  
**Description**: Ability to save deal calculations  
**Key**: `deals:save`  
**Permissions**:
- `deal:create`
- `deal:read`
- `deal:update`
- `deal:delete`

**Limits**:
- STARTER: max 10 deals
- PRO: unlimited

#### Feature: `deals:share`
**Plans**: STARTER, PRO  
**Description**: Share deals via links with clients  
**Key**: `deals:share`  
**Permissions**:
- `deal:share:create_link`
- `deal:share:view_shared`

---

### 3. Portfolio Features

#### Feature: `portfolio:basic`
**Plans**: STARTER  
**Description**: Create and manage 1 portfolio  
**Key**: `portfolio:basic`  
**Permissions**:
- `portfolio:create` (max 1)
- `portfolio:read`
- `portfolio:update`
- `portfolio:delete`

#### Feature: `portfolio:unlimited`
**Plans**: PRO  
**Description**: Create unlimited portfolios  
**Key**: `portfolio:unlimited`  
**Permissions**:
- `portfolio:create` (unlimited)
- `portfolio:read`
- `portfolio:update`
- `portfolio:delete`

---

### 4. Branding & PDF Features

#### Feature: `branding:custom`
**Plans**: STARTER, PRO  
**Description**: Create branded PDFs with custom logo  
**Key**: `branding:custom`  
**Permissions**:
- `pdf:generate_branded`
- `branding:upload_logo`
- `branding:set_colors`
- `branding:create_profile`

#### Feature: `branding:multi_profile`
**Plans**: PRO  
**Description**: Multiple branding profiles  
**Key**: `branding:multi_profile`  
**Permissions**:
- `branding:create_profile` (unlimited)
- `branding:switch_profile`
- `branding:manage_profiles`

---

### 5. P&L Tracker Features

#### Feature: `pnl:tracker`
**Plans**: PRO  
**Description**: Agent P&L business tracker  
**Key**: `pnl:tracker`  
**Permissions**:
- `pnl:view_dashboard`
- `pnl:add_income`
- `pnl:add_expense`
- `pnl:view_reports`
- `pnl:set_goals`

---

### 6. Export & Reporting Features

#### Feature: `reports:export`
**Plans**: PRO  
**Description**: Export reports to PDF/Excel  
**Key**: `reports:export`  
**Permissions**:
- `report:export_pdf`
- `report:export_excel`
- `report:download`

#### Feature: `reports:projections`
**Plans**: PRO  
**Description**: 5-year financial projections  
**Key**: `reports:projections`  
**Permissions**:
- `projection:view`
- `projection:generate`
- `projection:export`

---

### 7. Advanced Features

#### Feature: `advanced:url_prefill`
**Plans**: PRO  
**Description**: Auto-fill from MLS URLs  
**Key**: `advanced:url_prefill`  
**Permissions**:
- `calculator:prefill_from_url`
- `listing:import_data`

---

## Complete Feature Matrix

| Feature Key | FREE | STARTER | PRO | Limit |
|-------------|------|---------|-----|-------|
| `calculator:basic` | ✅ | ✅ | ✅ | View only (FREE) |
| `deals:save` | ❌ | ✅ | ✅ | 0 / 10 / Unlimited |
| `deals:share` | ❌ | ✅ | ✅ | - |
| `portfolio:basic` | ❌ | ✅ | ❌ | Max 1 |
| `portfolio:unlimited` | ❌ | ❌ | ✅ | Unlimited |
| `branding:custom` | ❌ | ✅ | ✅ | - |
| `branding:multi_profile` | ❌ | ❌ | ✅ | Unlimited profiles |
| `pnl:tracker` | ❌ | ❌ | ✅ | - |
| `reports:export` | ❌ | ❌ | ✅ | - |
| `reports:projections` | ❌ | ❌ | ✅ | 5-year |
| `advanced:url_prefill` | ❌ | ❌ | ✅ | - |

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
const canSaveDeals = hasFeature('deals:save');
const canExportPDF = hasPermission('report:export_pdf');
const canUsePnL = hasFeature('pnl:tracker');
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
    
    if not has_feature(clerk_metadata, 'deals:save'):
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
  return ['calculator:basic']; // Default FREE features
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
      
      {!hasFeature('deals:save') && (
        <UpgradePrompt
          title="Save Your Deals"
          message="Upgrade to STARTER to save and manage deals"
          plan="starter"
        />
      )}
      
      {hasFeature('deals:save') && (
        <Button onClick={handleSaveDeal} disabled={!hasPermission('deal:create')}>
          Save Deal
        </Button>
      )}
      
      {hasFeature('deals:share') && (
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
<FeatureGate feature="pnl:tracker">
  <PnLDashboard />
</FeatureGate>
```

### 3. Plan Limit Enforcement

```jsx
const SaveDealButton = () => {
  const { user, hasFeature, getCurrentPlan } = useAuth();
  const [dealCount, setDealCount] = useState(0);
  
  const plan = getCurrentPlan();
  const canSave = hasFeature('deals:save');
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
    "calculator:basic",
    "deals:save",
    "deals:share",
    "portfolio:basic",
    "branding:custom"
  ],
  "permissions": [
    "calculator:commission_split:view",
    "calculator:net_sheet:view",
    "deal:create",
    "deal:read",
    "deal:update",
    "deal:delete",
    "deal:share:create_link",
    "portfolio:create",
    "pdf:generate_branded",
    "branding:upload_logo"
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
