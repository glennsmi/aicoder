# Stripe Quick Reference Card

**Purpose:** Quick lookup for Stripe configuration and mappings  
**Date:** October 16, 2025

---

## 🎯 Tier Mapping

| Display Name | Code Name | Internal Tier | Firestore Value |
|--------------|-----------|---------------|-----------------|
| Novice (Free) | `novice` | `free_individual` | `free_individual` |
| Apprentice | `apprentice` | `team_apprentice` | `team_apprentice` |
| Sensei | `sensei` | `team_sensei` | `team_sensei` |
| Master | `master` | `team_master` | `team_master` |
| Grandmaster | `grandmaster` | `enterprise` | `enterprise` |

---

## 💰 Pricing (GBP)

| Tier | Monthly | Annual | Savings | Max Users | API Integrations |
|------|---------|--------|---------|-----------|------------------|
| Novice | Free | Free | - | 1 | 0 |
| Apprentice | £2.99 | £28.70 | 20% | 5 | 0 |
| Sensei | £29 | £278.40 | 20% | 10 | 1 |
| Master | £49 | £470.40 | 20% | 30 | 3 |
| Grandmaster | Custom | Custom | - | Unlimited | Unlimited |

---

## 🔑 Stripe Identifiers

### Already Configured
- **Publishable Key:** `pk_live_51SIW2HL6TuXGPgHweNfizoiPnr9B71LQT6NW6DW2kvBRrNCaQId6c446qbsgNUt6kN0ayeDzwyjmH4Z4D66H7gCS00gW8CnEv1`
- **Pricing Table ID:** `prctbl_1SIXDRL6TuXGPgHwofLggk70`
- **Website:** https://aicoder.guru/pricing
- **App:** https://app.aicoder.guru/billing

### Need to Configure
- [ ] Secret Key: `sk_live_...` or `sk_test_...`
- [ ] Webhook Secret: `whsec_...`
- [ ] Price IDs (8 total): `price_...`

---

## 📦 Price ID Environment Variables

```bash
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
```

---

## 🎣 Webhook Events to Subscribe

**Essential:**
- ✅ `checkout.session.completed` - New subscription
- ✅ `customer.subscription.created` - Subscription started
- ✅ `customer.subscription.updated` - Plan changed
- ✅ `customer.subscription.deleted` - Subscription ended
- ✅ `invoice.payment_succeeded` - Payment successful
- ✅ `invoice.payment_failed` - Payment failed

**Recommended:**
- ✅ `customer.subscription.trial_will_end` - Trial ending soon
- ✅ `invoice.created` - Invoice generated
- ✅ `invoice.finalized` - Invoice ready to charge
- ✅ `invoice.paid` - Invoice marked paid

**Webhook URL:** `https://europe-west2-aicoder-guru.cloudfunctions.net/stripeWebhook`

---

## 🏷️ Checkout Metadata Template

```typescript
{
  source: 'website' | 'app',
  entityType: 'user' | 'organization',
  entityId: string,
  codeName: 'apprentice' | 'sensei' | 'master' | 'grandmaster',
  internalTier: 'team_apprentice' | 'team_sensei' | 'team_master' | 'enterprise',
  returnUrl: string,
  timestamp: string
}
```

---

## 🗄️ Firestore Collections

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `subscriptions` | Active subscriptions | `stripeSubscriptionId`, `tier`, `status` |
| `invoices` | Payment history | `stripeInvoiceId`, `amount`, `status` |
| `stripe_events` | Idempotency | `id`, `type`, `processed` |
| `users` | User accounts | `stripeCustomerId`, `tier` |
| `organizations` | Org accounts | `stripeCustomerId`, `tier` |

---

## 🔄 Subscription Status Values

| Status | Meaning | UI Display |
|--------|---------|------------|
| `active` | Paid and current | 🟢 Active |
| `trialing` | In trial period | 🔵 Trial |
| `past_due` | Payment failed | 🟡 Past Due |
| `canceled` | Ended | 🔴 Canceled |
| `incomplete` | Payment pending | ⚪ Incomplete |
| `unpaid` | Payment failed (final) | 🔴 Unpaid |

---

## 🧪 Test Cards

| Scenario | Card Number | Use Case |
|----------|-------------|----------|
| Success | `4242 4242 4242 4242` | Normal payment |
| Decline | `4000 0000 0000 0002` | Test failure |
| Insufficient Funds | `4000 0000 0000 9995` | Test failure |
| Requires Auth | `4000 0025 0000 3155` | 3D Secure |

**All test cards:**
- Expiry: Any future date (e.g., `12/25`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

---

## 📍 Key URLs

| Service | URL |
|---------|-----|
| Website Pricing | https://aicoder.guru/pricing |
| App Billing | https://app.aicoder.guru/billing |
| Stripe Dashboard | https://dashboard.stripe.com |
| Stripe Webhooks | https://dashboard.stripe.com/webhooks |
| Stripe Products | https://dashboard.stripe.com/products |
| Stripe API Keys | https://dashboard.stripe.com/apikeys |

---

## 🛠️ Common Commands

### Stripe CLI
```bash
# Install
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Listen to webhooks locally
stripe listen --forward-to http://localhost:5001/aicoder-guru/europe-west2/stripeWebhook

# Trigger test event
stripe trigger checkout.session.completed
stripe trigger invoice.payment_succeeded
```

### Firebase
```bash
# Deploy functions
firebase deploy --only functions

# Deploy rules
firebase deploy --only firestore:rules

# View logs
firebase functions:log --only stripeWebhook

# Set secrets
firebase functions:secrets:set STRIPE_SECRET_KEY
```

### Development
```bash
# Start frontend
cd frontend && npm run dev

# Start website
cd website && npm run dev

# Build functions
cd functions && npm run build

# Start emulators
firebase emulators:start
```

---

## 🎯 Function Names

| Function | Purpose | Region |
|----------|---------|--------|
| `stripeWebhook` | Handle Stripe events | europe-west2 |
| `createCustomerPortalSession` | Portal access | europe-west2 |
| `createCheckoutSession` | Custom checkout | europe-west2 |
| `getBillingHistory` | Fetch invoices | europe-west2 |
| `updateSubscriptionSeats` | Modify seats | europe-west2 |

---

## 🔐 Environment Files

| File | Contains | Committed? |
|------|----------|-----------|
| `functions/.env.local` | Secret keys, price IDs | ❌ No |
| `frontend/.env.local` | Publishable key | ❌ No |
| `website/.env.local` | Publishable key | ❌ No |
| `functions/.env.local.example` | Template | ✅ Yes |

---

## 📊 Code Name Constants

```typescript
// Quick copy-paste for code
const CODE_NAMES = {
  NOVICE: 'novice',
  APPRENTICE: 'apprentice',
  SENSEI: 'sensei',
  MASTER: 'master',
  GRANDMASTER: 'grandmaster'
}

const INTERNAL_TIERS = {
  FREE_INDIVIDUAL: 'free_individual',
  TEAM_APPRENTICE: 'team_apprentice',
  TEAM_SENSEI: 'team_sensei',
  TEAM_MASTER: 'team_master',
  ENTERPRISE: 'enterprise'
}
```

---

## 🚦 Implementation Status Indicators

| Phase | Status | Duration |
|-------|--------|----------|
| Planning | ✅ Complete | Done |
| Backend Foundation | ⏳ Pending | Week 1 |
| Customer Portal | ⏳ Pending | Week 2 |
| App Checkout | ⏳ Pending | Week 2 |
| Billing History | ⏳ Pending | Week 3 |
| Advanced Features | ⏳ Pending | Week 3-4 |
| Testing & Launch | ⏳ Pending | Week 4-5 |

---

## 📞 Quick Troubleshooting

| Issue | Check |
|-------|-------|
| Webhook not firing | Verify URL in Stripe Dashboard |
| Signature verification fails | Check `STRIPE_WEBHOOK_SECRET` |
| Price ID not found | Verify Price IDs in `.env.local` |
| Tier not updating | Check webhook logs in Firebase Console |
| Customer not found | Check `stripeCustomerId` in Firestore |

---

## 📚 Documentation Index

| Document | Quick Link |
|----------|------------|
| Main Plan | `STRIPE_INTEGRATION_PLAN.md` |
| Summary | `STRIPE_INTEGRATION_SUMMARY.md` |
| Checklist | `STRIPE_IMPLEMENTATION_CHECKLIST.md` |
| Webhooks | `STRIPE_WEBHOOK_EVENTS_GUIDE.md` |
| Configuration | `STRIPE_CONFIGURATION.md` |
| Setup Guide | `STRIPE_SETUP_GUIDE.md` |
| Env Setup | `ENV_SETUP_INSTRUCTIONS.md` |
| Status | `STRIPE_INTEGRATION_STATUS.md` |
| Quick Ref | `STRIPE_QUICK_REFERENCE.md` (this) |

---

**Print this and keep it handy during development! 📋**

