---
name: Multi-Tenant Team Platform Transformation
overview: ""
todos:
  - id: 8af327be-ab71-43a3-b7a4-aeb0c8660e82
    content: Design and implement Firestore collections for organizations, teams, members, and API connections with proper indexing
    status: pending
  - id: 1ac79dae-07bb-4672-9d8a-cbb3128ae0a9
    content: Create shared TypeScript types and Zod schemas for organizations, teams, billing, and API connectors
    status: pending
  - id: 978085e3-76d4-4ef1-a0ff-91c0856c6d76
    content: Update Firestore security rules to support multi-tenant organization-based access control
    status: pending
  - id: c7ae81f7-70a1-4988-8bac-85d5e1af8c23
    content: Implement OrganizationContext for frontend state management of org data, roles, and permissions
    status: pending
  - id: a03beed5-cf8e-47af-9568-16465f037de4
    content: Enhance authentication flow to handle organization invitations and tier assignment
    status: pending
  - id: c923dc0c-b575-4e73-b4bf-0fc6a12bef80
    content: "Build invitation system: backend functions, email templates, and acceptance flow"
    status: pending
  - id: 61eedf1e-6fab-47aa-84ae-b4f17eec939f
    content: Create organization setup wizard for new team/enterprise account creation
    status: pending
  - id: 4f8456b3-784e-4b22-9a37-690d0e2d27ca
    content: Implement role-based access control system with permission checking utilities
    status: pending
  - id: 847e7fa5-dd32-45ca-ace4-a93254a7c9dd
    content: Integrate Stripe for subscription management, webhooks, and billing dashboard
    status: pending
  - id: ed217f62-5dfc-4446-8f6a-14fb04691b22
    content: Implement pricing tier enforcement and feature gating across the application
    status: pending
  - id: a9c0a01c-864c-42c1-89ea-2097b4150be0
    content: "Build team management interface: create teams, assign managers, add members"
    status: pending
  - id: 44809ca4-a1fe-4708-a076-2302b03d873f
    content: Create user management interface for admins to invite, suspend, and manage org users
    status: pending
  - id: 899c766b-720c-4760-a39a-cd69e4c474f2
    content: Design and implement base API connector framework with authentication and sync logic
    status: pending
  - id: a94eba97-d603-4b02-87e0-5051a3557810
    content: Implement Cursor API connector with authentication and usage data fetching
    status: pending
  - id: 98d6bc18-4044-439b-a4b8-9e967fc19bbf
    content: Implement GitHub Copilot API connector for enterprise usage data
    status: pending
  - id: 65871f08-8838-4adc-8455-801e36d4b86f
    content: Create Cloud Function scheduler for automated daily API syncs
    status: pending
  - id: 87d0b7a5-8915-424d-9eca-04d201550d47
    content: Build API connection management interface for admins to configure integrations
    status: pending
  - id: c0a4d503-ed62-421c-8bb5-81a225aab3d8
    content: Create organization dashboard with org-wide usage analytics and user breakdowns
    status: pending
  - id: 31eaf7c8-a4c9-44c3-acbe-78eb35c05b1a
    content: Build team analytics views for team managers with member breakdowns
    status: pending
  - id: bc00ffe0-9bbd-4cb4-85e3-f5f4f2d2e710
    content: Implement export functionality for PDF/CSV/Excel reports with scheduling
    status: pending
  - id: 551d4adb-a170-4ce4-969e-70c36d562f36
    content: Create migration script to convert existing users to FREE_INDIVIDUAL tier with personal orgs
    status: pending
  - id: 98f1e938-f5cf-4a70-92a2-3ed6a569fcf3
    content: Update navigation structure with role-based menu items and routing
    status: pending
  - id: 3f1ac3b2-af29-4366-ad14-394e0855bd6d
    content: Refactor existing components (CursorUsageChart, CSVImport) for org awareness and filtering
    status: pending
  - id: 1308d7a0-278f-492f-aeb2-1a15435a9597
    content: "Implement additional API connectors: Codeium, Claude Code, OpenAI, Tabnine"
    status: pending
isProject: false
---

# Multi-Tenant Team Platform Transformation

## Architecture Overview

Transform the single-user Cursor Costs application into a comprehensive multi-tenant SaaS platform with:

- **Organizations** with multiple users
- **Role-based access control** (Admin, Team Manager, Member)
- **Tiered pricing** (Free, Team, Enterprise)
- **Hybrid data ingestion** (Manual CSV + Automated API)
- **Full administrative transparency**

## Database Schema Changes

### New Firestore Collections Structure

```
organizations/
  {orgId}/
  - name: string
  - tier: 'free' | 'team' | 'enterprise'
  - billingPlan: object
   - seats: number (allocated)
   - usedSeats: number
   - pricePerSeat: number
   - baseFee: number
   - billingCycle: 'monthly' | 'annual'
  - settings: object
   - apiIntegrations: []
   - dataRetentionDays: number
  - createdAt: timestamp
  - updatedAt: timestamp
    
  {orgId}/members/
    {userId}/
   - email: string
   - role: 'admin' | 'team_manager' | 'member'
   - teamId: string (for team_manager assignment)
   - invitedAt: timestamp
   - joinedAt: timestamp
   - status: 'invited' | 'active' | 'suspended'
  
  {orgId}/teams/
    {teamId}/
   - name: string
   - managerId: string (userId)
   - memberIds: string[]
   - createdAt: timestamp
  
  {orgId}/apiConnections/
    {connectionId}/
   - provider: 'cursor' | 'github_copilot' | 'codeium' | 'tabnine'
   - credentials: encrypted
   - userId: string (who added it)
   - status: 'active' | 'failed' | 'paused'
   - lastSyncAt: timestamp
   - nextSyncAt: timestamp
  
  {orgId}/usage/
    {usageId}/
   - userId: string
   - model: string
   - tokens: number
   - tokenBreakdown: object
   - costUsd: number
   - source: 'manual_csv' | 'api_sync'
   - timestamp: timestamp
   - date: string
   - raw: object

subscriptions/
  {orgId}/
  - stripeCustomerId: string
  - stripeSubscriptionId: string
  - status: 'active' | 'past_due' | 'canceled'
  - currentPeriodEnd: timestamp
  - seats: number

invitations/
  {inviteId}/
  - organizationId: string
  - email: string
  - role: string
  - invitedBy: string
  - token: string
  - expiresAt: timestamp
  - status: 'pending' | 'accepted' | 'expired'
```

### Updated User Schema

```typescript
users/
  {userId}/
  - email: string
  - displayName: string
  - organizationId: string | null
  - currentRole: 'admin' | 'team_manager' | 'member' | 'individual'
  - preferences: object
  - tier: 'free_individual' | 'paid_individual' | 'team' | 'enterprise'
  - createdAt: timestamp
    
  {userId}/rawUsage/ (existing, kept for backwards compatibility)
  {userId}/aggregatedUsage/ (existing, kept for backwards compatibility)
```

## Phase 1: Core Multi-Tenant Infrastructure

### 1.1 Organization Management (`shared/src/types/organization.ts`)

Create comprehensive type definitions:

- Organization schema with Zod validation
- Member roles and permissions
- Team structure types
- Billing types

### 1.2 Firestore Security Rules (`firestore.rules`)

Update to support:

```
- Organizations can only be read/written by their members
- Admins have full access to org data
- Team managers can read their team's data
- Members can read aggregate org data, write their own usage
- Usage data visibility based on role
```

### 1.3 Organization Context (`frontend/src/contexts/OrganizationContext.tsx`)

New React context for:

- Current organization state
- User's role in organization
- Organization members list
- Team assignments
- Permissions checking

## Phase 2: Authentication & User Management

### 2.1 Enhanced Auth Flow

Update `AuthContext.tsx`:

- After signup, determine if joining org (via invite) or creating individual account
- Check for pending invitations by email
- Auto-assign to organization if invitation exists
- Create personal organization for individual free users

### 2.2 Invitation System

New components:

- `InviteUserModal.tsx` - Admin/Team Manager invite interface
- `AcceptInvitationPage.tsx` - Landing page for invited users
- Backend function `processInvitation` - Handle invitation acceptance

### 2.3 Organization Setup Wizard

New `OrganizationSetupWizard.tsx`:

- Step 1: Organization name & basic info
- Step 2: Select tier (Team/Enterprise)
- Step 3: Billing information (Stripe integration)
- Step 4: Invite initial team members

## Phase 3: Role-Based Access Control (RBAC)

### 3.1 Permission System (`shared/src/utils/permissions.ts`)

```typescript
Permissions:
- VIEW_OWN_DATA
- VIEW_TEAM_DATA
- VIEW_ORG_DATA
- MANAGE_USERS
- MANAGE_TEAMS
- MANAGE_BILLING
- MANAGE_API_CONNECTIONS
- EXPORT_REPORTS
- INVITE_USERS
```

### 3.2 Data Access Patterns

**Admin:**

- View all organization usage (all users, all teams)
- Individual user breakdowns with full detail
- Manage organization, teams, billing
- Configure API integrations

**Team Manager:**

- View assigned team members' aggregated usage
- View individual breakdowns for team members
- Invite users to their team
- Export team reports

**Member:**

- View own usage data
- Upload own CSV data
- View organization aggregates (anonymized)

## Phase 4: Billing & Subscription Management

### 4.1 Stripe Integration

New Cloud Functions:

- `createCheckoutSession` - Initialize subscription
- `handleStripeWebhook` - Process subscription events
- `updateSubscription` - Change seats/tier
- `calculateUsageCharges` - Monthly usage-based billing

### 4.2 Pricing Tiers (`shared/src/types/pricing.ts`)

```typescript
FREE_INDIVIDUAL:
 - Manual CSV upload only
 - Single user
 - 90-day data retention
 - $0/month

PAID_INDIVIDUAL:
 - Manual CSV + API integration
 - Single user
 - 1-year data retention
 - $9/month

TEAM:
 - Base: $49/month
 - Per seat: $12/month
 - Up to 50 users
 - API integrations
 - Team management
 - Unlimited data retention
 - Priority support

ENTERPRISE:
 - Base: $199/month
 - Per seat: $8/month
 - Unlimited users
 - Custom API integrations
 - Advanced analytics
 - Dedicated support
 - SSO (future)
```

### 4.3 Billing Dashboard (`frontend/src/pages/BillingPage.tsx`)

Features:

- Current subscription status
- Seat usage (X of Y used)
- Add/remove seats
- Billing history
- Invoice downloads
- Upgrade/downgrade tier

## Phase 5: API Integration Framework

### 5.1 API Connector Architecture (`functions/src/connectors/`)

Base connector interface:

```typescript
interface APIConnector {
  provider: string
  authenticate(credentials): Promise<boolean>
  fetchUsage(startDate, endDate): Promise<UsageData[]>
  sync(): Promise<SyncResult>
}
```

### 5.2 Provider Implementations

Research and implement connectors for:

**Cursor:**

- API endpoint: Check Cursor Settings > Usage API
- Authentication: API key
- Data format: Similar to current CSV

**GitHub Copilot:**

- API: GitHub Enterprise API
- Requires: GitHub org admin access
- Endpoint: `/enterprises/{enterprise}/copilot/usage`

**Codeium:**

- Check Codeium Teams API
- May require team admin access

**Claude Code (Anthropic):**

- Anthropic Console API
- Usage data export

**OpenAI Codex / ChatGPT:**

- OpenAI organization usage endpoint
- Requires org API key

**Tabnine:**

- Tabnine Enterprise API
- Team usage analytics

### 5.3 Sync Scheduler (`functions/src/schedulers/apiSyncScheduler.ts`)

Cloud Function triggered daily:

- For each active API connection
- Fetch incremental usage data (since last sync)
- Transform to standard format
- Save to organization usage collection
- Update user-specific aggregations
- Send notifications on sync failures

### 5.4 API Connection Management (`frontend/src/components/APIConnectionManager.tsx`)

Admin interface to:

- Add new API connection
- Enter credentials (encrypted storage)
- Test connection
- Configure sync frequency
- View sync history/status
- Manage connection lifecycle

## Phase 6: Team Management Interface

### 6.1 Admin Dashboard (`frontend/src/pages/AdminDashboardPage.tsx`)

Full organization view:

- Organization-wide usage charts
- User breakdown table (sortable, filterable)
- Team performance comparison
- Cost allocation by team
- Model usage distribution
- Trend analysis

### 6.2 Team Management (`frontend/src/pages/TeamsPage.tsx`)

- Create/edit teams
- Assign team managers
- Add/remove team members
- View team hierarchy
- Team usage analytics

### 6.3 User Management (`frontend/src/components/UserManagementTable.tsx`)

- List all organization members
- Roles and team assignments
- Invite new users
- Suspend/remove users
- Resend invitations
- Usage summary per user

## Phase 7: Enhanced Analytics & Reporting

### 7.1 Organization Analytics (`frontend/src/hooks/useOrgAnalytics.ts`)

Aggregate data across:

- All users in organization
- Specific teams
- Date ranges
- Model types
- Cost centers

### 7.2 Comparative Analytics

New visualizations:

- User-to-user comparison
- Team-to-team comparison
- Time-period comparison
- Budget tracking
- Forecasting

### 7.3 Export & Reporting (`frontend/src/utils/exportReports.ts`)

Generate reports:

- PDF executive summaries
- CSV detailed exports
- Excel workbooks with multiple sheets
- Scheduled email reports

## Phase 8: Migration & Backwards Compatibility

### 8.1 Data Migration

Create migration function for existing users:

- Create personal organization for each user
- Migrate existing usage data to org structure
- Preserve historical data
- Update user documents

### 8.2 Free Tier Implementation

Existing users automatically:

- Get "FREE_INDIVIDUAL" tier
- Keep all existing data
- Can upgrade to PAID_INDIVIDUAL for API access
- Can create/join teams for team features

## Phase 9: Frontend UI Enhancements

### 9.1 Navigation Updates

New navigation structure:

```
Free Individual:
 - My Usage (existing functionality)
 - Account Settings

Paid Individual:
 - My Usage
 - API Connections
 - Account & Billing

Team Member:
 - My Usage
 - Team Overview (aggregated)
 - Account Settings

Team Manager:
 - My Usage
 - Team Dashboard
 - Team Members
 - Account Settings

Admin:
 - Organization Dashboard
 - Team Management
 - User Management
 - API Connections
 - Billing & Subscription
 - Settings
```

### 9.2 Component Refactoring

Update existing components:

- `CursorUsageChart.tsx` - Add org/team filtering
- `CSVImport.tsx` - Add org context awareness
- `CursorCostsPage.tsx` - Conditional rendering based on tier/role

## Phase 10: Cloud Functions & Backend Services

### 10.1 New Cloud Functions

```
functions/src/
  organizations/
  - createOrganization.ts
  - updateOrganization.ts
  - addMember.ts
  - removeMember.ts
  
  teams/
  - createTeam.ts
  - assignManager.ts
  - addTeamMember.ts
  
  billing/
  - createCheckoutSession.ts
  - handleStripeWebhook.ts
  - updateSeats.ts
  
  sync/
  - syncCursorAPI.ts
  - syncGitHubCopilot.ts
  - syncCodeium.ts
  - scheduledSync.ts (triggered daily)
  
  invitations/
  - createInvitation.ts
  - acceptInvitation.ts
  - resendInvitation.ts
  
  analytics/
  - generateOrgReport.ts
  - exportUsageData.ts
```

### 10.2 Scheduled Jobs

Implement Cloud Scheduler tasks:

- Daily API sync for all connections
- Weekly usage reports (email)
- Monthly billing calculations
- Clean up expired invitations

## Implementation Order

1. **Foundation** (Week 1-2)
  - Database schema design
                  - Type definitions in `shared/`
                  - Update Firestore rules
                  - Organization context
2. **Authentication & Invitations** (Week 3)
  - Enhanced auth flow
                  - Invitation system
                  - Organization setup wizard
3. **RBAC & Permissions** (Week 4)
  - Permission system implementation
                  - Data access patterns
                  - Frontend permission guards
4. **Billing Integration** (Week 5-6)
  - Stripe setup
                  - Subscription management
                  - Billing dashboard
                  - Pricing tier enforcement
5. **Team Management** (Week 7)
  - Teams data model
                  - Team management UI
                  - User assignment flows
6. **API Connectors** (Week 8-10)
  - Connector framework
                  - Cursor API integration
                  - GitHub Copilot integration
                  - Sync scheduler
                  - Error handling & monitoring
7. **Analytics & Dashboards** (Week 11-12)
  - Organization dashboard
                  - Team analytics
                  - Enhanced reporting
                  - Export functionality
8. **Migration & Testing** (Week 13)
  - Data migration script
                  - User communication
                  - Staged rollout
                  - Load testing
9. **Additional API Connectors** (Week 14+)
  - Codeium
                  - Claude Code
                  - OpenAI Codex
                  - Tabnine

## Key Files to Create/Modify

### New Files

**Shared Types:**

- `shared/src/types/organization.ts`
- `shared/src/types/team.ts`
- `shared/src/types/billing.ts`
- `shared/src/types/apiConnector.ts`
- `shared/src/utils/permissions.ts`

**Frontend:**

- `frontend/src/contexts/OrganizationContext.tsx`
- `frontend/src/pages/OrganizationDashboardPage.tsx`
- `frontend/src/pages/TeamsPage.tsx`
- `frontend/src/pages/BillingPage.tsx`
- `frontend/src/pages/AcceptInvitationPage.tsx`
- `frontend/src/components/OrganizationSetupWizard.tsx`
- `frontend/src/components/InviteUserModal.tsx`
- `frontend/src/components/UserManagementTable.tsx`
- `frontend/src/components/TeamManagementPanel.tsx`
- `frontend/src/components/APIConnectionManager.tsx`
- `frontend/src/hooks/useOrgAnalytics.ts`
- `frontend/src/lib/orgFirestore.ts`

**Backend:**

- `functions/src/organizations/` (directory)
- `functions/src/teams/` (directory)
- `functions/src/billing/` (directory)
- `functions/src/connectors/` (directory)
- `functions/src/sync/` (directory)
- `functions/src/invitations/` (directory)

### Modified Files

- `firestore.rules` - Add organization-based security
- `frontend/src/contexts/AuthContext.tsx` - Organization awareness
- `frontend/src/pages/CursorCostsPage.tsx` - Role-based features
- `frontend/src/components/CursorUsageChart.tsx` - Org filtering
- `shared/src/schemas/user.ts` - Add organization fields

## Testing Strategy

1. **Unit Tests**
  - Permission system
                  - Data access helpers
                  - API connector logic
2. **Integration Tests**
  - Organization creation flow
                  - User invitation flow
                  - API sync process
                  - Billing webhooks
3. **E2E Tests**
  - Admin user journey
                  - Team manager journey
                  - Member user journey
                  - Upgrade/downgrade flows

## Monitoring & Observability

- API sync success/failure rates
- Billing event processing
- User growth metrics per tier
- API quota usage
- Error tracking (Sentry)
- Performance monitoring (Cloud Monitoring)

## Security Considerations

- Encrypt API credentials at rest
- Rate limiting on API endpoints
- Validate organization membership on all requests
- Audit log for admin actions
- PII handling compliance
- GDPR data export/deletion

## Future Enhancements (Post-MVP)

- SSO integration (SAML, OAuth)
- Advanced budget alerts
- Slack/Teams notifications
- Custom branding per organization
- Webhook support for external integrations
- Advanced forecasting with ML
- Usage policies and enforcement

