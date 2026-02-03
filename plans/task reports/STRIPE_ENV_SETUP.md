# Stripe Environment Variables Setup

**Quick Guide:** How to set up your `.env.local` files

---

## 📝 Step-by-Step Instructions

### Step 1: Copy Template Files

```bash
# From the root of your project:
cd /Users/glennsmith/coding/aicoder

# Copy the templates to create your .env.local files
cp functions/.env.local.TEMPLATE functions/.env.local
cp frontend/.env.local.TEMPLATE frontend/.env.local
cp website/.env.local.TEMPLATE website/.env.local
```

### Step 2: Get Your Stripe Secret Key

1. Go to [Stripe Dashboard → API Keys](https://dashboard.stripe.com/apikeys)
2. Toggle **Test mode** ON (for development) or OFF (for production)
3. Under **Secret key**, click **Reveal test key**
4. Copy the key (starts with `sk_test_...` or `sk_live_...`)
5. Open `functions/.env.local`
6. Replace `sk_test_REPLACE_WITH_YOUR_STRIPE_SECRET_KEY` with your actual key

**Example:**
```bash
# Before:
STRIPE_SECRET_KEY=sk_test_REPLACE_WITH_YOUR_STRIPE_SECRET_KEY

# After:
STRIPE_SECRET_KEY=sk_test_51ABCDEFGH1234567890abcdefghijklmnopqrstuvwxyz
```

### Step 3: Get Your Price IDs

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Click on **Apprentice** product
3. You'll see two prices listed (Monthly and Annual)
4. Click on the **Monthly** price
5. Copy the **Price ID** (starts with `price_`)
6. Repeat for the **Annual** price
7. Repeat for all products: Sensei, Master, Grandmaster

**In `functions/.env.local`, replace:**
```bash
# Before:
STRIPE_PRICE_APPRENTICE_MONTHLY=price_REPLACE_WITH_APPRENTICE_MONTHLY_PRICE_ID
STRIPE_PRICE_APPRENTICE_ANNUAL=price_REPLACE_WITH_APPRENTICE_ANNUAL_PRICE_ID

# After (example):
STRIPE_PRICE_APPRENTICE_MONTHLY=price_1ABCDEFGH1234567890
STRIPE_PRICE_APPRENTICE_ANNUAL=price_1XYZABCDE9876543210
```

### Step 4: Deploy Functions and Get Webhook Secret

**First, deploy your functions:**
```bash
cd functions
npm run build
cd ..
firebase deploy --only functions:stripeWebhook
```

**Then, create the webhook:**

1. Note the deployed function URL (from deploy output):
   ```
   https://europe-west2-aicoder-guru.cloudfunctions.net/stripeWebhook
   ```

2. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)

3. Click **Add endpoint**

4. Enter the endpoint URL (from step 1)

5. Click **Select events** and choose:
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
   
   **Or** just click **Select all events**

6. Click **Add endpoint**

7. On the webhook details page, click **Reveal** under **Signing secret**

8. Copy the secret (starts with `whsec_`)

9. Open `functions/.env.local`

10. Replace `whsec_REPLACE_WITH_YOUR_WEBHOOK_SECRET` with your actual secret

**Example:**
```bash
# Before:
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_WITH_YOUR_WEBHOOK_SECRET

# After:
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdefghijklmnopqrstuvwxyz
```

### Step 5: Verify Your Setup

**Check functions/.env.local has all values filled:**
```bash
cat functions/.env.local | grep "REPLACE"
```

If this command shows any results, you still have placeholders to replace!

**Test the functions locally:**
```bash
# Terminal 1: Start emulators
firebase emulators:start

# Terminal 2: Forward webhooks
stripe listen --forward-to http://localhost:5001/aicoder-guru/europe-west2/stripeWebhook

# Terminal 3: Trigger test event
stripe trigger checkout.session.completed
```

---

## 📋 Complete Example

Here's what your `functions/.env.local` should look like when complete:

```bash
# STRIPE API KEYS
STRIPE_SECRET_KEY=sk_test_51ABCDEFGHabcdefghijklmnopqrstuvwxyz1234567890
STRIPE_PUBLISHABLE_KEY=pk_live_51SIW2HL6TuXGPgHweNfizoiPnr9B71LQT6NW6DW2kvBRrNCaQId6c446qbsgNUt6kN0ayeDzwyjmH4Z4D66H7gCS00gW8CnEv1

# STRIPE WEBHOOK SECRET
STRIPE_WEBHOOK_SECRET=whsec_abcdefghijklmnopqrstuvwxyz1234567890

# STRIPE PRICING TABLE
STRIPE_PRICING_TABLE_ID=prctbl_1SIXDRL6TuXGPgHwofLggk70

# STRIPE PRICE IDs - Apprentice
STRIPE_PRICE_APPRENTICE_MONTHLY=price_1ABC123monthly456
STRIPE_PRICE_APPRENTICE_ANNUAL=price_1ABC123annual789

# STRIPE PRICE IDs - Sensei
STRIPE_PRICE_SENSEI_MONTHLY=price_1XYZ456monthly123
STRIPE_PRICE_SENSEI_ANNUAL=price_1XYZ456annual456

# STRIPE PRICE IDs - Master
STRIPE_PRICE_MASTER_MONTHLY=price_1DEF789monthly789
STRIPE_PRICE_MASTER_ANNUAL=price_1DEF789annual012

# STRIPE PRICE IDs - Grandmaster
STRIPE_PRICE_GRANDMASTER_MONTHLY=price_1GHI012monthly345
STRIPE_PRICE_GRANDMASTER_ANNUAL=price_1GHI012annual678

# APPLICATION URLs
APP_URL=https://app.aicoder.guru
WEBSITE_URL=https://aicoder.guru
```

---

## ✅ Final Checklist

- [ ] Copied template files to `.env.local`
- [ ] Added Stripe Secret Key
- [ ] Added all 8 Price IDs
- [ ] Deployed functions
- [ ] Created webhook in Stripe Dashboard
- [ ] Added Webhook Secret
- [ ] Verified no "REPLACE" placeholders remain
- [ ] Tested locally with emulators
- [ ] `.env.local` files are in `.gitignore`

---

## 🔒 Security Reminder

**NEVER commit these files:**
- ❌ `functions/.env.local`
- ❌ `frontend/.env.local`
- ❌ `website/.env.local`

They're in `.gitignore` but double-check!

---

**Once complete, you're ready to start the integration!** 🚀
