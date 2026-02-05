# Frontend Architecture Documentation

**Project:** AICoder.Guru  
**Last Updated:** October 15, 2025  
**Status:** Active Development

---

## 🎯 Overview

The AICoder.Guru frontend is a React + TypeScript application built with Vite, featuring a multi-tenant SaaS architecture with role-based access control. The application provides AI coding cost tracking and analytics for individuals, teams, and enterprises.

## 📁 Directory Structure

```
frontend/src/
├── components/          # Reusable UI components
│   ├── Layout.tsx      # Main layout wrapper (Sidebar + Content)
│   ├── Sidebar.tsx     # ✅ PRIMARY: Vertical sidebar navigation
│   ├── Navigation.tsx  # ⚠️  DEPRECATED: Horizontal nav (to be removed)
│   ├── AuthModal.tsx   # Authentication modal
│   ├── AccountSettingsModal.tsx
│   ├── OrganizationSetupWizard.tsx
│   ├── TeamManagementPanel.tsx
│   ├── UserManagementTable.tsx
│   ├── APIConnectionManager.tsx
│   ├── CSVImport.tsx   # CSV file upload
│   ├── CSVDragDrop.tsx
│   ├── CursorUsageChart.tsx
│   ├── CursorCostsSummary.tsx
│   ├── CursorCostsTable.tsx
│   ├── DateRangePicker.tsx
│   ├── CurrencySelector.tsx
│   ├── ThemeToggle.tsx
│   └── ConfirmationModal.tsx
│
├── pages/              # Route-level page components
│   ├── CursorCostsPage.tsx      # ✅ DEFAULT: CSV upload & charts
│   ├── DashboardPage.tsx        # Organization dashboard
│   ├── LoginPage.tsx            # Login/signup page
│   ├── CreateOrganizationPage.tsx
│   ├── TeamsPage.tsx            # Team management (admins)
│   ├── UsersPage.tsx            # User management (admins)
│   ├── BillingPage.tsx          # Billing & subscriptions
│   ├── APIConnectionsPage.tsx   # API integrations
│   ├── TeamDashboardPage.tsx    # Team manager dashboard
│   ├── TeamMembersPage.tsx      # Team member list
│   ├── TeamOverviewPage.tsx     # Team member view
│   ├── CompleteEmailSignInPage.tsx
│   ├── HomePage.tsx             # ⚠️  DEPRECATED: Template code
│   ├── AboutPage.tsx
│   ├── AdminPage.tsx            # Legacy admin panel
│   └── EnhancedCursorCostsPage.tsx  # ⚠️  DEPRECATED
│
├── contexts/           # React Context providers
│   ├── AuthContext.tsx          # Authentication & user state
│   ├── OrganizationContext.tsx  # Organization & members
│   └── ThemeContext.tsx         # Dark/light theme
│
├── hooks/              # Custom React hooks
│   ├── useUserUsageData.ts      # Individual usage data
│   ├── useOrgAnalytics.ts       # Organization analytics
│   ├── useCurrency.ts           # Currency formatting
│   └── useEnhancedUserUsageData.ts
│
├── lib/                # Utility libraries
│   ├── firestore.ts             # Firestore helpers
│   ├── enhancedFirestore.ts
│   └── utils.ts                 # General utilities
│
├── config/             # Configuration files
│   ├── firebase.ts              # Firebase config (env vars)
│   └── firebaseApp.ts           # Firebase app initialization
│
├── App.tsx             # Main app component & routing
├── main.tsx            # App entry point
└── index.css           # Global styles (Tailwind v4)
```

## 🏗️ Core Architecture Patterns

### 1. Layout System

**Current Implementation:**
```
Layout.tsx
  └─ Sidebar.tsx (vertical, collapsible)
      └─ Page Content (main area)
```

**Key Features:**
- Authenticated users see sidebar + content
- Unauthenticated users see centered content only
- Sidebar collapses to icon-only mode
- Role-based navigation items

### 2. Authentication Flow

```
AuthContext.tsx
  ├─ Firebase Auth (Email/Password, Google, Email Link)
  ├─ User document in Firestore
  └─ Organization membership tracking

Flow:
1. User signs up/logs in
2. AuthContext creates/fetches user document
3. OrganizationContext loads organization data
4. Sidebar renders based on role/tier
```

### 3. Multi-Tenancy Model

```
User
  ├─ tier: 'free_individual' | 'paid_individual' | 'team' | 'enterprise'
  ├─ currentRole: 'individual' | 'admin' | 'team_manager' | 'member'
  └─ currentOrganizationId: string | null

Organization
  ├─ members: OrganizationMember[]
  ├─ teams: Team[]
  ├─ tier: OrganizationTier
  └─ settings: OrganizationSettings
```

### 4. Role-Based Access Control (RBAC)

**Roles:**
- **Admin**: Full organization access (dashboard, teams, users, billing, API)
- **Team Manager**: Team-level access (team dashboard, team members)
- **Member**: Read-only team access (team overview)
- **Individual**: Personal usage only (CSV upload, charts)

**Navigation by Role:**

| Role | Navigation Items |
|------|------------------|
| **Free Individual** | My Usage, Create Team |
| **Paid Individual** | My Usage, API Connections, Account & Billing |
| **Admin** | My Usage, Org Dashboard, Team Management, User Management, API Connections*, Billing |
| **Team Manager** | My Usage, Team Dashboard, Team Members |
| **Member** | My Usage, Team Overview |

*API Connections only for Team/Enterprise tiers

## 📄 Key Pages

### CursorCostsPage (Default Route: `/`)

**Purpose:** Core functionality - CSV upload and usage charts  
**Accessible By:** All users (free and paid)  
**Features:**
- CSV drag & drop import
- Token usage visualization
- Cost breakdown by model
- Date range filtering
- Currency selection
- Guest mode (temporary data display)
- Authenticated mode (persistent storage)

**Key Components:**
- `CSVImport` - File upload handler
- `CursorUsageChart` - Usage visualization
- `CursorCostsSummary` - Cost metrics
- `CursorCostsTable` - Detailed breakdown

### DashboardPage (Route: `/dashboard`)

**Purpose:** Organization-wide analytics  
**Accessible By:** Admins only  
**Features:**
- Total members & active users
- Aggregate token usage
- Total cost tracking
- Average cost per user
- Top users by usage
- Model distribution
- Daily usage trends

### TeamsPage (Route: `/teams`)

**Purpose:** Team management  
**Accessible By:** Admins only  
**Features:**
- Create teams
- Assign team managers
- Add/remove team members
- View team analytics

### UsersPage (Route: `/users`)

**Purpose:** User management  
**Accessible By:** Admins only  
**Features:**
- Invite users to organization
- Manage user roles
- View user activity
- Remove users

### BillingPage (Route: `/billing`)

**Purpose:** Subscription & billing management  
**Accessible By:** Admins, Paid Individuals  
**Features:**
- Stripe integration
- Subscription management
- Billing history
- Payment methods

### APIConnectionsPage (Route: `/api-connections`)

**Purpose:** API integrations setup  
**Accessible By:** Admins (Team/Enterprise), Paid Individuals  
**Features:**
- Connect to AI provider APIs
- Configure sync schedules
- View sync history
- Test connections

**Supported Providers:**
1. **Anthropic Claude** (Usage & Cost API)
2. **Anthropic Claude Code** (Analytics API) - Priority
3. **OpenAI API**
4. **GitHub Copilot**
5. **Cursor** (CSV only)
6. **Google Gemini**
7. **Codeium**

## 🎨 Styling & Theming

### Color Palette (AICoder.Guru Brand)

```css
/* Primary - Orange */
--color-primary-500: #F75C03;

/* Secondary - Midnight Green */
--color-gunmetal-900: #124C5A;

/* Accent - Soft Jade Green */
--color-accent-500: #64BFA4;

/* Background - Soft Sand */
--color-sand-50: #F2E8CF;
```

### Dark Mode Support

- System preference detection
- Manual toggle in sidebar
- Persisted to localStorage
- Tailwind `dark:` classes

### Responsive Design

- Mobile-first approach
- Sidebar collapses on mobile
- Responsive grid layouts
- Touch-friendly interactions

## 🔄 State Management

### Context Providers (Nested)

```tsx
<ThemeProvider>
  <AuthProvider>
    <OrganizationProvider>
      <Router>
        <Layout>
          {/* Routes */}
        </Layout>
      </Router>
    </OrganizationProvider>
  </AuthProvider>
</ThemeProvider>
```

### Data Flow

1. **AuthContext**: Manages Firebase auth state & user document
2. **OrganizationContext**: Loads organization, members, teams
3. **ThemeContext**: Manages dark/light mode
4. **Custom Hooks**: Fetch specific data (usage, analytics, currency)

## 🚀 Routing

### Route Structure

```tsx
/ (default)              → CursorCostsPage (CSV upload & charts)
/auth/complete           → CompleteEmailSignInPage
/create-organization     → CreateOrganizationPage

// Admin routes
/dashboard               → DashboardPage
/teams                   → TeamsPage
/users                   → UsersPage
/billing                 → BillingPage
/api-connections         → APIConnectionsPage

// Team routes
/team-dashboard          → TeamDashboardPage
/team-members            → TeamMembersPage
/team-overview           → TeamOverviewPage

* (catch-all)            → Redirect to /
```

### Route Guards

Currently implemented in `Layout.tsx`:
- Unauthenticated users can access all routes but see limited content
- Sidebar navigation items are filtered by role/tier
- Future: Add explicit route guards for admin-only pages

## 🔧 Component Cleanup Needed

### ⚠️ Components to Remove/Refactor

1. **Navigation.tsx** - Horizontal navigation (replaced by Sidebar)
   - Currently unused
   - Can be safely deleted
   - All navigation logic moved to Sidebar.tsx

2. **HomePage.tsx** - Template homepage
   - Contains demo content
   - Not used in routing
   - Should be removed or repurposed

3. **EnhancedCursorCostsPage.tsx** - Duplicate page
   - Superseded by CursorCostsPage.tsx
   - Can be safely deleted

### ✅ Components to Keep

1. **Sidebar.tsx** - Primary navigation
   - Vertical sidebar
   - Role-based menu items
   - Collapsible design
   - User menu with logout
   - Theme toggle
   - Settings access

2. **Layout.tsx** - Main layout wrapper
   - Uses Sidebar.tsx
   - Handles auth state
   - Provides consistent structure

## 📊 Data Models

### User

```typescript
interface User {
  id: string
  email: string
  displayName?: string
  tier: 'free_individual' | 'paid_individual' | 'team' | 'enterprise'
  currentRole?: OrganizationRole
  currentOrganizationId?: string
  currency?: string
  createdAt: Date
  updatedAt: Date
}
```

### Organization

```typescript
interface Organization {
  id: string
  name: string
  tier: OrganizationTier
  ownerId: string
  billingPlan: BillingPlan
  settings: OrganizationSettings
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### OrganizationMember

```typescript
interface OrganizationMember {
  userId: string
  email: string
  displayName?: string
  role: OrganizationRole
  joinedAt: Timestamp
  invitedBy?: string
}
```

### CursorUsageV2 (Token-based)

```typescript
interface CursorUsageV2 {
  date: string
  model: string
  inputTokens: number
  outputTokens: number
  cachedInputTokens?: number
  requests: number
  userId?: string
}
```

## 🔐 Security

### Firestore Security Rules

- Users can only read/write their own data
- Organization members can read organization data
- Admins can manage organization
- Team managers can manage their teams
- See `firestore.rules` for complete rules

### Environment Variables

```env
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
VITE_FIREBASE_MEASUREMENT_ID=xxx
```

## 🧪 Testing Strategy

### Unit Tests (Planned)
- Component rendering
- Hook behavior
- Utility functions

### Integration Tests (Planned)
- Auth flow
- Data fetching
- Navigation

### E2E Tests (Planned)
- CSV upload flow
- Organization creation
- Team management

## 📈 Performance Optimizations

### Current
- Lazy loading with React.lazy (planned)
- Memoization with useMemo/useCallback
- Firestore query optimization
- Image optimization

### Planned
- Code splitting by route
- Virtual scrolling for large lists
- Service worker for offline support
- CDN for static assets

## 🚧 Known Issues & Tech Debt

1. **Duplicate Navigation Components**
   - Navigation.tsx should be removed
   - All navigation consolidated in Sidebar.tsx

2. **Unused Pages**
   - HomePage.tsx (template code)
   - EnhancedCursorCostsPage.tsx (duplicate)

3. **Missing Route Guards**
   - Need explicit protection for admin routes
   - Should redirect non-admins attempting to access admin pages

4. **Currency Handling**
   - Currency selector needs better UX
   - Should persist user preference

5. **Error Boundaries**
   - Need error boundaries for graceful error handling
   - Better error messages for users

## 🔮 Future Enhancements

### Phase 1 (Current)
- ✅ Multi-tenant architecture
- ✅ Role-based access control
- ✅ CSV upload & charts
- 🔄 API integrations (in progress)

### Phase 2 (Next)
- Real-time data sync
- Advanced analytics dashboards
- Team collaboration features
- Export functionality (PDF, Excel)

### Phase 3 (Future)
- Mobile app (React Native)
- Slack/Teams integrations
- Custom reports builder
- AI-powered insights

## 📚 Related Documentation

- [API Integrations Guide](./API_INTEGRATIONS.md)
- [Multi-Tenant Plan](../.cursor/plans/team-multi-fe283af8.plan.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Design System](./DESIGN_SYSTEM.md)

---

**Last Updated:** October 15, 2025  
**Maintained By:** AICoder.Guru Team  
**Status:** 🔄 Active Development


