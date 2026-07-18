# AI Coder Deployment Guide

## Firebase Multi-Site Hosting Setup

This project uses Firebase multi-site hosting to deploy two separate applications:

### 1. Marketing Website (`aicoder-guru`)
- **URL**: https://aicoder-guru.web.app (or https://aicoder.guru with custom domain)
- **Source**: `website/`
- **Built to**: `website/dist/`
- **Purpose**: Public marketing site with homepage, features, pricing, about

### 2. Main Application (`app-aicoder-guru`)
- **URL**: https://app-aicoder-guru.web.app (or https://app.aicoder.guru with custom domain)
- **Source**: `frontend/`
- **Built to**: `frontend/dist/`
- **Purpose**: SaaS application dashboard

## Prerequisites

1. Firebase CLI installed: `npm install -g firebase-tools`
2. Authenticated: `firebase login`
3. Project configured: `.firebaserc` should point to `aicoder-guru`

## Environment Variables

### Website (.env.production)
Create `website/.env.production`:
```env
VITE_FIREBASE_API_KEY=AIzaSyCk6kXTYXXn2t3pvV2dxIPC4HQrJ4Uq-IY
VITE_FIREBASE_AUTH_DOMAIN=aicoder-guru.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=aicoder-guru
VITE_FIREBASE_STORAGE_BUCKET=aicoder-guru.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=68953395443
VITE_FIREBASE_APP_ID=1:68953395443:web:289570a7f26ea54db96786
VITE_FIREBASE_MEASUREMENT_ID=G-8CVEM8VP7S
VITE_APP_URL=https://app-aicoder-guru.web.app
```

### Frontend (.env.local)
Should already exist with same Firebase config.

## Build Process

### Build Website Only
```bash
cd website
npm run build
```

### Build Frontend Only
```bash
cd frontend
npm run build
```

### Build Both
```bash
# From project root
cd website && npm run build && cd ../frontend && npm run build && cd ..
```

## Deployment

### Deploy Everything
```bash
firebase deploy
```

### Deploy Only Hosting (Both Sites)
```bash
firebase deploy --only hosting
```

### Deploy Specific Site

**Website only:**
```bash
firebase deploy --only hosting:aicoder-guru
```

**App only:**
```bash
firebase deploy --only hosting:app-aicoder-guru
```

### Deploy with Functions
```bash
firebase deploy --only functions,hosting
```

## Custom Domain Setup

### Marketing Website (aicoder.guru)
1. Go to Firebase Console → Hosting
2. Add custom domain: `aicoder.guru`
3. Add DNS records as instructed
4. Verify ownership

### App Subdomain (app.aicoder.guru)
1. Go to Firebase Console → Hosting
2. Select `app-aicoder-guru` site
3. Add custom domain: `app.aicoder.guru`
4. Add DNS records (usually CNAME to Firebase)

## Post-Deployment Checklist

- [ ] Website loads at Firebase URL
- [ ] App loads at Firebase URL
- [ ] Dark mode toggle works on website
- [ ] Navigation works (About page accessible)
- [ ] Pricing displays correctly (5 tiers)
- [ ] Features section loads
- [ ] App authentication works
- [ ] Update VITE_APP_URL in website/.env.production if using custom domain
- [ ] Test cross-site navigation (website → app)

## Troubleshooting

### Build Errors
- Check Node.js version (20.19+ or 22.12+)
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Check for missing environment variables

### Deployment Errors
- Verify Firebase project: `firebase use`
- Check authentication: `firebase login --reauth`
- Verify hosting sites exist in Firebase Console

### Site Not Loading
- Check firebase.json configuration
- Verify dist/ folders exist after build
- Check browser console for errors
- Verify SPA rewrites are working

## Rollback

If deployment has issues:
```bash
# View hosting releases
firebase hosting:releases:list

# Rollback to specific version
firebase hosting:rollback <release-id>
```

## CI/CD Setup (Future)

For automated deployments, use GitHub Actions:
1. Store Firebase token: `firebase login:ci`
2. Add token to GitHub Secrets as `FIREBASE_TOKEN`
3. Create `.github/workflows/deploy.yml`

## Monitoring

- **Firebase Console**: https://console.firebase.google.com/project/aicoder-guru
- **Hosting Dashboard**: Check usage, bandwidth, requests
- **Performance**: Monitor Core Web Vitals
- **Analytics**: Google Analytics (Measurement ID configured)

