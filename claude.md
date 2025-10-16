# AICoder.Guru - Claude Development Reference

**Project:** AICoder.Guru (formerly Cursor Costs)  
**Purpose:** AI Coding Analytics & Cost Tracking Platform  
**Tagline:** "Measure. Motivate. Master AI."  
**Last Updated:** October 15, 2025

---

## 🎯 Project Overview

AICoder.Guru is a multi-tenant SaaS platform that helps development teams track, analyze, and optimize their AI coding tool usage and costs. The platform supports multiple AI providers (Claude, OpenAI, GitHub Copilot, Cursor, etc.) and provides real-time analytics, team management, and cost optimization insights.

### Target Audience
- **Primary:** Managers of development teams wanting to increase AI coding adoption
- **Secondary:** Individual developers tracking personal AI usage
- **Enterprise:** Organizations managing AI tool budgets and ROI

### Core Value Proposition
Simple, real-time visibility into AI coding tool usage across teams with actionable insights to motivate adoption and optimize costs.

---

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- React Router (routing)
- Tailwind CSS v4 (styling)
- Firebase Auth (authentication)
- Firestore (database)

**Backend:**
- Firebase Functions v2 (Cloud Functions)
- Firestore (NoSQL database)
- Firebase Hosting (multi-site)
- Node.js + TypeScript

**Shared:**
- Monorepo with shared types
- Zod for validation
- TypeScript across all packages

### Project Structure

```
aicoder/
├── frontend/           # React app (app.aicoder.guru)
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── pages/      # Route pages
│   │   ├── contexts/   # React contexts
│   │   ├── hooks/      # Custom hooks
│   │   └── lib/        # Utilities
│   └── public/         # Static assets
│
├── website/            # Marketing site (aicoder.guru)
│   ├── src/
│   └── public/
│
├── functions/          # Cloud Functions
│   └── src/
│
├── shared/             # Shared types & utilities
│   └── src/
│       ├── types/      # TypeScript types
│       └── schemas/    # Zod schemas
│
└── docs/               # Documentation
    ├── FRONTEND_ARCHITECTURE.md
    ├── API_INTEGRATIONS.md
    ├── DESIGN_SYSTEM.md
    └── task-reports/
```

---

## 🎨 Branding & Design

### Brand Identity

**Name:** AICoder.Guru  
**Tagline:** "Measure. Motivate. Master AI."  
**Logo:** AI Coder Guru Symbol (Guru icon with meditation pose)

### Color Palette

```css
/* Primary - Orange */
--color-primary-500: #F75C03;    /* CTAs, highlights */
--color-primary-600: #E54F02;    /* Hover states */

/* Secondary - Midnight Green */
--color-secondary-900: #124C5A;  /* Dark backgrounds */
--color-gunmetal-900: #124C5A;   /* Alias for secondary */

/* Accent - Soft Jade Green */
--color-accent-400: #64BFA4;     /* Success, icons */

/* Background - Soft Sand */
--color-sand-300: #F2E8CF;       /* Light mode background */
```

### Logo Files

**Location:** `/Public/Logo/` (source) → `frontend/public/logos/` (deployed)

**Files:**
- `Full logo 2910X634 Midnight no background.png` - Light mode
- `Full logo 2910X634 Sand no background.png` - Dark mode
- `AI Coder Guru Symbol.svg` - Icon/favicon
- `Jade AI Coder Guru Symbol.svg` - Jade variant for checkmarks

### Typography

**Font:** Inter (sans-serif)  
**Weights:** 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

---

## 🔐 Authentication & Multi-Tenancy

### User Tiers

```typescript
type UserTier = 
  | 'free_individual'    // Free CSV upload only
  | 'paid_individual'    // Paid with API connections
  | 'team'               // Team plan
  | 'enterprise'         // Enterprise plan
```

### Roles

```typescript
type OrganizationRole = 
  | 'admin'              // Full org access
  | 'team_manager'       // Team-level access
  | 'member'             // Read-only team access
```

### Authentication Methods

1. **Email/Password** - Standard signup
2. **Google OAuth** - Social login
3. **Email Link** - Passwordless signin

---

## 📊 Data Models

### User

```typescript
interface User {
  id: string
  email: string
  displayName?: string
  tier: UserTier
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

### CursorUsageV2 (Token-based)

```typescript
interface CursorUsageV2 {
  date: string              // YYYY-MM-DD
  model: string             // e.g., "claude-sonnet-3.5"
  inputTokens: number
  outputTokens: number
  cachedInputTokens?: number
  requests: number
  userId?: string
}
```

---

## 🚀 Key Features

### 1. CSV Upload & Analysis (Core Feature)
- **Route:** `/` (default)
- **Access:** All users (free and paid)
- **Components:** `CursorCostsPage`, `CSVImport`, `CursorUsageChart`
- **Features:**
  - Drag & drop CSV upload
  - Token usage visualization
  - Cost breakdown by model
  - Date range filtering
  - Currency selection
  - Guest mode (temporary) + Auth mode (persistent)

### 2. Organization Dashboard
- **Route:** `/dashboard`
- **Access:** Admins only
- **Components:** `DashboardPage`
- **Features:**
  - Total members & active users
  - Aggregate token usage
  - Total cost tracking
  - Top users by usage
  - Model distribution

### 3. Team Management
- **Route:** `/teams`
- **Access:** Admins only
- **Components:** `TeamsPage`, `TeamManagementPanel`
- **Features:**
  - Create/edit teams
  - Assign team managers
  - Add/remove members

### 4. User Management
- **Route:** `/users`
- **Access:** Admins only
- **Components:** `UsersPage`, `UserManagementTable`
- **Features:**
  - Invite users
  - Manage roles
  - View activity
  - Remove users

### 5. API Connections (Priority Feature)
- **Route:** `/api-connections`
- **Access:** Admins (Team/Enterprise), Paid Individuals
- **Components:** `APIConnectionsPage`, `APIConnectionManager`
- **Features:**
  - Connect AI provider APIs
  - Configure sync schedules
  - View sync history
  - Test connections

**Supported Providers (Priority Order):**
1. ⭐ **Anthropic Claude Code Analytics API** (Developer productivity)
2. ⭐ **Anthropic Claude Usage & Cost API** (Token tracking)
3. **OpenAI API**
4. **GitHub Copilot**
5. **Cursor** (CSV only)
6. **Google Gemini**
7. **Codeium**

### 6. Billing & Subscriptions
- **Route:** `/billing`
- **Access:** Admins, Paid Individuals
- **Components:** `BillingPage`
- **Features:**
  - Stripe integration
  - Subscription management
  - Billing history

---

## 🧭 Navigation Structure

### Sidebar Navigation (Primary)

**Component:** `Sidebar.tsx` (vertical, collapsible)

**Navigation by Role:**

| Role | Menu Items |
|------|------------|
| Free Individual | My Usage, Create Team |
| Paid Individual | My Usage, API Connections, Account & Billing |
| Admin | My Usage, Org Dashboard, Team Management, User Management, API Connections*, Billing |
| Team Manager | My Usage, Team Dashboard, Team Members |
| Member | My Usage, Team Overview |

*API Connections only for Team/Enterprise tiers

### Layout System

```
Layout.tsx
  ├─ Sidebar.tsx (if authenticated)
  └─ Page Content
```

**Unauthenticated:** Centered content, no sidebar  
**Authenticated:** Sidebar + content area

---

## 🔌 API Integrations

### Priority 1: Anthropic Claude Code Analytics API

**Purpose:** Track developer productivity metrics  
**Endpoint:** `/v1/organizations/usage_report/claude_code`  
**Auth:** Admin API Key (`sk-ant-admin...`)

**Key Metrics:**
- Sessions per developer
- Lines of code (added/removed)
- Commits via Claude Code
- Pull requests created
- Tool acceptance rates
- Model usage & costs

**Implementation:** `functions/src/connectors/ClaudeCodeConnector.ts`

### Priority 2: Anthropic Claude Usage & Cost API

**Purpose:** Token-level usage tracking  
**Endpoints:** 
- `/v1/organizations/usage_report/messages`
- `/v1/organizations/cost_report`

**Key Metrics:**
- Token counts (input, output, cached)
- Actual costs in USD
- Model breakdown
- Workspace attribution

**Implementation:** `functions/src/connectors/AnthropicConnector.ts`

### Integration Architecture

```typescript
// Base connector interface
abstract class BaseConnector {
  abstract testConnection(): Promise<boolean>
  abstract fetchUsage(startDate: Date, endDate: Date): Promise<UsageData[]>
  async sync(orgId: string, connectionId: string): Promise<SyncResult>
}

// Specific connectors extend base
class ClaudeCodeConnector extends BaseConnector { }
class AnthropicConnector extends BaseConnector { }
class OpenAIConnector extends BaseConnector { }
```

---

## 🗂️ Firestore Collections

```
users/{userId}
  - User profile and settings

organizations/{orgId}
  - Organization details
  
organizations/{orgId}/members/{userId}
  - Organization membership

organizations/{orgId}/teams/{teamId}
  - Team information

organizations/{orgId}/usage/{usageId}
  - Usage data records

organizations/{orgId}/apiConnections/{connectionId}
  - API connection configs (encrypted)

organizations/{orgId}/syncHistory/{syncId}
  - Sync job history

invitations/{invitationId}
  - Pending user invitations

subscriptions/{subscriptionId}
  - Stripe subscription data
```

---

## 🛠️ Development Guidelines

### Code Style

1. **TypeScript:** Strict mode enabled
2. **Components:** Functional components with hooks
3. **Naming:** 
   - Components: PascalCase (`UserManagementTable.tsx`)
   - Files: camelCase for utilities (`firestore.ts`)
   - Hooks: `use` prefix (`useUserUsageData.ts`)
4. **Imports:** Absolute imports with `@/` alias

### Component Structure

```tsx
// 1. Imports
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

// 2. Types/Interfaces
interface MyComponentProps {
  title: string
}

// 3. Component
export default function MyComponent({ title }: MyComponentProps) {
  // 4. Hooks
  const { currentUser } = useAuth()
  const [state, setState] = useState()
  
  // 5. Handlers
  const handleClick = () => { }
  
  // 6. Render
  return (
    <div>{title}</div>
  )
}
```

### Styling Guidelines

1. **Use Tailwind classes** - No custom CSS unless necessary
2. **Dark mode support** - Always include `dark:` variants
3. **Responsive design** - Mobile-first with `md:`, `lg:` breakpoints
4. **Color usage:**
   - Primary (`primary-500`) for CTAs
   - Secondary (`gunmetal-900`) for dark backgrounds
   - Accent (`accent-400`) for success/highlights
   - Sand (`sand-300`) for light backgrounds

### State Management

1. **Local state:** `useState` for component-specific state
2. **Shared state:** React Context for auth, organization, theme
3. **Server state:** Custom hooks with Firestore real-time listeners
4. **Form state:** Controlled components with `useState`

---

## 🚨 Common Issues & Solutions

### Issue: Sidebar not showing
**Solution:** Check `Layout.tsx` - sidebar only renders for authenticated users

### Issue: Navigation.tsx vs Sidebar.tsx
**Solution:** Use `Sidebar.tsx` (vertical). `Navigation.tsx` is deprecated.

### Issue: White text on white background
**Solution:** Always include dark mode classes: `text-neutral-900 dark:text-white`

### Issue: Logo not loading
**Solution:** Check path: `/logos/logo-light.png` (not `/public/logos/...`)

### Issue: Firebase env vars not working
**Solution:** Vite requires `VITE_` prefix: `VITE_FIREBASE_API_KEY`

### Issue: TypeScript errors with Firestore Timestamp
**Solution:** Check if value is `Date` or `Timestamp`:
```typescript
const date = timestamp instanceof Date 
  ? timestamp 
  : timestamp.toDate()
```

---

## 📝 Current Tasks & Priorities

### Phase 1: Core Infrastructure ✅
- [x] Multi-tenant architecture
- [x] Authentication (Email, Google, Email Link)
- [x] Organization & team management
- [x] Role-based access control
- [x] Sidebar navigation
- [x] CSV upload & charts

### Phase 2: API Integrations 🔄 (Current)
- [ ] Claude Code Analytics API connector
- [ ] Claude Usage & Cost API connector
- [ ] API connection management UI
- [ ] Sync scheduler (Cloud Functions)
- [ ] Credential encryption

### Phase 3: Analytics & Insights ⏳
- [ ] Developer productivity dashboard
- [ ] Team leaderboards
- [ ] Cost optimization recommendations
- [ ] Export functionality (PDF, Excel)

### Phase 4: Enterprise Features ⏳
- [ ] SSO integration
- [ ] Custom reports builder
- [ ] Slack/Teams notifications
- [ ] Advanced permissions

---

## 🧹 Cleanup Tasks

### Components to Remove
1. **Navigation.tsx** - Replaced by Sidebar.tsx
2. **HomePage.tsx** - Template code, not used
3. **EnhancedCursorCostsPage.tsx** - Duplicate of CursorCostsPage

### Branding Updates Needed
1. Replace all "Fueld" references with "AICoder.Guru"
2. Update logo files in `frontend/public/logos/`
3. Update favicon to Guru symbol
4. Update color scheme to new palette
5. Update all component styling to use new colors

---

## 📚 Documentation

### Key Documents
- **Frontend Architecture:** `docs/FRONTEND_ARCHITECTURE.md`
- **API Integrations:** `docs/API_INTEGRATIONS.md`
- **Design System:** `docs/DESIGN_SYSTEM.md`
- **Deployment Guide:** `docs/DEPLOYMENT_GUIDE.md`
- **Multi-Tenant Plan:** `.cursor/plans/team-multi-fe283af8.plan.md`

### External Resources
- Firebase Docs: https://firebase.google.com/docs
- Tailwind CSS v4: https://tailwindcss.com
- React Docs: https://react.dev
- Anthropic API: https://docs.anthropic.com

---

## 🎯 Quick Commands

### Development
```bash
# Frontend dev server
cd frontend && npm run dev

# Functions dev server
cd functions && npm run serve

# Build all
npm run build

# Deploy
firebase deploy
```

### Firebase
```bash
# Deploy functions only
firebase deploy --only functions

# Deploy hosting only
firebase deploy --only hosting

# Deploy specific site
firebase deploy --only hosting:aicoder-guru
firebase deploy --only hosting:app-aicoder-guru
```

---

## 🔑 Key Principles

1. **User-First:** Prioritize core CSV upload functionality for all users
2. **Role-Based:** Show only relevant features based on user role/tier
3. **Mobile-First:** Responsive design for all screen sizes
4. **Dark Mode:** Support both light and dark themes
5. **Performance:** Optimize for fast load times and smooth interactions
6. **Security:** Encrypt sensitive data, follow Firebase security best practices
7. **Accessibility:** WCAG AA compliance for all UI elements

---

**Last Updated:** October 15, 2025  
**Maintained By:** AICoder.Guru Team  
**For:** Claude AI Assistant

---

## 💡 Tips for Claude

1. **Always check `claude.md`** before starting work
2. **Refer to architecture docs** for component locations
3. **Use existing patterns** - don't reinvent components
4. **Follow branding guidelines** - use correct colors and logos
5. **Test dark mode** - always include dark: variants
6. **Check for duplicates** - we've consolidated components
7. **Update documentation** - keep this file current
8. **Use TypeScript** - leverage types from `@shared`
9. **Follow Firebase rules** - respect security rules
10. **Ask for clarification** - if unsure about architecture decisions


