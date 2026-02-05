# Stripe Integration - Implementation Checklist

**Date:** October 16, 2025  
**Project:** AICoder.Guru Full Stripe Lifecycle Integration

---

## 🎯 Pre-Implementation Setup

### Stripe Dashboard Configuration
- [ ] **Create Products**
  - [ ] Individual Pro (monthly + annual)
  - [ ] Team (monthly + annual, with per-seat pricing)
  - [ ] Enterprise (monthly + annual, with per-seat pricing)
- [ ] **Note down all Price IDs**
- [ ] **Configure Webhook Endpoint**
  - URL: `https://europe-west2-aicoder-guru.cloudfunctions.net/stripeWebhook`
  - Events: Select all or at minimum:
    - [ ] `checkout.session.completed`
    - [ ] `customer.subscription.created`
    - [ ] `customer.subscription.updated`
    - [ ] `customer.subscription.deleted`
    - [ ] `customer.subscription.trial_will_end`
    - [ ] `invoice.payment_succeeded`
    - [ ] `invoice.payment_failed`
    - [ ] `invoice.created`
    - [ ] `invoice.finalized`
    - [ ] `invoice.paid`
- [ ] **Configure Customer Portal**
  - [ ] Enable payment method updates
  - [ ] Enable plan changes
  - [ ] Enable cancellations
  - [ ] Set return URL: `https://app.aicoder.guru/billing`
- [ ] **Get Webhook Secret** (`whsec_...`)

### Environment Variables
- [ ] Add to `functions/.env`:
  ```bash
  STRIPE_SECRET_KEY=sk_live_...
  STRIPE_PUBLISHABLE_KEY=pk_live_51SIW2HL6TuXGPgHweNfizoiPnr9B71LQT6NW6DW2kvBRrNCaQId6c446qbsgNUt6kN0ayeDzwyjmH4Z4D66H7gCS00gW8CnEv1
  STRIPE_WEBHOOK_SECRET=whsec_...
  STRIPE_PRICE_INDIVIDUAL_MONTHLY=price_...
  STRIPE_PRICE_INDIVIDUAL_ANNUAL=price_...
  STRIPE_PRICE_TEAM_MONTHLY=price_...
  STRIPE_PRICE_TEAM_ANNUAL=price_...
  STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
  STRIPE_PRICE_ENTERPRISE_ANNUAL=price_...
  ```
- [ ] Add to `frontend/.env`:
  ```bash
  VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51SIW2HL6TuXGPgHweNfizoiPnr9B71LQT6NW6DW2kvBRrNCaQId6c446qbsgNUt6kN0ayeDzwyjmH4Z4D66H7gCS00gW8CnEv1
  VITE_STRIPE_PRICING_TABLE_ID=prctbl_1SIXDRL6TuXGPgHwofLggk70
  ```

---

## 📦 Phase 1: Backend Foundation (Week 1)

### Install Dependencies
- [ ] `cd functions && npm install stripe`

### Database Schema Updates

#### Shared Types
- [ ] Update `shared/src/types/billing.ts`:
  - [ ] Add `stripeCustomerId` to User type
  - [ ] Add `stripeCustomerId` to Organization type
  - [ ] Verify `Subscription` interface
  - [ ] Verify `Invoice` interface
- [ ] Update `shared/src/schemas/user.ts`:
  - [ ] Add `stripeCustomerId?: string`
  - [ ] Add `subscriptionStatus?: string`
- [ ] Rebuild shared package: `cd shared && npm run build`

#### Firestore Collections
- [ ] Create `subscriptions` collection structure
- [ ] Create `invoices` collection structure  
- [ ] Create `stripe_events` collection structure

#### Security Rules
- [ ] Update `firestore.rules`:
  ```javascript
  // Subscriptions - readable by owner
  match /subscriptions/{subscriptionId} {
    allow read: if request.auth != null && (
      resource.data.userId == request.auth.uid ||
      resource.data.organizationId in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.organizationId
    );
    allow write: if false; // Only Cloud Functions can write
  }
  
  // Invoices - readable by owner
  match /invoices/{invoiceId} {
    allow read: if request.auth != null && (
      resource.data.userId == request.auth.uid ||
      resource.data.organizationId in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.organizationId
    );
    allow write: if false; // Only Cloud Functions can write
  }
  
  // Stripe events - admin only
  match /stripe_events/{eventId} {
    allow read: if request.auth != null && 
      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.currentRole == 'admin';
    allow write: if false; // Only Cloud Functions can write
  }
  ```
- [ ] Deploy rules: `firebase deploy --only firestore:rules`

### Utility Functions

- [ ] Create `functions/src/utils/stripe.ts`:
  ```typescript
  import Stripe from 'stripe'
  
  export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20'
  })
  ```

- [ ] Create `functions/src/utils/billing.ts`:
  - [ ] `determineTierFromPrice(priceId: string): string`
  - [ ] `getPriceIdFromTier(tier: string, billingCycle: string): string`
  - [ ] `findEntityByCustomerId(customerId: string)`

### Services

- [ ] Create `functions/src/services/billing/subscriptionService.ts`:
  - [ ] `createSubscription(data: SubscriptionData)`
  - [ ] `updateSubscription(id: string, data: Partial<SubscriptionData>)`
  - [ ] `getSubscription(id: string)`
  - [ ] `listSubscriptionsByEntity(entityId: string, entityType: string)`
  - [ ] `cancelSubscription(id: string, immediately: boolean)`

- [ ] Create `functions/src/services/billing/invoiceService.ts`:
  - [ ] `createInvoice(data: InvoiceData)`
  - [ ] `getInvoice(id: string)`
  - [ ] `listInvoicesByEntity(entityId: string, entityType: string)`

- [ ] Create `functions/src/services/billing/customerService.ts`:
  - [ ] `createOrUpdateCustomer(email: string, name?: string, metadata?: any)`
  - [ ] `getCustomer(customerId: string)`
  - [ ] `updateCustomer(customerId: string, data: any)`

### Webhook Handler

- [ ] Create `functions/src/webhooks/stripeWebhook.ts`:
  - [ ] HTTP request handler
  - [ ] Signature verification
  - [ ] Idempotency check (using `stripe_events` collection)
  - [ ] Event routing by type
  - [ ] Error handling and logging
  - [ ] Mark events as processed

- [ ] Create `functions/src/services/billing/webhookHandlers.ts`:
  - [ ] `handleCheckoutSessionCompleted(session)`
  - [ ] `handleSubscriptionCreated(subscription)`
  - [ ] `handleSubscriptionUpdated(subscription)`
  - [ ] `handleSubscriptionDeleted(subscription)`
  - [ ] `handleSubscriptionTrialWillEnd(subscription)`
  - [ ] `handleInvoicePaymentSucceeded(invoice)`
  - [ ] `handleInvoicePaymentFailed(invoice)`
  - [ ] `handleInvoiceCreatedOrUpdated(invoice)`
  - [ ] Helper: `updateEntityTier(entityId, entityType, tier, status)`
  - [ ] Helper: `storeInvoice(invoice, subscriptionData)`

- [ ] Register webhook in `functions/src/index.ts`:
  ```typescript
  export { stripeWebhook } from './webhooks/stripeWebhook'
  ```

### Testing

- [ ] Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
- [ ] Login: `stripe login`
- [ ] Build functions: `cd functions && npm run build`
- [ ] Start emulators: `firebase emulators:start`
- [ ] Forward webhooks: `stripe listen --forward-to http://localhost:5001/aicoder-guru/europe-west2/stripeWebhook`
- [ ] Trigger test events:
  - [ ] `stripe trigger checkout.session.completed`
  - [ ] `stripe trigger customer.subscription.created`
  - [ ] `stripe trigger customer.subscription.updated`
  - [ ] `stripe trigger invoice.payment_succeeded`
  - [ ] `stripe trigger invoice.payment_failed`
- [ ] Verify Firestore updates
- [ ] Verify idempotency (trigger same event twice)
- [ ] Check logs

### Deploy

- [ ] Deploy functions: `firebase deploy --only functions`
- [ ] Verify webhook endpoint in Stripe Dashboard
- [ ] Test with Stripe test mode

---

## 🎨 Phase 2: Customer Portal Integration (Week 2)

### Backend API

- [ ] Create `functions/src/api/billing/createPortalSession.ts`:
  - [ ] Authentication check
  - [ ] Get user's `stripeCustomerId` (or org's)
  - [ ] Create Stripe portal session
  - [ ] Return session URL

- [ ] Register in `functions/src/index.ts`:
  ```typescript
  export { createCustomerPortalSession } from './api/billing/createPortalSession'
  ```

- [ ] Deploy: `firebase deploy --only functions`

### Frontend Hook

- [ ] Create `frontend/src/hooks/useBilling.ts`:
  - [ ] `openCustomerPortal()` function
  - [ ] Call `createCustomerPortalSession` Cloud Function
  - [ ] Redirect to returned URL
  - [ ] Error handling

### Frontend Component

- [ ] Create `frontend/src/components/billing/CustomerPortalButton.tsx`:
  - [ ] Button with loading state
  - [ ] Call `useBilling().openCustomerPortal()`
  - [ ] Show error toast if fails

- [ ] Add to `BillingPage.tsx`:
  - [ ] Import `CustomerPortalButton`
  - [ ] Add button to "Manage Subscription" section

### Testing

- [ ] Click "Manage Subscription" button
- [ ] Verify redirects to Stripe portal
- [ ] Update payment method → Check for webhook
- [ ] Change plan → Check for webhook
- [ ] Cancel subscription → Check for webhook
- [ ] Click "Return to app" → Verify redirect works
- [ ] Check Firestore updates after each action

---

## 💳 Phase 3: Embedded Pricing Table (Week 2)

### Frontend Component

- [ ] Install dependency: `npm install @stripe/stripe-js`
- [ ] Create `frontend/src/components/billing/StripePricingTable.tsx`:
  - [ ] Load Stripe pricing table script
  - [ ] Render `<stripe-pricing-table>` element
  - [ ] Pass `customer-email={user.email}`
  - [ ] Pass `client-reference-id={user.id or organizationId}`

### Update BillingPage

- [ ] Import `StripePricingTable`
- [ ] Add section for "Upgrade Your Plan"
- [ ] Show pricing table for free users
- [ ] Hide for paid users (or show for upgrades)
- [ ] Add loading states

### Webhook Integration

- [ ] Verify `handleCheckoutSessionCompleted` works
- [ ] Map `client_reference_id` to user or org
- [ ] Create subscription in Firestore
- [ ] Update tier
- [ ] Log success

### Testing

- [ ] Free user clicks "Upgrade Plan"
- [ ] Sees pricing table
- [ ] Selects a plan
- [ ] Enters test card: `4242 4242 4242 4242`
- [ ] Completes checkout
- [ ] Webhook fires → Subscription created
- [ ] User redirected back to app
- [ ] UI updates to show paid status
- [ ] Check Firestore: `subscriptions` collection has new doc
- [ ] Check Firestore: user's `tier` updated

---

## 📜 Phase 4: Billing History (Week 3)

### Backend API

- [ ] Create `functions/src/api/billing/getBillingHistory.ts`:
  - [ ] Authentication check
  - [ ] Get user or org ID
  - [ ] Query `invoices` collection
  - [ ] Return paginated results
  - [ ] Include PDF URLs

- [ ] Register in `functions/src/index.ts`
- [ ] Deploy: `firebase deploy --only functions`

### Frontend Component

- [ ] Create `frontend/src/components/billing/BillingHistoryTable.tsx`:
  - [ ] Fetch invoices from Firestore (real-time)
  - [ ] Display in table: Date, Amount, Status, Actions
  - [ ] Add "Download PDF" button
  - [ ] Show invoice status badge
  - [ ] Handle empty state

- [ ] Create `frontend/src/components/billing/SubscriptionStatusBadge.tsx`:
  - [ ] Display status with color coding
  - [ ] `active` → green
  - [ ] `past_due` → yellow
  - [ ] `canceled` → red
  - [ ] `trialing` → blue

### Update BillingPage

- [ ] Import `BillingHistoryTable`
- [ ] Add section for "Billing History"
- [ ] Show table below current plan

### Real-time Updates

- [ ] Subscribe to invoices collection in `BillingHistoryTable`
- [ ] Update UI when new invoice created
- [ ] Show notification for new invoice

### Testing

- [ ] Create test subscription
- [ ] Wait for invoice creation (immediate for first payment)
- [ ] Check table shows invoice
- [ ] Click "Download PDF" → Opens Stripe hosted invoice
- [ ] Trigger `invoice.payment_failed` → Status updates
- [ ] Verify real-time updates work

---

## ⚙️ Phase 5: Advanced Subscription Management (Week 3-4)

### Seat Management (Team/Enterprise)

- [ ] Create `functions/src/api/billing/updateSubscriptionSeats.ts`:
  - [ ] Authentication check
  - [ ] Verify user is admin
  - [ ] Get subscription from Stripe
  - [ ] Update quantity
  - [ ] Calculate pro-ration preview
  - [ ] Return updated subscription

- [ ] Create `frontend/src/components/billing/SeatCountSelector.tsx`:
  - [ ] Number input for seat count
  - [ ] Show current count
  - [ ] Show cost preview
  - [ ] "Update" button
  - [ ] Call Cloud Function

- [ ] Add to BillingPage for team/enterprise users

### Upgrade/Downgrade Flows

- [ ] Add upgrade buttons to BillingPage
- [ ] Show pricing comparison
- [ ] Use Stripe Customer Portal for actual changes
- [ ] Display pro-ration preview
- [ ] Show confirmation dialog

### Cancellation Flow

- [ ] Add "Cancel Subscription" button
- [ ] Create `ConfirmCancelModal`:
  - [ ] Explain what happens
  - [ ] Show retention offer (optional)
  - [ ] "Cancel at period end" vs "Cancel immediately"
- [ ] Use Customer Portal for cancellation
- [ ] Update UI to show "Cancels on [date]"

### Reactivation

- [ ] Show reactivation button for canceled subscriptions
- [ ] Create `functions/src/api/billing/reactivateSubscription.ts`:
  - [ ] Update Stripe subscription
  - [ ] Set `cancel_at_period_end = false`
- [ ] Update UI

### Testing

- [ ] Test seat count increase → Pro-ration charged
- [ ] Test seat count decrease → Pro-ration credited
- [ ] Test upgrade Team → Enterprise
- [ ] Test downgrade Enterprise → Team (at period end)
- [ ] Test cancel subscription → Status updates
- [ ] Test reactivate subscription → Status updates

---

## 🚀 Phase 6: Polish & Testing (Week 4-5)

### Notifications (Email)

- [ ] Set up SendGrid or similar
- [ ] Create email templates:
  - [ ] Subscription created
  - [ ] Payment succeeded
  - [ ] Payment failed
  - [ ] Trial ending soon
  - [ ] Subscription canceled
- [ ] Send emails from webhook handlers
- [ ] Test all email flows

### Error Handling

- [ ] Add error boundaries in React components
- [ ] Add retry logic for failed API calls
- [ ] Show user-friendly error messages
- [ ] Log errors to monitoring service

### Loading States

- [ ] Add skeleton loaders for billing page
- [ ] Show loading during portal redirect
- [ ] Show loading during seat updates
- [ ] Disable buttons during operations

### Analytics

- [ ] Track subscription events in PostHog/Analytics:
  - [ ] Subscription created
  - [ ] Subscription upgraded
  - [ ] Subscription downgraded
  - [ ] Subscription canceled
  - [ ] Payment failed
- [ ] Create MRR/ARR dashboard (admin only)

### Documentation

- [ ] User guide: "How to upgrade your plan"
- [ ] User guide: "How to manage your subscription"
- [ ] User guide: "How to update payment method"
- [ ] Admin guide: "Subscription management"
- [ ] Developer docs: Webhook handling

### Security Audit

- [ ] Review webhook signature verification
- [ ] Review authentication on all APIs
- [ ] Review authorization (user owns subscription)
- [ ] Review Firestore security rules
- [ ] Penetration testing
- [ ] Code review

### End-to-End Testing

- [ ] Full upgrade flow (free → paid individual)
- [ ] Full org subscription flow (free → team → enterprise)
- [ ] Payment method update
- [ ] Plan change (upgrade + downgrade)
- [ ] Cancellation
- [ ] Reactivation
- [ ] Payment failure + recovery
- [ ] Invoice generation and download
- [ ] Multi-user scenarios (org subscriptions)

### Performance Testing

- [ ] Load test webhook endpoint
- [ ] Measure webhook processing time
- [ ] Optimize Firestore queries
- [ ] Add indexes if needed

---

## 🎉 Phase 7: Production Launch (Week 5-6)

### Pre-Launch Checklist

- [ ] All tests passing
- [ ] Security audit complete
- [ ] Documentation complete
- [ ] Error monitoring set up
- [ ] Webhook alerting configured
- [ ] Backup plan in place
- [ ] Rollback plan documented

### Launch Steps

- [ ] Switch to Stripe live keys (from test)
- [ ] Update webhook URL to production
- [ ] Update environment variables in production
- [ ] Deploy all functions
- [ ] Deploy frontend
- [ ] Verify Stripe webhook receiving events
- [ ] Test with real (small) transaction

### Monitoring

- [ ] Monitor first 10 transactions closely
- [ ] Check webhook processing times
- [ ] Verify Firestore updates
- [ ] Check error logs
- [ ] Monitor user feedback

### Post-Launch

- [ ] Announce to users (email, in-app)
- [ ] Monitor for 7 days intensively
- [ ] Daily MRR/ARR reports
- [ ] Weekly retrospective
- [ ] Address any issues immediately

---

## 📊 Success Metrics

### Week 1
- [ ] Webhook handler deployed and working
- [ ] Test events processing correctly
- [ ] Idempotency working

### Week 2
- [ ] Customer Portal accessible
- [ ] Pricing Table embedded
- [ ] First test subscription created

### Week 3
- [ ] Billing history showing
- [ ] Real-time updates working
- [ ] Seat management functional

### Week 4
- [ ] All flows tested end-to-end
- [ ] Email notifications sending
- [ ] Documentation complete

### Week 5-6
- [ ] Production launch successful
- [ ] Zero critical bugs
- [ ] First paying customers onboarded

---

## 🎯 Definition of Done

- [x] **Planning**: Comprehensive plan reviewed and approved
- [ ] **Backend**: All webhook handlers implemented and tested
- [ ] **Frontend**: Billing page fully functional with all features
- [ ] **Database**: Schema updated and security rules deployed
- [ ] **Stripe**: Products, prices, and webhook configured
- [ ] **Testing**: All flows tested end-to-end
- [ ] **Security**: Audit passed
- [ ] **Docs**: User and developer documentation complete
- [ ] **Launch**: Successfully processing subscriptions in production
- [ ] **Monitoring**: Alerts and dashboards operational

---

**Let's build this! 🚀**

