# AICoder.Guru Multi-Site Hosting Strategy

## Overview

Your project uses **Firebase Multi-Site Hosting** to serve both the marketing website and the main application from a single Firebase project, sharing authentication and Firestore database.

## Architecture

```
aicoder-guru (Firebase Project)
├── Shared Resources
│   ├── Firebase Authentication (auth.aicoder-guru.com)
│   ├── Firestore Database
│   └── Cloud Functions
│
├── Marketing Website (Site 1)
│   ├── Domain: aicoder.guru
│   ├── Firebase Site: aicoder-guru
│   ├── Source: /website
│   ├── Build: /website/dist
│   └── URL: https://aicoder-guru.web.app
│
└── Main Application (Site 2)
    ├── Domain: app.aicoder.guru
    ├── Firebase Site: app-aicoder-guru
    ├── Source: /frontend
    ├── Build: /frontend/dist
    └── URL: https://app-aicoder-guru.web.app
```

## Directory Structure

```
/Users/glennsmith/coding/aicoder/
├── website/                    # Marketing website (Vite + React + TypeScript)
│   ├── src/
│   ├── public/
│   ├── dist/                   # Build output → aicoder-guru site
│   ├── package.json
│   └── vite.config.ts
│
├── frontend/                   # Main application (Vite + React + TypeScript)
│   ├── src/
│   ├── public/
│   ├── dist/                   # Build output → app-aicoder-guru site
│   ├── package.json
│   └── vite.config.ts
│
├── functions/                  # Cloud Functions (shared by both sites)
│   ├── src/
│   ├── lib/
│   └── package.json
│
├── shared/                     # Shared types and schemas
│   ├── src/
│   └── package.json
│
├── firebase.json               # Multi-site hosting config
├── firestore.rules            # Shared database rules
└── firestore.indexes.json     # Shared database indexes
```

## Firebase Configuration

### Multi-Site Hosting Setup (firebase.json)

```json
{
  "hosting": [
    {
      "site": "aicoder-guru",           // Marketing website
      "public": "website/dist",
      "rewrites": [
        { "source": "**", "destination": "/index.html" }
      ]
    },
    {
      "site": "app-aicoder-guru",       // Main application
      "public": "frontend/dist",
      "rewrites": [
        { "source": "**", "destination": "/index.html" }
      ]
    }
  ]
}
```

## Environment Variables

Both sites share the same Firebase project credentials but have separate `.env.local` files:

### Website (.env.local)
```bash
# /website/.env.local
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=aicoder-guru.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=aicoder-guru
VITE_FIREBASE_STORAGE_BUCKET=aicoder-guru.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_APP_URL=https://app-aicoder-guru.web.app  # Link to main app
```

### Frontend (.env.local)
```bash
# /frontend/.env.local
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=aicoder-guru.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=aicoder-guru
VITE_FIREBASE_STORAGE_BUCKET=aicoder-guru.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

**Note:** Both use the SAME Firebase project credentials to share auth and database!

## Deployment Commands

### Deploy Everything
```bash
# Build and deploy all sites and functions
npm run build --prefix website
npm run build --prefix frontend
firebase deploy
```

### Deploy Marketing Website Only
```bash
cd website
npm run build
cd ..
firebase deploy --only hosting:aicoder-guru
```

### Deploy Main App Only
```bash
cd frontend
npm run build
cd ..
firebase deploy --only hosting:app-aicoder-guru
```

### Deploy Functions Only
```bash
firebase deploy --only functions
```

### Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

## Custom Domain Setup

### Marketing Website (aicoder.guru)
1. Go to Firebase Console → Hosting
2. Select `aicoder-guru` site
3. Click "Add custom domain"
4. Enter `aicoder.guru`
5. Follow DNS verification steps (add A and TXT records in GoDaddy)

### Main Application (app.aicoder.guru)
1. Go to Firebase Console → Hosting
2. Select `app-aicoder-guru` site
3. Click "Add custom domain"
4. Enter `app.aicoder.guru`
5. Follow DNS verification steps (add A and TXT records in GoDaddy)

**DNS Records (GoDaddy):**
```
# Marketing Website
Type: A
Name: @
Value: [Firebase IP addresses]

Type: TXT
Name: @
Value: [Firebase verification code]

# Main Application
Type: A
Name: app
Value: [Firebase IP addresses]

Type: TXT
Name: app
Value: [Firebase verification code]
```

See `GODADDY_DOMAIN_SETUP.md` for detailed instructions.

## Shared Resources

### Authentication
- **Single Auth Pool**: Both sites use the same Firebase Authentication
- **Seamless Login**: Users can authenticate on either site
- **Session Sharing**: Auth state persists across both domains (when on same root domain)

### Firestore Database
- **Single Database**: All data stored in one Firestore instance
- **Shared Rules**: `firestore.rules` applies to both sites
- **Collections**: Organizations, members, teams, usage, etc.

### Cloud Functions
- **Shared Backend**: Functions serve both sites
- **CORS**: Configured to allow both domains
- **Callable Functions**: Accessible from both marketing and app

## Development Workflow

### Local Development

**Terminal 1 - Marketing Website:**
```bash
cd website
npm run dev
# Runs on http://localhost:5175
```

**Terminal 2 - Main App:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

**Terminal 3 - Firebase Emulators (optional):**
```bash
firebase emulators:start
# Auth: http://localhost:9099
# Firestore: http://localhost:8080
# Functions: http://localhost:5001
# Hosting: http://localhost:5000
```

### Testing Multi-Site Locally

```bash
# Build both sites
npm run build --prefix website
npm run build --prefix frontend

# Start Firebase hosting emulator
firebase serve

# Access:
# Marketing: http://localhost:5000 (aicoder-guru)
# App: http://localhost:5001 (app-aicoder-guru)
```

## User Journey Flow

1. **Discovery**: User visits `aicoder.guru` (marketing website)
2. **Browse**: Views features, pricing, FAQ
3. **Click CTA**: Clicks "Start Free Trial" button
4. **Handoff**: Redirected to `app.aicoder.guru` (main app)
5. **Signup**: Creates account (Firebase Auth)
6. **Onboarding**: Organization setup wizard
7. **Dashboard**: Lands in main app dashboard
8. **Session Persists**: Auth state shared across both sites

## Benefits of This Setup

✅ **Single Firebase Project**: One bill, one dashboard, one set of credentials
✅ **Shared Authentication**: Users login once, access both sites
✅ **Shared Database**: All data in one Firestore instance
✅ **Independent Deployments**: Deploy marketing or app separately
✅ **Separate Repos Possible**: Can split into separate repos later if needed
✅ **Custom Domains**: Professional URLs (aicoder.guru & app.aicoder.guru)
✅ **Cost Effective**: No duplicate services or resources
✅ **Scalable**: Can add more sites (docs.aicoder.guru, blog.aicoder.guru, etc.)

## Security Considerations

### CORS Configuration
The app site allows cross-origin requests to enable API calls:
```json
{
  "key": "Access-Control-Allow-Origin",
  "value": "*"
}
```

### CSP Headers
Both sites enforce strict security headers:
- `Strict-Transport-Security`: Force HTTPS
- `X-Content-Type-Options`: Prevent MIME sniffing
- `X-Frame-Options`: Prevent clickjacking
- `X-XSS-Protection`: Enable XSS filtering

### Firestore Rules
Rules ensure users can only access their organization's data:
```javascript
match /organizations/{orgId} {
  allow read, write: if isOrgMember(orgId);
}
```

## Troubleshooting

### Issue: Auth not persisting between sites
**Solution**: Ensure both domains are under same root (e.g., `aicoder.guru` and `app.aicoder.guru`) or use Firebase Auth's cross-origin capabilities.

### Issue: Build fails
**Solution**: 
```bash
# Clear build caches
rm -rf website/dist website/node_modules/.vite
rm -rf frontend/dist frontend/node_modules/.vite
npm install --prefix website
npm install --prefix frontend
```

### Issue: Wrong site deploying
**Solution**: Always specify the site when deploying:
```bash
firebase deploy --only hosting:aicoder-guru      # Marketing
firebase deploy --only hosting:app-aicoder-guru  # App
```

### Issue: Environment variables not loading
**Solution**: Create `.env.local` files (not committed to git):
```bash
cp website/.env.example website/.env.local
cp frontend/.env.example frontend/.env.local
# Edit with actual values
```

## Monitoring & Analytics

### Firebase Hosting Metrics
View per-site metrics in Firebase Console:
- Bandwidth usage
- Request counts
- Error rates
- Geographic distribution

### Google Analytics
Each site can have its own GA4 property or share one:
- Marketing: Focus on conversions, page views
- App: Focus on user engagement, feature usage

## Future Enhancements

### Potential Additional Sites
- `docs.aicoder.guru` - Documentation site
- `blog.aicoder.guru` - Blog/content marketing
- `status.aicoder.guru` - Status page
- `api.aicoder.guru` - API documentation

### Monorepo Structure
Consider tools like:
- **Turborepo**: Fast build system for monorepos
- **Nx**: Smart monorepo with caching
- **Rush**: Scalable monorepo manager

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]

jobs:
  deploy-website:
    if: contains(github.event.head_commit.modified, 'website/')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm ci --prefix website
      - run: npm run build --prefix website
      - run: firebase deploy --only hosting:aicoder-guru

  deploy-app:
    if: contains(github.event.head_commit.modified, 'frontend/')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm ci --prefix frontend
      - run: npm run build --prefix frontend
      - run: firebase deploy --only hosting:app-aicoder-guru
```

## Quick Reference

| Task | Command |
|------|---------|
| Dev - Website | `cd website && npm run dev` |
| Dev - App | `cd frontend && npm run dev` |
| Build - Website | `cd website && npm run build` |
| Build - App | `cd frontend && npm run build` |
| Deploy - Website | `firebase deploy --only hosting:aicoder-guru` |
| Deploy - App | `firebase deploy --only hosting:app-aicoder-guru` |
| Deploy - All | `firebase deploy` |
| View Sites | `firebase hosting:sites:list` |
| Check Status | `firebase hosting:channel:list` |

## Support

For issues or questions:
- Firebase Console: https://console.firebase.google.com/project/aicoder-guru
- Firebase Support: https://firebase.google.com/support
- Documentation: This file!

