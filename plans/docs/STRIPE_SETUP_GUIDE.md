# Stripe Setup Guide - Quick Start

**Version:** 1.0  
**Last Updated:** October 16, 2025  
**Purpose:** Configure Stripe integration with existing pricing table

---

## ✅ Current State

- ✅ **Stripe Pricing Table** already embedded on website (`aicoder.guru/pricing`)
- ✅ **Pricing Table ID:** `prctbl_1SIXDRL6TuXGPgHwofLggk70`
- ✅ **Publishable Key:** `pk_live_51SIW2HL6TuXGPgHweNfizoiPnr9B71LQT6NW6DW2kvBRrNCaQId6c446qbsgNUt6kN0ayeDzwyjmH4Z4D66H7gCS00gW8CnEv1`
- ✅ **Tiers Configured:** Apprentice, Sensei, Master, Grandmaster
- ❌ **Webhook** not configured yet
- ❌ **Environment variables** not set up yet

---

## 🔧 What We Need to Set Up

### 1. Get Stripe API Keys
### 2. Get Price IDs from existing products
### 3. Configure webhook endpoint
### 4. Set up environment variables
### 5. Deploy webhook handler

---

## 📋 Step-by-Step Setup

### Step 1: Get Stripe Secret Key

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers → API Keys**
3. Copy the **Secret key** (starts with `sk_live_...` for production or `sk_test_...` for testing)
4. Keep this secure - never commit to git!

---

### Step 2: Get Price IDs from Stripe Dashboard

Your pricing table already has products/prices configured. We need to map them to our code names.

1. Go to **Products** in Stripe Dashboard
2. For each product (Apprentice, Sensei, Master, Grandmaster):
   - Click on the product
   - Note the **Price IDs** for monthly and annual
   - Look at the metadata (if any)

**Create this mapping file:**

```bash
# .stripe-price-mapping.txt (for reference only, don't commit)

Apprentice:
  Monthly: price_xxxxx
  Annual: price_yyyyy
  
Sensei:
  Monthly: price_xxxxx
  Annual: price_yyyyy
  
Master:
  Monthly: price_xxxxx
  Annual: price_yyyyy
  
Grandmaster:
  Monthly: price_xxxxx
  Annual: price_yyyyy
```

---

### Step 3: Configure Webhook in Stripe Dashboard

1. Go to **Developers → Webhooks** in Stripe Dashboard
2. Click **Add endpoint**
3. **Endpoint URL:** 
   - For testing: `https://europe-west2-aicoder-guru.cloudfunctions.net/stripeWebhook`
   - (We'll deploy this function first)
4. **Events to send:**
   - Select **Select all events** or manually select:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `customer.subscription.trial_will_end`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `invoice.created`
     - `invoice.finalized`
     - `invoice.paid`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_...`)

---

### Step 4: Set Up Environment Variables

#### A. Functions Environment Variables

Create `functions/.env.local` (this file is gitignored):

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_51SIW2HL6TuXGPgHweNfizoiPnr9B71LQT6NW6DW2kvBRrNCaQId6c446qbsgNUt6kN0ayeDzwyjmH4Z4D66H7gCS00gW8CnEv1
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs (get these from Step 2)
# Apprentice
STRIPE_PRICE_APPRENTICE_MONTHLY=price_xxxxx
STRIPE_PRICE_APPRENTICE_ANNUAL=price_yyyyy

# Sensei
STRIPE_PRICE_SENSEI_MONTHLY=price_xxxxx
STRIPE_PRICE_SENSEI_ANNUAL=price_yyyyy

# Master
STRIPE_PRICE_MASTER_MONTHLY=price_xxxxx
STRIPE_PRICE_MASTER_ANNUAL=price_yyyyy

# Grandmaster
STRIPE_PRICE_GRANDMASTER_MONTHLY=price_xxxxx
STRIPE_PRICE_GRANDMASTER_ANNUAL=price_yyyyy

# App URLs
APP_URL=https://app.aicoder.guru
WEBSITE_URL=https://aicoder.guru
```

#### B. Frontend Environment Variables

Create `frontend/.env.local` (gitignored):

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51SIW2HL6TuXGPgHweNfizoiPnr9B71LQT6NW6DW2kvBRrNCaQId6c446qbsgNUt6kN0ayeDzwyjmH4Z4D66H7gCS00gW8CnEv1
VITE_STRIPE_PRICING_TABLE_ID=prctbl_1SIXDRL6TuXGPgHwofLggk70
```

#### C. Website Environment Variables

Create `website/.env.local` (gitignored):

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51SIW2HL6TuXGPgHweNfizoiPnr9B71LQT6NW6DW2kvBRrNCaQId6c446qbsgNUt6kN0ayeDzwyjmH4Z4D66H7gCS00gW8CnEv1
VITE_APP_URL=https://app.aicoder.guru
```

---

### Step 5: Update .gitignore

Make sure these files are NOT committed:

```bash
# Add to .gitignore (root level)
**/.env.local
**/.env.*.local
.stripe-price-mapping.txt
stripe-*.log
```

---

### Step 6: Load Environment Variables for Development

#### For Firebase Functions

The Firebase Functions will automatically load `.env.local` when using emulators.

For production deployment, use Firebase CLI:

```bash
# Set production secrets (do this once)
cd functions

firebase functions:secrets:set STRIPE_SECRET_KEY
# Enter your secret key when prompted

firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
# Enter your webhook secret when prompted

# For non-secret config
firebase functions:config:set stripe.publishable_key="pk_live_..."
firebase functions:config:set stripe.pricing_table_id="prctbl_..."
```

---

### Step 7: Test Locally with Stripe CLI

Before deploying, test the webhook handler locally:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Start Firebase emulators in one terminal
cd /Users/glennsmith/coding/aicoder
firebase emulators:start

# In another terminal, forward Stripe webhooks
stripe listen --forward-to http://localhost:5001/aicoder-guru/europe-west2/stripeWebhook

# In a third terminal, trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
```

---

## 🎯 Configuration for Existing Pricing Table

Since your pricing table is already live, we need to ensure the webhook can map the price IDs to our internal tier names.

### Update Stripe Price Metadata (Optional but Recommended)

For each price in your existing products, add metadata:

1. Go to **Products** in Stripe Dashboard
2. Click on a product (e.g., "Apprentice")
3. Click on a price (e.g., "Monthly")
4. Scroll to **Metadata**
5. Add these key-value pairs:

```
codeName: apprentice
internalTier: team_apprentice
billingCycle: monthly
```

Repeat for all prices. This makes the webhook handler much more reliable.

---

## 🔄 Price ID Mapping in Code

Create this utility function:

```typescript
// functions/src/utils/billing.ts

// Mapping based on your Stripe dashboard
const PRICE_TO_TIER: Record<string, string> = {
  // Apprentice
  'price_xxxxx': 'team_apprentice',  // Monthly
  'price_yyyyy': 'team_apprentice',  // Annual
  
  // Sensei
  'price_xxxxx': 'team_sensei',      // Monthly
  'price_yyyyy': 'team_sensei',      // Annual
  
  // Master
  'price_xxxxx': 'team_master',      // Monthly
  'price_yyyyy': 'team_master',      // Annual
  
  // Grandmaster
  'price_xxxxx': 'enterprise',       // Monthly
  'price_yyyyy': 'enterprise',       // Annual
}

const PRICE_TO_CODE_NAME: Record<string, string> = {
  // Apprentice
  'price_xxxxx': 'apprentice',
  'price_yyyyy': 'apprentice',
  
  // Sensei
  'price_xxxxx': 'sensei',
  'price_yyyyy': 'sensei',
  
  // Master
  'price_xxxxx': 'master',
  'price_yyyyy': 'master',
  
  // Grandmaster
  'price_xxxxx': 'grandmaster',
  'price_yyyyy': 'grandmaster',
}

export function determineTierFromPrice(priceId: string): string {
  return PRICE_TO_TIER[priceId] || 'free_individual'
}

export function getCodeNameFromPrice(priceId: string): string {
  return PRICE_TO_CODE_NAME[priceId] || 'novice'
}

export function determineTierFromMetadata(metadata: any): string {
  if (metadata.internalTier) {
    return metadata.internalTier
  }
  
  if (metadata.codeName) {
    return CODE_NAME_TO_TIER[metadata.codeName] || 'free_individual'
  }
  
  return 'free_individual'
}

const CODE_NAME_TO_TIER: Record<string, string> = {
  'novice': 'free_individual',
  'apprentice': 'team_apprentice',
  'sensei': 'team_sensei',
  'master': 'team_master',
  'grandmaster': 'enterprise'
}
```

---

## 🚀 Deployment Steps

### 1. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 2. Build and Deploy Functions

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### 3. Verify Webhook Endpoint

After deployment:
1. Go to **Developers → Webhooks** in Stripe Dashboard
2. Click on your webhook endpoint
3. Click **Send test webhook**
4. Select `checkout.session.completed`
5. Check the response (should be 200 OK)

### 4. Test End-to-End

1. Go to your website pricing page
2. Click "Start trial" on any plan
3. Use test card: `4242 4242 4242 4242`
4. Complete checkout
5. Check Firestore:
   - New document in `subscriptions` collection
   - User's `tier` updated
   - Invoice created

---

## 🧪 Test Cards for Development

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Insufficient funds: 4000 0000 0000 9995
Requires authentication: 4000 0025 0000 3155

Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)
```

---

## 📊 Monitoring After Launch

### Check These After First Real Subscription:

1. **Stripe Dashboard:**
   - ✅ Payment successful
   - ✅ Subscription active
   - ✅ Webhook delivered (200 response)

2. **Firestore Console:**
   - ✅ New document in `subscriptions` collection
   - ✅ User's `tier` field updated
   - ✅ User's `stripeCustomerId` set
   - ✅ Document in `invoices` collection
   - ✅ Event logged in `stripe_events` collection

3. **Cloud Functions Logs:**
   - ✅ `checkout.session.completed` processed
   - ✅ `customer.subscription.created` processed
   - ✅ No errors

### Useful Commands:

```bash
# View function logs
firebase functions:log --only stripeWebhook

# View recent logs
firebase functions:log --only stripeWebhook --limit 50

# View in real-time
firebase functions:log --only stripeWebhook --follow
```

---

## 🔍 Troubleshooting

### Webhook not firing?

1. Check endpoint URL is correct
2. Verify webhook secret matches `.env`
3. Check function is deployed: `firebase functions:list`
4. View logs: `firebase functions:log`

### Subscription created but tier not updated?

1. Check Firestore security rules allow writes from Cloud Functions
2. Check `determineTierFromPrice()` mapping is correct
3. View function logs for errors

### "Webhook signature verification failed"?

1. Verify `STRIPE_WEBHOOK_SECRET` is correct
2. Make sure you're using the signing secret from the webhook endpoint (not the API key)
3. Check you're passing `rawBody` to `stripe.webhooks.constructEvent()`

---

## 📋 Checklist Before Going Live

- [ ] Stripe Secret Key added to `functions/.env.local`
- [ ] Webhook Secret added to `functions/.env.local`
- [ ] All Price IDs mapped in `billing.ts`
- [ ] Webhook endpoint created in Stripe Dashboard
- [ ] Webhook endpoint URL points to deployed function
- [ ] All events subscribed (or "Select all")
- [ ] Firestore rules deployed
- [ ] Functions built and deployed
- [ ] Test webhook in Stripe Dashboard (200 response)
- [ ] End-to-end test with test card
- [ ] Monitoring/alerting set up
- [ ] `.env.local` files in `.gitignore`

---

## 🎉 Next Steps After Setup

Once the webhook is working:

1. **Enable in App Billing Page:**
   - Add Stripe Pricing Table component
   - Add "Manage Subscription" button
   - Link to Customer Portal

2. **Add Tier-Based Features:**
   - Check tier before showing API Connections
   - Show upgrade prompts for locked features
   - Display current plan on billing page

3. **Email Notifications:**
   - Welcome email on signup
   - Payment success/failure
   - Subscription canceled

4. **Analytics:**
   - Track subscription events
   - Monitor MRR/ARR
   - Track churn rate

---

## 📞 Support

If you need help:
- Check Stripe Dashboard → Developers → Logs
- Check Firebase Console → Functions → Logs
- Use Stripe CLI: `stripe logs tail`

---

**Ready to configure! Just need the secret keys and price IDs.** 🚀

