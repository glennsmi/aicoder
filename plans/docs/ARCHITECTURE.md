# AICoder.Guru Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USERS & CLIENTS                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌───────────────────────┐       ┌──────────────────────┐
        │  Marketing Website    │       │   Main Application   │
        │   aicoder.guru        │       │  app.aicoder.guru    │
        │                       │       │                      │
        │  - Landing Page       │       │  - Dashboard         │
        │  - Features           │       │  - Analytics         │
        │  - Pricing            │       │  - Team Mgmt         │
        │  - About/FAQ          │       │  - User Mgmt         │
        │  - Legal Pages        │       │  - API Connections   │
        │                       │       │  - CSV Upload        │
        │  React + Vite         │       │  React + Vite        │
        │  Tailwind CSS v4      │       │  Tailwind CSS v4     │
        └───────────┬───────────┘       └──────────┬───────────┘
                    │                              │
                    └───────────┬──────────────────┘
                                │
                                ▼
        ┌────────────────────────────────────────────────────┐
        │         Firebase Hosting (Multi-Site)              │
        │  ┌──────────────────────┬──────────────────────┐  │
        │  │  Site: aicoder-guru  │ Site: app-aicoder-   │  │
        │  │  Path: website/dist  │ guru                 │  │
        │  │                      │ Path: frontend/dist  │  │
        │  └──────────────────────┴──────────────────────┘  │
        └────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
                ▼               ▼               ▼
    ┌──────────────────┐ ┌─────────────┐ ┌────────────────────┐
    │ Firebase Auth    │ │  Firestore  │ │ Cloud Functions    │
    │                  │ │  Database   │ │                    │
    │ - Google Sign-In │ │             │ │ - Team Management  │
    │ - Email/Password │ │ Collections:│ │ - API Connectors   │
    │ - Email Link     │ │ - orgs      │ │ - Email Sending    │
    │ - Session Mgmt   │ │ - members   │ │ - Data Sync        │
    │                  │ │ - teams     │ │                    │
    │ SHARED across    │ │ - users     │ │ Node.js + TS       │
    │ both sites       │ │ - usage     │ │ Region: EU West 2  │
    │                  │ │ - invites   │ │                    │
    └──────────────────┘ │ - apiConns  │ └────────────────────┘
                         │ - syncHist  │
                         │             │
                         │ SHARED DB   │
                         └─────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  Security Rules       │
                    │  Multi-Tenant RBAC    │
                    │  - Admin              │
                    │  - Team Manager       │
                    │  - Member             │
                    └───────────────────────┘
```

## Data Flow

### User Signup Flow
```
1. User visits marketing website
   └─→ https://aicoder.guru

2. Clicks "Start Free Trial"
   └─→ Redirected to https://app.aicoder.guru

3. Signs up with Google/Email
   └─→ Firebase Authentication creates user

4. Organization setup wizard appears
   └─→ Creates organization document in Firestore
   └─→ Creates member document linking user to org
   └─→ Sets user as Admin role

5. Redirected to dashboard
   └─→ Organization context loaded
   └─→ Analytics displayed
```

### Data Access Flow
```
User Request
    │
    ▼
Frontend App (React)
    │
    ├─→ Read from Firestore
    │   └─→ Security Rules check:
    │       - Is user authenticated?
    │       - Is user member of organization?
    │       - Does user have required permission?
    │       └─→ Allow/Deny
    │
    └─→ Call Cloud Function
        └─→ Function validates:
            - Authentication token
            - Organization membership
            - Role permissions
            └─→ Execute business logic
                └─→ Write to Firestore
```

### CSV Upload Flow
```
User uploads CSV
    │
    ▼
Frontend validates format
    │
    ▼
Parse CSV rows
    │
    ▼
For each row:
    - Extract: date, model, tokens, cost
    - Associate with: userId, organizationId
    - Write to: /usage collection
    │
    ▼
Real-time listeners update UI
    │
    ▼
Charts re-render with new data
```

### API Sync Flow
```
User adds API connection
    │
    ▼
Frontend calls testApiConnection(credentials)
    │
    ▼
Cloud Function validates credentials
    │
    ├─→ Success: Returns connection status
    │   └─→ Frontend calls addApiConnection()
    │       └─→ Encrypted credentials stored in Firestore
    │           └─→ Scheduled sync job created
    │
    └─→ Failure: Returns error message
        └─→ User prompted to check credentials

On schedule:
    Cloud Function syncApiConnection(connectionId)
        │
        ▼
    Fetch usage data from provider API
        │
        ▼
    Transform to standard format
        │
        ▼
    Write to /usage collection
        │
        ▼
    Update /syncHistory with result
```

## Technology Stack

### Frontend (Both Sites)
```
┌────────────────────────────────────┐
│  React 18                          │
│  ├─ TypeScript                     │
│  ├─ React Router v6                │
│  ├─ Context API (state)            │
│  └─ Hooks                          │
├────────────────────────────────────┤
│  Styling                           │
│  ├─ Tailwind CSS v4                │
│  ├─ shadcn/ui components           │
│  └─ Lucide React (icons)           │
├────────────────────────────────────┤
│  Build Tools                       │
│  ├─ Vite 5                         │
│  ├─ TypeScript 5                   │
│  └─ ESLint                         │
├────────────────────────────────────┤
│  Firebase SDK                      │
│  ├─ firebase/auth                  │
│  ├─ firebase/firestore             │
│  └─ firebase/functions             │
├────────────────────────────────────┤
│  Charts & Data Viz                 │
│  ├─ Recharts                       │
│  ├─ date-fns                       │
│  └─ CSV parsing                    │
└────────────────────────────────────┘
```

### Backend (Cloud Functions)
```
┌────────────────────────────────────┐
│  Runtime                           │
│  ├─ Node.js 20                     │
│  ├─ TypeScript                     │
│  └─ Firebase Functions v2          │
├────────────────────────────────────┤
│  Services                          │
│  ├─ Firebase Admin SDK             │
│  ├─ Firestore (database)           │
│  ├─ SendGrid (email)               │
│  └─ Stripe (payments)              │
├────────────────────────────────────┤
│  API Connectors                    │
│  ├─ Cursor API (planned)           │
│  ├─ GitHub Copilot API             │
│  ├─ Codeium API                    │
│  ├─ Claude Code API                │
│  ├─ OpenAI API                     │
│  └─ Tabnine API                    │
├────────────────────────────────────┤
│  Deployment                        │
│  ├─ Region: europe-west2           │
│  ├─ Auto-scaling                   │
│  └─ HTTPS only                     │
└────────────────────────────────────┘
```

### Database (Firestore)
```
┌────────────────────────────────────┐
│  Collections                       │
│                                    │
│  /organizations/{orgId}            │
│    - name, createdAt, settings     │
│    - subscription, tier            │
│    - memberCount, teamCount        │
│                                    │
│  /members/{memberId}               │
│    - userId, organizationId        │
│    - role, teams, permissions      │
│    - joinedAt, invitedBy           │
│                                    │
│  /teams/{teamId}                   │
│    - organizationId, name          │
│    - managerId, memberIds          │
│    - createdAt                     │
│                                    │
│  /users/{userId}                   │
│    - email, displayName            │
│    - photoURL, settings            │
│    - lastLogin, createdAt          │
│                                    │
│  /usage/{usageId}                  │
│    - organizationId, userId        │
│    - teamId (optional)             │
│    - date, model, provider         │
│    - tokens (input/output/cached)  │
│    - cost, currency                │
│                                    │
│  /invitations/{inviteId}           │
│    - organizationId, email         │
│    - role, teams                   │
│    - status, expiresAt             │
│                                    │
│  /apiConnections/{connId}          │
│    - organizationId, provider      │
│    - credentials (encrypted)       │
│    - status, lastSync              │
│                                    │
│  /syncHistory/{syncId}             │
│    - connectionId, startTime       │
│    - status, recordsSynced         │
│    - errors                        │
└────────────────────────────────────┘
```

## Security Model

### Authentication Layers
```
┌─────────────────────────────────────────────┐
│  Layer 1: Firebase Authentication          │
│  - Verifies user identity                  │
│  - Issues JWT tokens                       │
│  - Manages sessions                        │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│  Layer 2: Firestore Security Rules         │
│  - Checks authentication token             │
│  - Validates organization membership       │
│  - Enforces multi-tenant isolation         │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│  Layer 3: Role-Based Access Control        │
│  - Admin: Full organization access         │
│  - Team Manager: Team data + team members  │
│  - Member: Own data only                   │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│  Layer 4: Application Logic                │
│  - Frontend validates permissions          │
│  - Cloud Functions double-check            │
│  - UI adapts to role                       │
└─────────────────────────────────────────────┘
```

### Data Isolation
```
Organization A                Organization B
├─ Members                    ├─ Members
│  ├─ User 1 (Admin)          │  ├─ User 3 (Admin)
│  └─ User 2 (Member)         │  └─ User 4 (Member)
├─ Teams                      ├─ Teams
│  └─ Team Alpha              │  └─ Team Beta
└─ Usage Data                 └─ Usage Data
   └─ Filtered by orgId          └─ Filtered by orgId

Firestore Rules ensure:
- User 1 can ONLY see Org A data
- User 3 can ONLY see Org B data
- Cross-org queries are BLOCKED
```

## Deployment Architecture

### Multi-Site Hosting
```
Firebase Project: aicoder-guru
│
├─ Hosting Site 1: "aicoder-guru"
│  ├─ Source: website/dist
│  ├─ Default URL: aicoder-guru.web.app
│  ├─ Custom Domain: aicoder.guru
│  └─ Purpose: Marketing & lead generation
│
└─ Hosting Site 2: "app-aicoder-guru"
   ├─ Source: frontend/dist
   ├─ Default URL: app-aicoder-guru.web.app
   ├─ Custom Domain: app.aicoder.guru
   └─ Purpose: SaaS application
```

### Build & Deploy Pipeline
```
Local Development
    │
    ├─ website/
    │  └─ npm run dev → http://localhost:5175
    │
    └─ frontend/
       └─ npm run dev → http://localhost:5173

Build Process
    │
    ├─ cd website && npm run build
    │  └─ Output: website/dist/
    │
    └─ cd frontend && npm run build
       └─ Output: frontend/dist/

Deployment
    │
    ├─ firebase deploy --only hosting:aicoder-guru
    │  └─ Uploads website/dist/ → Marketing site
    │
    └─ firebase deploy --only hosting:app-aicoder-guru
       └─ Uploads frontend/dist/ → App site
```

## Scalability Considerations

### Firestore Scaling
- **Reads**: 50k/day free, then $0.06/100k
- **Writes**: 20k/day free, then $0.18/100k
- **Storage**: 1 GB free, then $0.18/GB/month
- **Indexing**: Composite indexes for common queries
- **Caching**: Frontend caches user/org data

### Cloud Functions Scaling
- **Auto-scaling**: Adjusts to demand
- **Region**: europe-west2 (low latency)
- **Timeout**: 60s max (configurable)
- **Memory**: 256MB default (adjustable)
- **Concurrency**: 1000 concurrent executions

### Hosting Scaling
- **CDN**: Global edge network
- **Bandwidth**: 10 GB/month free, then $0.15/GB
- **Requests**: Unlimited
- **Cache**: Automatic asset caching

## Monitoring & Observability

### Firebase Console Dashboards
```
Authentication
├─ Active users
├─ Sign-in methods
└─ Authentication logs

Firestore
├─ Document count
├─ Read/write operations
├─ Storage usage
└─ Index usage

Functions
├─ Invocations
├─ Execution time
├─ Error rate
└─ Logs

Hosting
├─ Bandwidth
├─ Requests
└─ Deployment history
```

### Application Metrics
```
User Metrics
├─ Sign-ups per day
├─ Active organizations
├─ CSV uploads
└─ API connections

Usage Metrics
├─ Total tokens tracked
├─ Cost aggregated
├─ Models used
└─ Top users/teams

Performance Metrics
├─ Page load time
├─ Time to interactive
├─ API response time
└─ Function cold starts
```

## Cost Estimation

### Small Team (10 users, 50k events/month)
```
Firebase Costs:
├─ Firestore: ~$5/month
│  ├─ Reads: 1.5M/month
│  ├─ Writes: 300k/month
│  └─ Storage: 2 GB
├─ Functions: ~$3/month
│  ├─ Invocations: 100k
│  └─ Compute time: 10k GB-seconds
├─ Hosting: Free (within quota)
│  ├─ Bandwidth: 5 GB
│  └─ Storage: 500 MB
└─ Auth: Free (within quota)

Total: ~$8/month + Stripe fees
```

### Medium Team (50 users, 500k events/month)
```
Firebase Costs:
├─ Firestore: ~$40/month
├─ Functions: ~$20/month
├─ Hosting: ~$5/month
└─ Auth: Free

Total: ~$65/month + Stripe fees
```

## Future Architecture Enhancements

### Phase 1: Current (MVP)
- ✅ Multi-tenant SaaS
- ✅ CSV upload
- ✅ Basic analytics
- ✅ Team management

### Phase 2: Enhanced (Q1 2026)
- 🔄 API integrations (Cursor, GitHub Copilot)
- 🔄 Real-time sync
- 🔄 Advanced analytics
- 🔄 Stripe billing integration

### Phase 3: Scale (Q2 2026)
- ⏳ Webhooks for events
- ⏳ Export to BigQuery for ML
- ⏳ Custom reports builder
- ⏳ Slack/Teams integrations

### Phase 4: Enterprise (Q3 2026)
- ⏳ SSO/SAML
- ⏳ Dedicated instances
- ⏳ SLA guarantees
- ⏳ On-premise option

---

**Architecture Version:** 1.0  
**Last Updated:** October 15, 2025  
**Status:** Production-ready MVP

