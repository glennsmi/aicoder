# App Structure - Core Functionality Restored

## ✅ Current Setup (What You'll See Now)

### Default Landing Page: **CSV Upload & Charts** (`/`)

**All users** (free, paid, team, enterprise) land on the **CursorCostsPage** with:

✅ **Drag & Drop CSV Import**
- Drop your Cursor usage CSV file
- Instant parsing and validation
- Dedupe detection
- Save to Firestore

✅ **Interactive Charts**
- Usage over time
- Token breakdown (input/output/cached)
- Model comparison
- Cost analysis

✅ **Rich Data Tables**
- Sortable columns
- Filterable by date, model, cost
- Per-request detail view

✅ **Currency Selector**
- View costs in GBP, USD, EUR

✅ **Theme Toggle**
- Light/Dark mode

### Sidebar Navigation (Multi-Tenant)

**All Users See:**
```
📊 My Usage (/) 
   ↳ CSV upload, charts, your personal data
   
⚙️ Settings
   ↳ Account settings, currency, preferences
```

**Admin Users Additionally See:**
```
📈 Organization Dashboard (/dashboard)
   ↳ Multi-user analytics, team overview
   
👥 Team Management (/teams)
   ↳ Create teams, assign managers
   
👤 User Management (/users)
   ↳ Invite users, manage roles
   
🔌 API Connections (/api-connections) [Team/Enterprise tier]
   ↳ Connect Cursor, GitHub Copilot, etc.
   
💳 Billing & Subscription (/billing)
   ↳ Manage subscription, seats, invoices
```

**Team Managers Additionally See:**
```
📊 Team Dashboard (/team-dashboard)
   ↳ Your team's aggregate analytics
   
👥 Team Members (/team-members)
   ↳ View and manage your team
```

## 🎯 User Journey

### Free Individual User
1. **Sign up** → Google or Email
2. **Land on `/`** → CursorCostsPage
3. **Drag CSV** → Upload usage data
4. **View charts** → See your costs/usage
5. **Save data** → Stored in Firestore under your organization

### Team Admin User
1. **Sign up** → Create organization
2. **Land on `/`** → CursorCostsPage (your personal usage)
3. **Upload CSV** → Your data
4. **Click "Organization Dashboard"** → See all team members
5. **Invite users** → Add team members
6. **Manage teams** → Create teams, assign managers
7. **Connect APIs** → Auto-sync from Cursor/GitHub (paid tiers)

### Invited Team Member
1. **Receive invite** → Email with link
2. **Sign up** → Join organization
3. **Land on `/`** → CursorCostsPage
4. **Upload CSV** → Your usage data
5. **View "My Usage"** → Only see your own data
6. Admin can see aggregate in Organization Dashboard

## 📁 Route Structure

```
/                          → CursorCostsPage (CSV upload + charts)
                             For: ALL users
                             
/dashboard                 → DashboardPage (org-wide analytics)
                             For: Admins, Team Managers
                             
/teams                     → TeamsPage (team management)
                             For: Admins
                             
/users                     → UsersPage (user management)
                             For: Admins
                             
/api-connections           → APIConnectionsPage
                             For: Admins (Team/Enterprise tier)
                             
/billing                   → BillingPage
                             For: Admins
                             
/team-dashboard            → TeamDashboardPage
                             For: Team Managers
                             
/team-members              → TeamMembersPage
                             For: Team Managers
                             
/create-organization       → OrganizationSetupWizard
                             For: New signups (no invitation)
                             
/auth/complete             → Email link sign-in completion
```

## 🔑 Key Features Preserved

### 1. CSV Upload (Core Value)
- ✅ Drag and drop interface
- ✅ Instant validation
- ✅ Duplicate detection
- ✅ Batch import
- ✅ Error handling

### 2. Charts & Visualization
- ✅ Usage over time (line chart)
- ✅ Token breakdown (bar chart)
- ✅ Model comparison (pie chart)
- ✅ Cost trends

### 3. Data Tables
- ✅ Sortable columns
- ✅ Filterable rows
- ✅ Search functionality
- ✅ Pagination
- ✅ Export to CSV

### 4. Currency Support
- ✅ GBP, USD, EUR
- ✅ Per-user preference
- ✅ Real-time conversion

### 5. Authentication
- ✅ Google Sign-In
- ✅ Email/Password
- ✅ Email Link (passwordless)
- ✅ Multi-tenant aware

## 🏗️ Architecture

### Data Flow (CSV Upload)
```
User drops CSV
    ↓
Frontend parses CSV
    ↓
Validates format
    ↓
Checks for duplicates (local)
    ↓
Saves to Firestore:
  /organizations/{orgId}/usage/{usageId}
    ↓
Real-time listener updates
    ↓
Charts re-render
```

### Multi-Tenant Data Isolation
```
Organization A
├─ User 1 (Admin)
│  └─ usage/ (their CSV data)
├─ User 2 (Member)
│  └─ usage/ (their CSV data)
└─ Aggregate shown in /dashboard

Organization B
├─ User 3 (Admin)
│  └─ usage/ (their CSV data)
└─ Completely separate from Org A
```

### Firestore Structure
```
organizations/
  {orgId}/
    - name, tier, settings, billingPlan
    
    members/
      {userId}/
        - role, teams, status
    
    teams/
      {teamId}/
        - name, managerId, memberIds
    
    usage/
      {usageId}/
        - userId, date, model, tokens, cost
        - Saved from CSV uploads
    
    apiConnections/
      {connectionId}/
        - provider, credentials, status
```

## 🎨 What Changed from Last Night?

### Before (Last Night)
- Default route `/` → CursorCostsPage ✅
- Sidebar with team invites ✅
- CSV upload working ✅
- Charts working ✅

### After (This Morning - Wrong Direction)
- Default route `/` → DashboardPage ❌
- Lost CSV upload prominence ❌
- Over-emphasized org features ❌

### Now (Corrected)
- Default route `/` → CursorCostsPage ✅
- CSV upload front and center ✅
- Organization features in sidebar ✅
- Best of both worlds ✅

## 🚀 Testing

### Test the Restored App
```bash
cd /Users/glennsmith/coding/aicoder/frontend
npm run dev
# Visit http://localhost:5173
```

**What you should see:**
1. **Landing Page** → CSV upload interface with charts
2. **Sidebar** → "My Usage" at top, org features below (if admin)
3. **CSV Drop** → Works immediately
4. **Charts Update** → Real-time after upload
5. **Sign In** → Creates organization, stays on CSV page
6. **Admin Click "Organization Dashboard"** → See multi-user view

## 📊 Value Proposition

### For Individual Users (Free/Paid)
**Core value**: Upload CSV, see your costs instantly
- No learning curve
- Immediate insights
- Personal analytics

### For Team Admins
**Core value**: Same CSV upload PLUS team visibility
- Your personal data at `/`
- Team overview at `/dashboard`
- Invite team members
- Compare team performance

### For Team Members
**Core value**: Upload your CSV, contribute to team metrics
- Your data stays private
- Admin sees aggregate only
- Simple, focused interface

## ✅ Summary

**The app now provides:**
1. **Immediate value** → CSV upload on landing page
2. **Simple UX** → Free users get what they need instantly
3. **Growth path** → Team features available but not intrusive
4. **Multi-tenant** → Organizations work behind the scenes
5. **Scalable** → Can add API sync, advanced features later

**Navigation Philosophy:**
- **"My Usage" (/)** = Do the main thing (upload CSV, see charts)
- **"Organization Dashboard" (/dashboard)** = See the bigger picture (admins only)
- **Other pages** = Manage settings, teams, billing (power users)

---

**Status**: ✅ Core functionality restored
**Build**: ✅ Successful
**Ready**: ✅ For deployment
**Next**: Deploy and test with real CSV files

