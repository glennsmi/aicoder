# Stripe Integration - Current Status

**Last Updated:** October 16, 2025  
**Status:** 📋 **Planning Complete** - Ready for Implementation

---

## ✅ What's Done

### Documentation Created
- ✅ **STRIPE_INTEGRATION_PLAN.md** - Complete technical implementation plan (1,448 lines)
- ✅ **STRIPE_INTEGRATION_SUMMARY.md** - Executive summary and overview
- ✅ **STRIPE_IMPLEMENTATION_CHECKLIST.md** - Phase-by-phase task checklist
- ✅ **STRIPE_WEBHOOK_EVENTS_GUIDE.md** - Complete webhook reference
- ✅ **STRIPE_CONFIGURATION.md** - Martial arts tier configuration with metadata tracking
- ✅ **STRIPE_SETUP_GUIDE.md** - Quick start guide for existing pricing table
- ✅ **ENV_SETUP_INSTRUCTIONS.md** - Environment variable setup guide

### Website
- ✅ Stripe Pricing Table already embedded on `aicoder.guru/pricing`
- ✅ Pricing Table ID: `prctbl_1SIXDRL6TuXGPgHwofLggk70`
- ✅ Publishable Key configured
- ✅ Martial arts tier names: Apprentice, Sensei, Master, Grandmaster

### Planning
- ✅ Tier mapping defined (code names → internal tiers)
- ✅ Metadata strategy for website vs app tracking
- ✅ Webhook event handling strategy
- ✅ Database schema designed
- ✅ Security considerations documented
- ✅ Testing strategy outlined

---

## 📋 What's Next

### Immediate Setup Tasks (Before Implementation)

1. **Get Stripe Keys** (from you)
   - [ ] Secret Key (`sk_live_...` or `sk_test_...`)
   - [ ] Webhook Secret (create webhook endpoint first)
   
2. **Get Price IDs** (from Stripe Dashboard)
   - [ ] Apprentice Monthly price ID
   - [ ] Apprentice Annual price ID
   - [ ] Sensei Monthly price ID
   - [ ] Sensei Annual price ID
   - [ ] Master Monthly price ID
   - [ ] Master Annual price ID
   - [ ] Grandmaster Monthly price ID
   - [ ] Grandmaster Annual price ID

3. **Create Environment Files**
   - [ ] `functions/.env.local`
   - [ ] `frontend/.env.local`
   - [ ] `website/.env.local`

4. **Configure Stripe Dashboard**
   - [ ] Add metadata to existing products/prices
   - [ ] Create webhook endpoint (after deploying function)
   - [ ] Configure Customer Portal settings

---

## 🚀 Implementation Phases

### Phase 1: Backend Foundation (Week 1)
**Goal:** Working webhook handler that processes all Stripe events

**Tasks:**
- [ ] Install dependencies: `npm install stripe` in functions
- [ ] Create utility functions (`utils/billing.ts`)
- [ ] Create webhook handler (`webhooks/stripeWebhook.ts`)
- [ ] Create webhook event handlers (`services/billing/webhookHandlers.ts`)
- [ ] Update Firestore schema (add collections)
- [ ] Deploy security rules
- [ ] Deploy functions
- [ ] Test with Stripe CLI

**Deliverables:**
- Working webhook that creates subscriptions in Firestore
- Price ID → Tier mapping
- Source tracking (website vs app)
- Idempotency checks

---

### Phase 2: Customer Portal (Week 2)
**Goal:** Users can manage subscriptions via Stripe portal

**Tasks:**
- [ ] Create `createCustomerPortalSession` Cloud Function
- [ ] Create `useBilling` hook in frontend
- [ ] Create `CustomerPortalButton` component
- [ ] Add to BillingPage
- [ ] Test portal link generation

**Deliverables:**
- "Manage Subscription" button works
- Users can update payment methods
- Users can change plans
- Users can cancel subscriptions

---

### Phase 3: App Checkout (Week 2)
**Goal:** Users can upgrade from within the app

**Tasks:**
- [ ] Option A: Embed pricing table in app
- [ ] Option B: Create custom checkout with full metadata
- [ ] Handle success/cancel redirects
- [ ] Update UI after successful checkout

**Deliverables:**
- Upgrade button in app billing page
- Seamless checkout flow
- Immediate tier updates in UI

---

### Phase 4: Billing History (Week 3)
**Goal:** Display invoices and payment history

**Tasks:**
- [ ] Create `BillingHistoryTable` component
- [ ] Fetch invoices from Firestore
- [ ] Display invoice status, dates, amounts
- [ ] Add PDF download links
- [ ] Real-time updates

**Deliverables:**
- Complete billing history visible
- Downloadable invoices
- Real-time updates when new invoices created

---

### Phase 5: Advanced Features (Week 3-4)
**Goal:** Full subscription lifecycle management

**Tasks:**
- [ ] Seat count management (team/enterprise)
- [ ] Upgrade/downgrade flows
- [ ] Cancellation with confirmation
- [ ] Reactivation
- [ ] Email notifications
- [ ] Usage-based billing (future)

**Deliverables:**
- Complete subscription management
- Email notifications
- Pro-ration handling
- Retention flows

---

### Phase 6: Testing & Launch (Week 4-5)
**Goal:** Production-ready integration

**Tasks:**
- [ ] End-to-end testing all flows
- [ ] Security audit
- [ ] Performance testing
- [ ] Documentation
- [ ] Monitoring setup
- [ ] Launch checklist
- [ ] Go live

**Deliverables:**
- Tested and secure system
- Monitoring in place
- Documentation complete
- Live subscriptions working

---

## 🎯 Key Features

### Website Flow (Marketing → Subscription)
```
User visits aicoder.guru/pricing
  → Clicks "Start trial" on Sensei plan
  → Stripe Checkout (with metadata: source=website)
  → Payment successful
  → Webhook: checkout.session.completed
  → Creates/updates user in Firestore
  → Sets tier to team_sensei
  → Sends welcome email
  → Redirects to app.aicoder.guru with onboarding
```

### App Flow (Existing User Upgrade)
```
User on app.aicoder.guru/billing (free tier)
  → Clicks "Upgrade to Master"
  → Stripe Checkout (with metadata: source=app, organizationId)
  → Payment successful
  → Webhook: checkout.session.completed
  → Updates organization tier to team_master
  → Unlocks paid features immediately
  → Shows success message
  → Redirects back to billing page
```

### Subscription Management
```
User clicks "Manage Subscription"
  → Cloud Function creates Stripe portal session
  → Redirects to Stripe Customer Portal
  → User updates payment method / changes plan / cancels
  → Webhooks fire (subscription.updated)
  → Firestore updated
  → User returns to app
  → UI reflects changes
```

---

## 💾 Database Changes

### New Collections

1. **`subscriptions`**
   ```typescript
   {
     id: string
     stripeSubscriptionId: string
     stripeCustomerId: string
     userId?: string
     organizationId?: string
     tier: string
     status: 'active' | 'past_due' | 'canceled' | 'trialing'
     seats: number
     currentPeriodStart: Timestamp
     currentPeriodEnd: Timestamp
     cancelAtPeriodEnd: boolean
   }
   ```

2. **`invoices`**
   ```typescript
   {
     id: string
     stripeInvoiceId: string
     userId?: string
     organizationId?: string
     amount: number
     status: 'paid' | 'open' | 'void'
     hostedInvoiceUrl: string
     paidAt: Timestamp
   }
   ```

3. **`stripe_events`** (idempotency)
   ```typescript
   {
     id: string  // Stripe event ID
     type: string
     processed: boolean
     processedAt?: Timestamp
     error?: string
   }
   ```

### Updated Collections

- **`users`** - Add `stripeCustomerId`, `subscriptionStatus`
- **`organizations`** - Add `stripeCustomerId`, `subscriptionStatus`

---

## 🔑 Metadata Strategy

### Checkout Session Metadata
```typescript
{
  source: 'website' | 'app',
  entityType: 'user' | 'organization',
  entityId: 'user_xxx' | 'org_xxx',
  codeName: 'apprentice' | 'sensei' | 'master' | 'grandmaster',
  internalTier: 'team_apprentice' | 'team_sensei' | 'team_master' | 'enterprise',
  returnUrl: string,
  timestamp: string
}
```

This allows the webhook to:
- Know WHERE the checkout came from (website vs app)
- Know WHO is subscribing (user vs organization)
- Know WHAT tier they selected
- Route them back to the appropriate place

---

## 📊 Pricing Tiers

| Code Name | Internal Tier | Price/Month | Price/Year | Users | API Integrations |
|-----------|--------------|-------------|------------|-------|------------------|
| Novice | `free_individual` | Free | Free | 1 | 0 |
| Apprentice | `team_apprentice` | £2.99 | £28.70 | 5 | 0 |
| Sensei | `team_sensei` | £29 | £278.40 | 10 | 1 |
| Master | `team_master` | £49 | £470.40 | 30 | 3 |
| Grandmaster | `enterprise` | Custom | Custom | ∞ | ∞ |

---

## 🛡️ Security

- ✅ Webhook signature verification (prevents spoofing)
- ✅ Idempotency checks (prevents duplicate processing)
- ✅ Authentication required on all Cloud Functions
- ✅ Authorization checks (user owns subscription)
- ✅ Firestore security rules
- ✅ No sensitive data in frontend
- ✅ Secrets in environment variables only
- ✅ Complete audit logging

---

## 📖 Documentation Index

| Document | Purpose | Audience |
|----------|---------|----------|
| `STRIPE_INTEGRATION_PLAN.md` | Complete technical plan | Developers |
| `STRIPE_INTEGRATION_SUMMARY.md` | Executive overview | Everyone |
| `STRIPE_IMPLEMENTATION_CHECKLIST.md` | Task checklist | Developers |
| `STRIPE_WEBHOOK_EVENTS_GUIDE.md` | Webhook reference | Developers |
| `STRIPE_CONFIGURATION.md` | Tier & metadata config | Developers |
| `STRIPE_SETUP_GUIDE.md` | Quick start guide | Developers |
| `ENV_SETUP_INSTRUCTIONS.md` | Environment setup | Developers |
| `STRIPE_INTEGRATION_STATUS.md` | Current status (this doc) | Everyone |

---

## 🎬 Ready to Start?

**Next Actions:**

1. **Provide Stripe Keys**
   - Secret key
   - Price IDs from existing products

2. **Create `.env.local` Files**
   - Follow `ENV_SETUP_INSTRUCTIONS.md`

3. **Start Phase 1 Implementation**
   - Follow `STRIPE_IMPLEMENTATION_CHECKLIST.md`
   - Begin with backend foundation

4. **Test Locally**
   - Use Stripe CLI
   - Test webhooks
   - Verify Firestore updates

5. **Deploy & Test**
   - Deploy functions
   - Configure webhook in Stripe
   - Test end-to-end

---

## 📞 Questions?

- Check the relevant documentation above
- Review Stripe Dashboard → Developers → Logs
- Use Stripe CLI: `stripe logs tail`
- Test with Stripe test cards

---

**Status: Ready to implement! Just need the Stripe keys to begin.** 🚀

