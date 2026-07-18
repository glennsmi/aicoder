# Stripe Integration - Executive Summary

**Document:** Full lifecycle Stripe payment and subscription management  
**Date:** October 16, 2025  
**Status:** 📝 Planning Phase

---

## 🎯 Objective

Implement complete Stripe integration for AICoder.Guru to handle:
- Payment processing
- Subscription lifecycle (upgrades, downgrades, cancellations)
- Billing history and invoices
- Customer portal access
- Multi-tenant subscription management (individual + organization)

---

## 📦 Deliverables

### 1. **Backend (Cloud Functions)**
- ✅ Webhook handler for all Stripe events
- ✅ Customer Portal session creation
- ✅ Subscription management APIs
- ✅ Invoice retrieval
- ✅ Event idempotency and logging

### 2. **Frontend (React)**
- ✅ Redesigned Billing Page with embedded pricing table
- ✅ "Manage Subscription" button → Stripe Customer Portal
- ✅ Billing history table with invoice downloads
- ✅ Real-time subscription status updates
- ✅ Upgrade prompts for free users

### 3. **Database (Firestore)**
- ✅ `subscriptions` collection
- ✅ `invoices` collection
- ✅ `stripe_events` collection (idempotency)
- ✅ Updated `users` and `organizations` with `stripeCustomerId`

### 4. **Stripe Configuration**
- ✅ Products and prices configured
- ✅ Webhook endpoint set up
- ✅ Customer Portal configured
- ✅ Pricing Table embedded

---

## 🔄 Key Subscription Flows

### **Free → Paid Individual**
1. User clicks "Upgrade Plan" → Sees Stripe Pricing Table
2. User enters payment → Stripe processes
3. Webhook `checkout.session.completed` → Creates subscription in Firestore
4. User's `tier` updated to `paid_individual`
5. UI updates immediately

### **Create Organization Subscription**
1. Admin creates organization
2. Admin goes to Billing → Sees pricing table
3. Admin subscribes to Team/Enterprise plan
4. Webhook creates subscription linked to `organizationId`
5. Organization `tier` updated
6. All org members inherit tier

### **Manage Subscription**
1. User clicks "Manage Subscription"
2. Cloud Function creates Stripe Customer Portal session
3. User redirected to Stripe portal
4. User updates payment method, changes plan, or cancels
5. Webhook events update Firestore
6. User returns to app with updated subscription

### **Payment Failure**
1. Stripe attempts to charge payment method
2. Payment fails → Webhook `invoice.payment_failed`
3. Subscription status → `past_due`
4. Email sent to user
5. Stripe retries automatically
6. If all retries fail → Subscription canceled → Downgrade to free tier

---

## 📊 Data Model Overview

```typescript
// User with Stripe
{
  id: string
  email: string
  tier: 'free_individual' | 'paid_individual' | 'team' | 'enterprise'
  stripeCustomerId?: string  // NEW
  organizationId?: string
}

// Organization with Stripe
{
  id: string
  name: string
  tier: 'free' | 'team' | 'enterprise'
  stripeCustomerId?: string  // NEW
  ownerId: string
}

// Subscription (NEW)
{
  id: string
  stripeSubscriptionId: string
  stripeCustomerId: string
  userId?: string              // For individual plans
  organizationId?: string      // For team/enterprise
  tier: string
  status: 'active' | 'past_due' | 'canceled' | 'trialing'
  seats: number
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
}

// Invoice (NEW)
{
  id: string
  stripeInvoiceId: string
  userId?: string
  organizationId?: string
  amount: number
  status: 'paid' | 'open' | 'void'
  hostedInvoiceUrl: string     // Download link
  paidAt: Date
}
```

---

## ⚡ Implementation Timeline

### **Phase 1: Foundation** (Week 1)
- Set up Stripe products and webhooks
- Implement webhook handler with all event types
- Create subscription/invoice services
- Update database schema

### **Phase 2: Customer Portal** (Week 2)
- Implement portal session creation
- Add "Manage Subscription" button
- Test subscription modifications

### **Phase 3: Embedded Checkout** (Week 2)
- Add Stripe Pricing Table to app
- Handle checkout completion
- Test upgrade flows

### **Phase 4: Billing History** (Week 3)
- Display invoices in UI
- Add download links
- Real-time updates

### **Phase 5: Advanced Features** (Week 3-4)
- Seat management for teams
- Upgrade/downgrade flows
- Cancellation with retention
- Reactivation

### **Phase 6: Polish & Testing** (Week 5-6)
- End-to-end testing
- Security audit
- Documentation
- Production launch

---

## 🔐 Security Highlights

- ✅ Webhook signature verification (prevents spoofing)
- ✅ Idempotency checks (prevents duplicate processing)
- ✅ Authentication required on all APIs
- ✅ Authorization checks (user owns subscription)
- ✅ No sensitive data stored (only Stripe IDs)
- ✅ HTTPS only
- ✅ Comprehensive audit logging

---

## 🎨 User Experience

### For Free Users
- See "Upgrade Plan" button prominently
- Click → Embedded pricing table appears
- Select plan → Stripe checkout
- Success → Immediate access to paid features

### For Paid Users
- See current plan and billing date
- Click "Manage Subscription" → Opens Stripe portal
- Can update payment method, change plan, or cancel
- Return to app → Changes reflected immediately

### For Admins
- Same as above but for organization subscriptions
- Can adjust seat count
- See team-level billing history
- All members benefit from org subscription

---

## 📈 Business Metrics

### Tracked Automatically
- Monthly Recurring Revenue (MRR)
- Annual Recurring Revenue (ARR)
- Churn rate
- Failed payment rate
- Upgrade/downgrade patterns
- Customer Lifetime Value (LTV)

### Alerts
- Failed webhooks
- Payment failures spike
- Cancellation spike
- Webhook processing delays

---

## 🧪 Testing Strategy

### Test Mode
- Use Stripe test keys during development
- Stripe CLI for local webhook testing
- Test cards for various scenarios

### Integration Tests
- Complete upgrade flow
- Downgrade at period end
- Payment failure handling
- Cancellation and reactivation
- Organization subscriptions

### Production Monitoring
- First 100 transactions closely monitored
- Alerts for any webhook failures
- Daily MRR/ARR reports

---

## 📖 Key Resources

### Stripe
- **Publishable Key:** `pk_live_51SIW2HL6TuXGPgHweNfizoiPnr9B71LQT6NW6DW2kvBRrNCaQId6c446qbsgNUt6kN0ayeDzwyjmH4Z4D66H7gCS00gW8CnEv1`
- **Pricing Table ID:** `prctbl_1SIXDRL6TuXGPgHwofLggk70`
- **Webhook URL:** `https://europe-west2-aicoder-guru.cloudfunctions.net/stripeWebhook`

### Documentation
- Full plan: `plans/docs/STRIPE_INTEGRATION_PLAN.md`
- Webhook events: 20+ event types handled
- API endpoints: 5+ Cloud Functions

---

## ✅ Success Criteria

### Functional
- [x] Plan created and reviewed
- [ ] Users can upgrade seamlessly
- [ ] Subscriptions renew automatically
- [ ] Failed payments handled gracefully
- [ ] Customer portal fully functional
- [ ] Billing history accurate
- [ ] All webhooks process correctly

### Non-Functional
- [ ] Webhook latency < 2 seconds
- [ ] 99.9% success rate
- [ ] Zero duplicate charges
- [ ] Complete audit trail

---

## 🚀 Next Actions

1. **Review full plan:** `plans/docs/STRIPE_INTEGRATION_PLAN.md`
2. **Set up Stripe Dashboard:**
   - Create products for Individual, Team, Enterprise
   - Create monthly and annual prices
   - Configure webhook endpoint
   - Set up Customer Portal
3. **Start Phase 1 implementation**
4. **Weekly progress reviews**

---

## 💡 Key Decisions Made

1. **Embedded Pricing Table** vs Custom Checkout
   - ✅ Using Stripe Pricing Table for simplicity and Stripe-managed UI
   - ✅ Can add custom checkout later if needed

2. **Customer Portal** vs In-App Management
   - ✅ Using Stripe Customer Portal for payment methods and plan changes
   - ✅ Reduces PCI compliance burden
   - ✅ Stripe-managed secure UI

3. **Subscription Association**
   - ✅ Individual users: `subscription.userId`
   - ✅ Organizations: `subscription.organizationId`
   - ✅ Separate subscriptions per entity

4. **Downgrade Timing**
   - ✅ Downgrades execute at period end (not immediately)
   - ✅ Users keep paid features until subscription ends
   - ✅ Better user experience

5. **Failed Payment Handling**
   - ✅ Use Stripe Smart Retries
   - ✅ Email notifications
   - ✅ Grace period before downgrade
   - ✅ Easy reactivation

---

**Ready to proceed?** Review the full plan and let's start implementation! 🎉

