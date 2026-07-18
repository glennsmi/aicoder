# Environment Variables Setup Instructions

**Purpose:** Guide for setting up local environment variables for Stripe integration  
**Date:** October 16, 2025

---

## 📁 Files to Create

You need to create `.env.local` files in three locations. These files are gitignored and will never be committed.

```
aicoder/
├── functions/.env.local          # Backend secrets
├── frontend/.env.local           # App frontend config
└── website/.env.local            # Marketing site config
```

---

## 🔧 1. Backend (Functions)

**Create:** `functions/.env.local`

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...  # Get from Stripe Dashboard → Developers → API Keys
STRIPE_PUBLISHABLE_KEY=pk_live_51SIW2HL6TuXGPgHweNfizoiPnr9B71LQT6NW6DW2kvBRrNCaQId6c446qbsgNUt6kN0ayeDzwyjmH4Z4D66H7gCS00gW8CnEv1
STRIPE_WEBHOOK_SECRET=whsec_...  # Get from Stripe Dashboard → Developers → Webhooks → [Endpoint] → Signing secret

# Stripe Price IDs - Get from Stripe Dashboard → Products
# Apprentice
STRIPE_PRICE_APPRENTICE_MONTHLY=price_...
STRIPE_PRICE_APPRENTICE_ANNUAL=price_...

# Sensei
STRIPE_PRICE_SENSEI_MONTHLY=price_...
STRIPE_PRICE_SENSEI_ANNUAL=price_...

# Master
STRIPE_PRICE_MASTER_MONTHLY=price_...
STRIPE_PRICE_MASTER_ANNUAL=price_...

# Grandmaster
STRIPE_PRICE_GRANDMASTER_MONTHLY=price_...
STRIPE_PRICE_GRANDMASTER_ANNUAL=price_...

# Pricing Table
STRIPE_PRICING_TABLE_ID=prctbl_1SIXDRL6TuXGPgHwofLggk70

# URLs
APP_URL=https://app.aicoder.guru
WEBSITE_URL=https://aicoder.guru
```

---

## 🎨 2. Frontend (App)

**Create:** `frontend/.env.local`

```bash
# Stripe Publishable Key (safe for frontend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51SIW2HL6TuXGPgHweNfizoiPnr9B71LQT6NW6DW2kvBRrNCaQId6c446qbsgNUt6kN0ayeDzwyjmH4Z4D66H7gCS00gW8CnEv1

# Stripe Pricing Table ID
VITE_STRIPE_PRICING_TABLE_ID=prctbl_1SIXDRL6TuXGPgHwofLggk70

# App URLs
VITE_APP_URL=https://app.aicoder.guru
VITE_WEBSITE_URL=https://aicoder.guru
```

---

## 🌐 3. Website (Marketing)

**Create:** `website/.env.local`

```bash
# Stripe Publishable Key (safe for frontend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51SIW2HL6TuXGPgHweNfizoiPnr9B71LQT6NW6DW2kvBRrNCaQId6c446qbsgNUt6kN0ayeDzwyjmH4Z4D66H7gCS00gW8CnEv1

# App URL for redirects
VITE_APP_URL=https://app.aicoder.guru
```

---

## 🔍 How to Get Each Value

### 1. STRIPE_SECRET_KEY

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Developers** in left sidebar
3. Click **API keys**
4. Copy the **Secret key**
   - Test mode: starts with `sk_test_`
   - Live mode: starts with `sk_live_`

**⚠️ NEVER commit this key or share it publicly!**

---

### 2. STRIPE_WEBHOOK_SECRET

**First, you need to create the webhook endpoint:**

1. Deploy the functions first: `firebase deploy --only functions`
2. Note the deployed webhook URL: `https://europe-west2-aicoder-guru.cloudfunctions.net/stripeWebhook`
3. Go to **Developers → Webhooks** in Stripe Dashboard
4. Click **Add endpoint**
5. Enter URL: `https://europe-west2-aicoder-guru.cloudfunctions.net/stripeWebhook`
6. Select these events:
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
7. Click **Add endpoint**
8. Copy the **Signing secret** (starts with `whsec_`)

---

### 3. STRIPE_PRICE_... IDs

Your pricing table already has products configured. You need to find the price IDs:

1. Go to **Products** in Stripe Dashboard
2. Click on **Apprentice** product
3. You'll see prices listed (Monthly and Annual)
4. Click on the **Monthly** price
5. Copy the **Price ID** (starts with `price_`)
6. Repeat for **Annual** price
7. Repeat for all products (Apprentice, Sensei, Master, Grandmaster)

**Map them like this:**

```
Apprentice:
  Monthly: price_xxxxxxxxxxxxx → STRIPE_PRICE_APPRENTICE_MONTHLY
  Annual:  price_yyyyyyyyyyyyy → STRIPE_PRICE_APPRENTICE_ANNUAL

Sensei:
  Monthly: price_xxxxxxxxxxxxx → STRIPE_PRICE_SENSEI_MONTHLY
  Annual:  price_yyyyyyyyyyyyy → STRIPE_PRICE_SENSEI_ANNUAL

Master:
  Monthly: price_xxxxxxxxxxxxx → STRIPE_PRICE_MASTER_MONTHLY
  Annual:  price_yyyyyyyyyyyyy → STRIPE_PRICE_MASTER_ANNUAL

Grandmaster:
  Monthly: price_xxxxxxxxxxxxx → STRIPE_PRICE_GRANDMASTER_MONTHLY
  Annual:  price_yyyyyyyyyyyyy → STRIPE_PRICE_GRANDMASTER_ANNUAL
```

---

## ✅ Verification Checklist

After creating all `.env.local` files:

### Functions
- [ ] Can load without errors: `cd functions && npm run build`
- [ ] Secret key is set
- [ ] All price IDs are filled in
- [ ] Webhook secret is set (after webhook created)

### Frontend
- [ ] Can start dev server: `cd frontend && npm run dev`
- [ ] Publishable key is set
- [ ] No console errors about missing env vars

### Website
- [ ] Can start dev server: `cd website && npm run dev`
- [ ] Pricing page loads correctly
- [ ] Stripe pricing table displays

---

## 🚀 Testing the Setup

### 1. Test Functions Locally

```bash
# Terminal 1: Start emulators
firebase emulators:start

# Terminal 2: Forward Stripe webhooks
stripe listen --forward-to http://localhost:5001/aicoder-guru/europe-west2/stripeWebhook

# Terminal 3: Trigger test event
stripe trigger checkout.session.completed
```

Check the emulator logs for successful processing.

---

### 2. Test Frontend Locally

```bash
cd frontend
npm run dev
# Visit http://localhost:3003/billing
```

Check that:
- No console errors
- Stripe elements load (if implemented)
- Environment variables are accessible

---

### 3. Test Website Locally

```bash
cd website
npm run dev
# Visit http://localhost:3000/pricing
```

Check that:
- Pricing table loads
- Can click "Start trial"
- Redirects to Stripe checkout

---

## 🔒 Security Notes

1. **Never commit `.env.local` files** - They're in `.gitignore`
2. **Never share secret keys** - Only publishable keys are safe to share
3. **Use test keys for development** - Switch to live keys only for production
4. **Rotate keys if exposed** - Generate new keys in Stripe Dashboard immediately

---

## 📝 For Production Deployment

When deploying to production, set secrets in Firebase:

```bash
cd functions

# Set secret keys (will prompt for value)
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET

# Set config values (non-secrets)
firebase functions:config:set \
  stripe.publishable_key="pk_live_..." \
  stripe.pricing_table_id="prctbl_..." \
  stripe.price_apprentice_monthly="price_..." \
  stripe.price_apprentice_annual="price_..." \
  stripe.price_sensei_monthly="price_..." \
  stripe.price_sensei_annual="price_..." \
  stripe.price_master_monthly="price_..." \
  stripe.price_master_annual="price_..." \
  stripe.price_grandmaster_monthly="price_..." \
  stripe.price_grandmaster_annual="price_..."

# Deploy with secrets
firebase deploy --only functions
```

---

## 🆘 Troubleshooting

### "Cannot find module" errors
- Check file exists: `ls -la functions/.env.local`
- Check file format (no extra spaces, no quotes around values)

### "Invalid API key" from Stripe
- Verify you copied the entire key
- Check you're using the right mode (test vs live)
- Verify no extra spaces or newlines

### Webhook signature verification fails
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- Check you're using the signing secret from the webhook endpoint (not the API key)

### Price ID not found
- Double-check price IDs in Stripe Dashboard
- Verify you copied the entire ID (starts with `price_`)
- Check the price is active (not archived)

---

## 📞 Need Help?

1. Check Stripe Dashboard → Developers → Logs
2. Check Firebase Console → Functions → Logs
3. Use Stripe CLI: `stripe logs tail`
4. Check `.env.local` file exists and has correct format

---

**Once you have the keys, create these files and we can test the integration!** 🔑

