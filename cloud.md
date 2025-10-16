# AICoder.Guru Cloud Configuration

**Project:** AICoder.Guru - AI Coding Analytics Platform  
**Last Updated:** October 15, 2025 18:32  
**Environment:** Production

---

## 🔥 Firebase Configuration

### Project Details
- **Project ID:** `aicoder-guru`
- **Project Name:** AICoder.Guru
- **Region:** europe-west2 (London)
- **Billing:** Blaze Plan (Pay as you go)

### Firebase Services

#### Authentication
- **Enabled Methods:**
  - Google Sign-In ✅
  - Email/Password ✅
  - Email Link (Passwordless) ✅
- **Auth Domain:** `aicoder-guru.firebaseapp.com`
- **Authorized Domains:**
  - `aicoder.guru`
  - `app.aicoder.guru`
  - `localhost`

#### Firestore Database
- **Mode:** Native
- **Location:** europe-west2
- **Rules:** Multi-tenant with RBAC
- **Indexes:** Composite indexes for usage queries

**Collections:**
```
organizations/
  - name, tier, billingPlan, settings, createdAt, updatedAt, ownerId
  
  organizations/{orgId}/members/
    - userId, email, role, teamId, status, invitedAt, joinedAt
  
  organizations/{orgId}/teams/
    - name, managerId, memberIds, createdAt
  
  organizations/{orgId}/usage/
    - userId, date, model, tokens, cost, source, timestamp
  
  organizations/{orgId}/apiConnections/
    - provider, credentials, status, lastSync, nextSync
  
users/
  - email, displayName, organizationId, currentRole, tier, preferences
  
invitations/
  - organizationId, email, role, invitedBy, token, status, expiresAt
  
subscriptions/
  - organizationId, stripeCustomerId, stripeSubscriptionId, status, seats
```

#### Cloud Functions
- **Runtime:** Node.js 20
- **Region:** europe-west2
- **Version:** v2
- **Deployed Functions:**
  - `createTeam` - Create new team
  - `addTeamMember` - Add member to team
  - `testApiConnection` - Test API credentials
  - `addApiConnection` - Create API connection
  - `syncApiConnection` - Sync usage data

#### Hosting
**Multi-Site Configuration:**

**Site 1: Marketing Website**
- **Site ID:** `aicoder-guru`
- **Source:** `/website/dist`
- **Custom Domain:** `aicoder.guru`
- **Default URL:** `https://aicoder-guru.web.app`

**Site 2: Main Application**
- **Site ID:** `app-aicoder-guru`
- **Source:** `/frontend/dist`
- **Custom Domain:** `app.aicoder.guru`
- **Default URL:** `https://app-aicoder-guru.web.app`

#### Storage
- **Bucket:** `aicoder-guru.appspot.com`
- **Location:** europe-west2
- **Rules:** Authenticated users only

---

## 💳 Stripe Configuration

### Account Details
- **Mode:** Live
- **Publishable Key:** `pk_live_51SIW2HL6TuXGPgHweNfizoiPnr9B71LQT6NW6DW2kvBRrNCaQId6c446qbsgNUt6kN0ayeDzwyjmH4Z4D66H7gCS00gW8CnEv1`
- **Pricing Table ID:** `prctbl_1SIXDRL6TuXGPgHwofLggk70`

### Products & Pricing

#### Novice (Free)
- **Price:** £0/month
- **Features:** CSV upload, 1 user, 90-day retention

#### Apprentice (Individual)
- **Price:** £2.99/month
- **Features:** API integration, 1 user, 1-year retention

#### Sensei (Small Team)
- **Price:** £29/month
- **Features:** Up to 10 users, team analytics, unlimited retention
- **Badge:** "Most Popular"

#### Master (Team)
- **Price:** £49/month
- **Features:** Up to 30 users, custom dashboards, priority support

#### Grandmaster (Enterprise)
- **Price:** Custom
- **Features:** Unlimited users, SSO, dedicated support

### Webhook Endpoints
- **URL:** `https://europe-west2-aicoder-guru.cloudfunctions.net/handleStripeWebhook`
- **Events:**
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

---

## 🌐 Domain Configuration

### DNS Records (GoDaddy)

#### aicoder.guru (Marketing)
```
Type: A
Name: @
Value: [Firebase IP addresses from hosting verification]

Type: TXT
Name: @
Value: [Firebase verification code]
```

#### app.aicoder.guru (Application)
```
Type: A
Name: app
Value: [Firebase IP addresses from hosting verification]

Type: TXT
Name: app
Value: [Firebase verification code]
```

### SSL Certificates
- **Provider:** Firebase (Auto-provisioned)
- **Type:** Let's Encrypt
- **Auto-Renewal:** Enabled

---

## 🔐 Environment Variables

### Frontend (.env.local)
```bash
VITE_FIREBASE_API_KEY=AIzaSyCk6kXTYXXn2t3pvV2dxIPC4HQrJ4Uq-IY
VITE_FIREBASE_AUTH_DOMAIN=aicoder-guru.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=aicoder-guru
VITE_FIREBASE_STORAGE_BUCKET=aicoder-guru.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=68953395443
VITE_FIREBASE_APP_ID=1:68953395443:web:d116e73831ce0be3b96786
VITE_FIREBASE_MEASUREMENT_ID=G-HY9DZ9B5NG
```

### Website (.env.local)
```bash
VITE_FIREBASE_API_KEY=AIzaSyCk6kXTYXXn2t3pvV2dxIPC4HQrJ4Uq-IY
VITE_FIREBASE_AUTH_DOMAIN=aicoder-guru.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=aicoder-guru
VITE_FIREBASE_STORAGE_BUCKET=aicoder-guru.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=68953395443
VITE_FIREBASE_APP_ID=1:68953395443:web:d116e73831ce0be3b96786
VITE_FIREBASE_MEASUREMENT_ID=G-HY9DZ9B5NG
VITE_APP_URL=https://app-aicoder-guru.web.app
```

### Cloud Functions
```bash
STRIPE_SECRET_KEY=[Secret key from Stripe dashboard]
STRIPE_WEBHOOK_SECRET=[Webhook signing secret]
SENDGRID_API_KEY=[SendGrid API key for emails]
```

---

## 📊 Monitoring & Analytics

### Google Analytics
- **Property ID:** `G-HY9DZ9B5NG`
- **Tracking:** Both website and app
- **Events:** Custom conversion tracking

### Firebase Performance Monitoring
- **Enabled:** Yes
- **Traces:** Page loads, API calls, function executions

### Error Tracking
- **Tool:** Firebase Crashlytics
- **Alerts:** Email notifications for critical errors

---

## 🚀 Deployment Commands

### Website
```bash
cd website
npm run build
cd ..
firebase deploy --only hosting:aicoder-guru
```

### Application
```bash
cd frontend
npm run build
cd ..
firebase deploy --only hosting:app-aicoder-guru
```

### Functions
```bash
firebase deploy --only functions
```

### Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### Complete Deployment
```bash
# Build both sites
npm run build --prefix website
npm run build --prefix frontend

# Deploy everything
firebase deploy
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions (Planned)
```yaml
name: Deploy to Firebase
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build Website
        run: |
          cd website
          npm ci
          npm run build
      - name: Build App
        run: |
          cd frontend
          npm ci
          npm run build
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: aicoder-guru
```

---

## 📈 Usage Quotas & Limits

### Firestore
- **Free Tier:**
  - 50k reads/day
  - 20k writes/day
  - 1 GB storage
- **Paid Tier:**
  - $0.06 per 100k reads
  - $0.18 per 100k writes
  - $0.18/GB storage

### Cloud Functions
- **Free Tier:**
  - 2M invocations/month
  - 400k GB-seconds/month
- **Paid Tier:**
  - $0.40 per million invocations
  - $0.0000025 per GB-second

### Hosting
- **Free Tier:**
  - 10 GB/month bandwidth
  - 1 GB storage
- **Paid Tier:**
  - $0.15/GB bandwidth

---

## 🛡️ Security

### API Keys
- **Rotation Schedule:** Every 90 days
- **Storage:** GitHub Secrets, .env.local (gitignored)
- **Access:** Restricted to necessary services

### Firestore Rules
- **Mode:** Production (strict)
- **Testing:** Development rules available in `firestore.rules.dev`
- **Audit:** Monthly security rule review

### Authentication
- **MFA:** Planned for enterprise tier
- **Session Duration:** 14 days
- **Token Refresh:** Automatic

---

## 📞 Support & Contacts

### Firebase Support
- **Email:** firebase-support@google.com
- **Console:** https://console.firebase.google.com/project/aicoder-guru

### Stripe Support
- **Email:** support@stripe.com
- **Dashboard:** https://dashboard.stripe.com

### Domain Registrar (GoDaddy)
- **Support:** GoDaddy customer service
- **Portal:** https://dcc.godaddy.com

---

## 📝 Notes for Cline

### Common Tasks

**Update Firestore Rules:**
```bash
firebase deploy --only firestore:rules
```

**View Function Logs:**
```bash
firebase functions:log
```

**Test Functions Locally:**
```bash
firebase emulators:start
```

**Check Hosting Status:**
```bash
firebase hosting:channel:list
```

### Troubleshooting

**Issue: Deployment fails**
- Check build output in dist/ folders
- Verify firebase.json configuration
- Ensure logged in: `firebase login`

**Issue: Functions timeout**
- Check function logs: `firebase functions:log`
- Increase timeout in function config
- Optimize function code

**Issue: Auth not working**
- Verify authorized domains in Firebase Console
- Check .env.local files exist
- Confirm API keys are correct

---

**Maintained By:** Cline AI Assistant  
**Last Deployment:** October 15, 2025  
**Status:** ✅ All systems operational


