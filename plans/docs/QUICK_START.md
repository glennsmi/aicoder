# AICoder.Guru Quick Start Guide

## 🚀 Getting Started

### 1. Initial Setup

```bash
# Navigate to project root
cd /Users/glennsmith/coding/aicoder

# Install dependencies for all packages
npm install --prefix shared
npm install --prefix frontend
npm install --prefix website
npm install --prefix functions
```

### 2. Environment Configuration

#### Frontend App (.env.local)
```bash
# Create from example
cp frontend/.env.example frontend/.env.local

# Edit with your Firebase credentials
# Get from: https://console.firebase.google.com/project/aicoder-guru/settings/general
```

#### Website (.env.local)
```bash
# Already exists at website/.env.local
# Verify it has the same Firebase credentials as frontend
# Plus VITE_APP_URL pointing to your app
```

### 3. Local Development

#### Option A: Run Both Sites
```bash
# Terminal 1 - Marketing Website
cd website
npm run dev
# → http://localhost:5175

# Terminal 2 - Main App
cd frontend
npm run dev
# → http://localhost:5173
```

#### Option B: Run with Firebase Emulators
```bash
# Terminal 1 - Build both sites
npm run build --prefix website
npm run build --prefix frontend

# Terminal 2 - Start emulators
firebase emulators:start
# → Marketing: http://localhost:5000
# → App: http://localhost:5001
# → Emulator UI: http://localhost:4000
```

### 4. Build for Production

```bash
# Build marketing website
cd website
npm run build
# Output: website/dist/

# Build main app
cd frontend
npm run build
# Output: frontend/dist/

# Build functions (if changed)
cd functions
npm run build
# Output: functions/lib/
```

### 5. Deploy

```bash
# Deploy everything
firebase deploy

# Or deploy specific sites:
firebase deploy --only hosting:aicoder-guru          # Marketing website
firebase deploy --only hosting:app-aicoder-guru      # Main app
firebase deploy --only functions                      # Cloud Functions
firebase deploy --only firestore:rules               # Firestore rules
```

## 📁 Project Structure

```
aicoder/
├── website/              # Marketing site (aicoder.guru)
│   ├── src/
│   │   ├── components/   # Header, Footer, ThemeToggle, etc.
│   │   ├── pages/        # HomePage, AboutPage, PricingPage, etc.
│   │   ├── contexts/     # ThemeContext, AuthContext
│   │   └── config/       # Firebase config
│   ├── public/           # Static assets (logos, images)
│   └── dist/             # Build output → Firebase hosting
│
├── frontend/             # Main app (app.aicoder.guru)
│   ├── src/
│   │   ├── components/   # Sidebar, Layout, Charts, etc.
│   │   ├── pages/        # Dashboard, Teams, Users, Billing, etc.
│   │   ├── contexts/     # AuthContext, OrganizationContext, ThemeContext
│   │   ├── hooks/        # useOrgAnalytics, useCurrency, etc.
│   │   └── config/       # Firebase config
│   ├── public/           # Static assets
│   └── dist/             # Build output → Firebase hosting
│
├── functions/            # Cloud Functions (shared)
│   ├── src/
│   │   ├── connectors/   # API connectors (Cursor, GitHub, etc.)
│   │   ├── teams/        # Team management functions
│   │   └── index.ts      # Function exports
│   └── lib/              # Compiled output
│
├── shared/               # Shared types and schemas
│   ├── src/
│   │   ├── types/        # TypeScript types
│   │   ├── schemas/      # Zod schemas
│   │   └── utils/        # Shared utilities
│   └── dist/             # Compiled output
│
├── firebase.json         # Multi-site hosting config
├── firestore.rules       # Database security rules
└── firestore.indexes.json # Database indexes
```

## 🎨 Current Status

### ✅ Marketing Website (aicoder.guru)
- [x] Homepage with Hero, Features, Pricing sections
- [x] About Page
- [x] Features Page (detailed)
- [x] Pricing Page (Stripe integration)
- [x] FAQ Page
- [x] Legal Pages (Privacy, Terms, Cookies, Acceptable Use)
- [x] Header & Footer
- [x] Light/Dark Mode
- [x] Responsive Design
- [x] Firebase Auth Integration
- [x] Tailwind CSS v4

### ✅ Main Application (app.aicoder.guru)
- [x] Multi-tenant Architecture
- [x] Firebase Authentication (Google, Email/Password, Email Link)
- [x] Organization Context & Management
- [x] User Management
- [x] Team Management
- [x] Dashboard with Analytics
- [x] Sidebar Navigation
- [x] CSV Upload
- [x] API Connector Framework
- [x] Charts & Visualizations
- [x] Light/Dark Mode
- [x] Responsive Design

### ⏳ To Be Completed

#### Frontend App
1. **Verify Environment Variables**
   - Create `frontend/.env.local` with Firebase credentials
   - Test that app connects to Firebase

2. **Test Authentication Flow**
   - Google Sign-In
   - Email/Password
   - Email Link (passwordless)
   - Organization creation after signup

3. **Test Core Features**
   - CSV upload
   - Dashboard analytics
   - User management
   - Team management
   - API connections

4. **Build & Deploy Frontend**
   - `cd frontend && npm run build`
   - `firebase deploy --only hosting:app-aicoder-guru`

#### Cloud Functions
1. **Review & Test Functions**
   - Team management (createTeam, addTeamMember)
   - API connectors (testApiConnection, syncApiConnection)

2. **Deploy Functions**
   - `firebase deploy --only functions`

#### Database
1. **Verify Firestore Rules**
   - Currently using dev rules (permissive)
   - Switch to production rules when ready

2. **Test Multi-Tenancy**
   - Create test organization
   - Add test users
   - Verify data isolation

## 🔑 Key Files

### Configuration
- `firebase.json` - Multi-site hosting, emulators
- `firestore.rules` - Database security
- `firestore.indexes.json` - Query optimization
- `.firebaserc` - Project configuration

### Frontend App
- `frontend/src/App.tsx` - Main app component, routing
- `frontend/src/contexts/AuthContext.tsx` - Authentication
- `frontend/src/contexts/OrganizationContext.tsx` - Multi-tenancy
- `frontend/src/components/Layout.tsx` - App layout with sidebar
- `frontend/src/components/Sidebar.tsx` - Navigation

### Marketing Website
- `website/src/App.tsx` - Website routing
- `website/src/pages/HomePage.tsx` - Landing page
- `website/src/components/layout/Header.tsx` - Site header
- `website/src/components/layout/Footer.tsx` - Site footer

### Shared
- `shared/src/types/organization.ts` - Organization types
- `shared/src/types/team.ts` - Team types
- `shared/src/types/apiConnector.ts` - API connector types
- `shared/src/utils/permissions.ts` - RBAC utilities

## 🧪 Testing

### Test User Flow
1. Visit marketing site (http://localhost:5175)
2. Click "Start Free Trial"
3. Redirected to app (http://localhost:5173)
4. Sign up with Google or Email
5. Complete organization setup wizard
6. Land on dashboard
7. Upload CSV or connect API
8. View analytics

### Test Multi-Tenancy
1. Create Organization A with User 1
2. Add User 2 to Organization A
3. Create Organization B with User 3
4. Verify User 1 can't see Organization B's data
5. Verify User 2 can see Organization A's data

### Test Permissions
1. Create organization with Admin user
2. Add Team Manager user
3. Add Member user
4. Test each role's access:
   - Admin: Full access
   - Team Manager: Can manage team, view team data
   - Member: Can view own data only

## 🚨 Common Issues

### Issue: "Firebase config not found"
**Solution:** Create `.env.local` files:
```bash
# Frontend
cp frontend/.env.example frontend/.env.local
# Edit with actual Firebase credentials

# Website (already exists)
# Verify website/.env.local has correct values
```

### Issue: "Module not found: @cursor-costs/shared"
**Solution:** Build shared package:
```bash
cd shared
npm install
npm run build
cd ../frontend
npm install
```

### Issue: "Auth domain mismatch"
**Solution:** Verify all Firebase configs use same project:
- `frontend/src/config/firebase.ts`
- `website/src/config/firebase.ts`
- Both should have `projectId: "aicoder-guru"`

### Issue: "Firestore permission denied"
**Solution:** Using dev rules:
```bash
# Check firestore.rules is using dev rules
# Or deploy permissive rules for testing:
firebase deploy --only firestore:rules
```

## 📚 Documentation

- `HOSTING_STRATEGY.md` - Multi-site hosting architecture
- `TESTING_SETUP.md` - Testing guide
- `EMAIL_LINK_AUTH_SETUP.md` - Email link auth setup
- `SECURITY.md` - Security best practices
- `CREDENTIAL_ROTATION_GUIDE.md` - API key rotation
- `GODADDY_DOMAIN_SETUP.md` - Custom domain setup

## 🎯 Next Steps

1. **Set up frontend `.env.local`**
   - Copy Firebase credentials
   - Test local dev server

2. **Test authentication**
   - Sign up with Google
   - Create organization
   - Verify database writes

3. **Test CSV upload**
   - Upload sample CSV
   - Verify data appears in charts

4. **Deploy to production**
   - Build both sites
   - Deploy to Firebase
   - Test on live URLs

5. **Set up custom domains**
   - Add `aicoder.guru` to marketing site
   - Add `app.aicoder.guru` to app site
   - Configure DNS in GoDaddy

## 💡 Tips

- Use `firebase emulators:start` for offline development
- Build shared package after changing types
- Use `firebase deploy --only` for faster deployments
- Check Firebase Console for quotas and usage
- Monitor Cloud Functions logs for errors
- Test on multiple browsers and devices
- Use Lighthouse for performance audits

## 📞 Support

- Firebase Console: https://console.firebase.google.com/project/aicoder-guru
- Firebase Docs: https://firebase.google.com/docs
- React Docs: https://react.dev
- Vite Docs: https://vitejs.dev

---

**Last Updated:** October 15, 2025  
**Version:** 1.0.0  
**Maintainer:** Glenn Smith

