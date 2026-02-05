# Authentication & Pricing Tier Integration

**Version:** 1.0  
**Last Updated:** October 15, 2025  
**Purpose:** Define authentication flow and pricing tier integration for AICoder.Guru app

---

## 🔐 Authentication Flow

### Current State
- **Issue**: App is accessible without authentication
- **Required**: All app routes must be protected behind authentication

### Authentication Providers
1. **Google Sign-In** (OAuth)
2. **Email/Password** (Firebase Auth)
3. **Email Link** (Passwordless)

### Protected Routes
All routes require authentication:
- `/` - My Usage (CSV upload & analytics)
- `/dashboard` - Organization Dashboard
- `/teams` - Team Management
- `/users` - User Management
- `/billing` - Billing & Subscription
- `/api-connections` - API Connections (Team/Enterprise only)

### Unauthenticated Experience
- **Landing**: User sees LoginPage with sign-in options
- **After Auth**: Redirect to `/` (My Usage page)
- **Invitation Links**: Handle organization invitations with special flow

---

## 💰 Pricing Tiers & User Model Integration

### Website Pricing Tiers (Martial Arts Theme)

#### 1. **Novice** (Free Individual)
**Price:** Free  
**Features:**
- CSV upload only
- Personal usage tracking
- Basic charts & analytics
- Data stored for 30 days
- 1 user

**User Model Mapping:**
```typescript
{
  tier: 'free_individual',
  currentRole: 'individual',
  organization: null
}
```

#### 2. **Apprentice** (Team Starter)
**Price:** $10/month (up to 5 seats)  
**Features:**
- Everything in Novice
- Team dashboard
- Up to 5 team members
- Data stored for 90 days
- CSV upload for team

**User Model Mapping:**
```typescript
{
  tier: 'team',
  currentRole: 'admin' | 'team_manager' | 'member',
  organizationId: 'org_id',
  organization: {
    tier: 'team',
    maxMembers: 5,
    settings: {
      dataRetentionDays: 90,
      apiIntegrations: []
    }
  }
}
```

#### 3. **Sensei** (Team Pro)
**Price:** $25/month (up to 15 seats)  
**Features:**
- Everything in Apprentice
- Up to 15 team members
- API integration (1 service)
- Data stored for 180 days
- Advanced analytics

**User Model Mapping:**
```typescript
{
  tier: 'team',
  currentRole: 'admin' | 'team_manager' | 'member',
  organizationId: 'org_id',
  organization: {
    tier: 'team',
    maxMembers: 15,
    settings: {
      dataRetentionDays: 180,
      apiIntegrations: ['cursor' | 'claude' | 'github_copilot']
    }
  }
}
```

#### 4. **Master** (Team Advanced)
**Price:** $50/month (up to 30 seats)  
**Features:**
- Everything in Sensei
- Up to 30 team members
- API integration (3 services)
- Data stored for 365 days
- Priority support

**User Model Mapping:**
```typescript
{
  tier: 'team',
  currentRole: 'admin' | 'team_manager' | 'member',
  organizationId: 'org_id',
  organization: {
    tier: 'team',
    maxMembers: 30,
    settings: {
      dataRetentionDays: 365,
      apiIntegrations: ['cursor', 'claude', 'github_copilot', ...]
    }
  }
}
```

#### 5. **Grandmaster** (Enterprise)
**Price:** Contact Sales  
**Features:**
- Everything in Master
- Unlimited team members
- All API integrations
- Unlimited data retention
- Dedicated support
- Custom integrations
- SSO/SAML

**User Model Mapping:**
```typescript
{
  tier: 'enterprise',
  currentRole: 'admin' | 'team_manager' | 'member',
  organizationId: 'org_id',
  organization: {
    tier: 'enterprise',
    maxMembers: -1, // unlimited
    settings: {
      dataRetentionDays: -1, // unlimited
      apiIntegrations: ['all'],
      requireTwoFactor: true,
      ssoEnabled: true
    }
  }
}
```

---

## 🔄 Subscription Flow

### New User Signup
1. User signs up → Creates account with `tier: 'free_individual'`
2. User invited to organization → Joins as member, adopts org tier
3. User creates organization → Becomes admin, selects tier via Stripe

### Stripe Integration
- **Pricing Table**: Embedded on website `/pricing` page
- **Customer Portal**: Link from app `/billing` page
- **Webhook**: Update user/org tier on subscription changes

### Tier Enforcement
```typescript
// Check if user can access feature
const canAccessFeature = (user: User, feature: string) => {
  const tierFeatures = {
    free_individual: ['csv_upload', 'basic_analytics'],
    team: ['csv_upload', 'basic_analytics', 'team_dashboard', 'api_integration'],
    enterprise: ['all']
  }
  
  return tierFeatures[user.tier]?.includes(feature) || 
         tierFeatures[user.tier]?.includes('all')
}
```

---

## 🚀 Implementation Plan

### Phase 1: Authentication Guards ✅ (Current Task)
- [ ] Create `LoginPage.tsx` component
- [ ] Update `App.tsx` routing with auth guards
- [ ] Redirect unauthenticated users to `/login`
- [ ] Handle post-login redirects

### Phase 2: Remove Non-Functional UI
- [ ] Remove Settings button from Sidebar (causes errors)
- [ ] Remove AccountSettingsModal if not implemented
- [ ] Clean up unused components

### Phase 3: Tier-Based Features
- [ ] Create `useTierFeatures()` hook
- [ ] Implement feature gates in UI
- [ ] Show upgrade prompts for locked features
- [ ] Link to Stripe pricing table

### Phase 4: Stripe Integration
- [ ] Set up Stripe pricing table
- [ ] Implement Stripe Customer Portal
- [ ] Set up webhooks for subscription events
- [ ] Update user/org tier on payment

---

## 📋 User Model Reference

### TypeScript Interfaces

```typescript
// From shared/src/types/organization.ts
export type OrganizationTier = 'free_individual' | 'team' | 'enterprise'
export type OrganizationRole = 'admin' | 'team_manager' | 'member'

export interface User {
  id: string
  email: string
  displayName?: string
  photoURL?: string
  tier: OrganizationTier
  currentRole: OrganizationRole
  organizationId?: string
  createdAt: Timestamp
  lastLoginAt: Timestamp
}

export interface Organization {
  id: string
  name: string
  tier: OrganizationTier
  maxMembers: number // -1 for unlimited
  createdAt: Timestamp
  ownerId: string
  billingPlan: {
    stripeCustomerId?: string
    stripePriceId?: string
    status: 'active' | 'canceled' | 'past_due' | 'trialing'
    currentPeriodEnd?: Timestamp
  }
  settings: OrganizationSettings
}

export interface OrganizationSettings {
  defaultCurrency: string
  dataRetentionDays: number // -1 for unlimited
  allowMemberInvites: boolean
  requireTwoFactor: boolean
  apiIntegrations: string[]
  ssoEnabled?: boolean
}
```

---

## 🎯 Next Steps

1. **Immediate**: Implement LoginPage and auth guards
2. **Clean Up**: Remove non-functional Settings
3. **Features**: Add tier-based feature gates
4. **Billing**: Integrate Stripe for subscriptions


