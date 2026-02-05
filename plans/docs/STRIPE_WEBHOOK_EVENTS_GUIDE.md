# Stripe Webhook Events - Quick Reference

**Purpose:** Understanding what each Stripe webhook event means and how to handle it  
**Date:** October 16, 2025

---

## 🔔 Core Events (Must Handle)

### `checkout.session.completed`
**When:** Customer completes payment on pricing table or checkout page  
**Means:** New subscription or one-time payment successful  
**Action:**
- Extract `customer` (Stripe customer ID)
- Extract `subscription` (Stripe subscription ID)
- Extract `client_reference_id` (your user/org ID)
- Retrieve full subscription details from Stripe
- Create subscription document in Firestore
- Update user/org with `stripeCustomerId`
- Update user/org `tier`
- Send welcome email

**Data Available:**
```json
{
  "id": "cs_test_...",
  "object": "checkout.session",
  "customer": "cus_...",
  "subscription": "sub_...",
  "client_reference_id": "user_123",
  "metadata": {
    "entityType": "user",
    "entityId": "user_123"
  }
}
```

---

### `customer.subscription.created`
**When:** New subscription created (can also fire during checkout)  
**Means:** Subscription officially started in Stripe  
**Action:**
- Create subscription document in Firestore
- Set `status`, `currentPeriodStart`, `currentPeriodEnd`, `tier`
- Update user/org tier
- Link subscription to user or org

**Data Available:**
```json
{
  "id": "sub_...",
  "object": "subscription",
  "customer": "cus_...",
  "status": "active",
  "items": {
    "data": [{
      "price": {
        "id": "price_...",
        "recurring": {
          "interval": "month"
        }
      },
      "quantity": 5
    }]
  },
  "current_period_start": 1697472000,
  "current_period_end": 1700064000,
  "trial_start": null,
  "trial_end": null
}
```

---

### `customer.subscription.updated`
**When:** Subscription modified (plan change, seat count, cancellation scheduled)  
**Means:** Something about the subscription changed  
**Action:**
- Update subscription document in Firestore
- Update `status`, `tier`, `seats`, `cancelAtPeriodEnd`
- Update user/org tier if tier changed
- If `cancel_at_period_end` = true, show "Cancels on [date]" in UI

**Common Changes:**
- Plan upgrade/downgrade
- Seat count increased/decreased
- Payment method updated
- Cancellation scheduled (`cancel_at_period_end: true`)
- Subscription reactivated (`cancel_at_period_end: false`)
- Trial converted to paid

**Data Available:**
```json
{
  "id": "sub_...",
  "status": "active",
  "cancel_at_period_end": false,
  "canceled_at": null,
  "items": {
    "data": [{
      "quantity": 10  // Changed from 5
    }]
  }
}
```

---

### `customer.subscription.deleted`
**When:** Subscription ended (trial ended without payment, canceled and period ended)  
**Means:** Subscription is now inactive  
**Action:**
- Update subscription document: `status = 'canceled'`
- Downgrade user/org to free tier
- Revoke access to paid features
- Send cancellation confirmation email

**Data Available:**
```json
{
  "id": "sub_...",
  "status": "canceled",
  "canceled_at": 1700064000,
  "ended_at": 1700064000
}
```

---

### `invoice.payment_succeeded`
**When:** Payment successfully charged for subscription or invoice  
**Means:** Billing successful, subscription continues  
**Action:**
- Store invoice in Firestore
- Update subscription `currentPeriodEnd` if needed
- Send receipt email
- Ensure subscription status is `active`

**Data Available:**
```json
{
  "id": "in_...",
  "customer": "cus_...",
  "subscription": "sub_...",
  "status": "paid",
  "amount_paid": 4900,  // $49.00
  "currency": "usd",
  "period_start": 1697472000,
  "period_end": 1700064000,
  "hosted_invoice_url": "https://invoice.stripe.com/...",
  "invoice_pdf": "https://pay.stripe.com/invoice/.../pdf"
}
```

---

### `invoice.payment_failed`
**When:** Payment failed (insufficient funds, card declined, etc.)  
**Means:** Subscription at risk, needs attention  
**Action:**
- Update subscription status to `past_due`
- Update user/org `subscriptionStatus = 'past_due'`
- Send payment failed email
- Show warning in app UI
- Stripe will auto-retry based on settings

**Data Available:**
```json
{
  "id": "in_...",
  "status": "open",  // or "uncollectible"
  "attempt_count": 1,
  "next_payment_attempt": 1697558400,
  "customer": "cus_...",
  "subscription": "sub_..."
}
```

**Stripe Smart Retries:**
- Retry 1: Immediately
- Retry 2: 3 days later
- Retry 3: 5 days later
- Retry 4: 7 days later
- After all retries fail → Subscription canceled

---

## 📢 Important Events (Should Handle)

### `customer.subscription.trial_will_end`
**When:** 3 days before trial ends (configurable)  
**Means:** Remind user to add payment method  
**Action:**
- Send reminder email
- Show in-app notification
- Provide link to add payment method

---

### `invoice.created`
**When:** Stripe generates an invoice (draft)  
**Means:** Upcoming billing  
**Action:**
- Store invoice in Firestore (status: draft)
- Can preview upcoming charges

---

### `invoice.finalized`
**When:** Invoice finalized and ready to be charged  
**Means:** About to attempt payment  
**Action:**
- Update invoice status to `open`
- Last chance to modify before charge

---

### `invoice.paid`
**When:** Invoice marked as paid (duplicate of `invoice.payment_succeeded`)  
**Means:** Same as `invoice.payment_succeeded`  
**Action:**
- Can use instead of `invoice.payment_succeeded`
- Or handle both for completeness

---

## 🔧 Operational Events (Optional)

### `customer.created`
**When:** New customer created in Stripe  
**Means:** First interaction with billing  
**Action:**
- Optionally store customer data
- Usually handled by `checkout.session.completed`

---

### `customer.updated`
**When:** Customer info changed (email, metadata, payment method)  
**Means:** Customer details updated  
**Action:**
- Update user/org data if needed
- Usually not critical

---

### `customer.deleted`
**When:** Customer deleted from Stripe  
**Means:** Account fully removed  
**Action:**
- Clean up references
- Archive data

---

### `payment_method.attached`
**When:** Customer adds new payment method  
**Means:** Can charge this payment method  
**Action:**
- Optionally log event
- No action needed

---

### `payment_method.detached`
**When:** Customer removes payment method  
**Means:** Cannot charge this method anymore  
**Action:**
- Check if customer has other payment methods
- Send warning if no payment methods left

---

## ⚠️ Edge Cases & Special Scenarios

### Scenario: Upgrade Mid-Cycle
**Events:**
1. `customer.subscription.updated` - Plan changed
2. `invoice.created` - Pro-ration invoice
3. `invoice.payment_succeeded` - Pro-rated charge

**Action:**
- Update tier immediately
- User gets upgraded access right away
- Pro-rated amount charged

---

### Scenario: Downgrade Mid-Cycle
**Events:**
1. `customer.subscription.updated` - `cancel_at_period_end: true`, new plan set for next period
2. At period end:
   - `customer.subscription.updated` - Actually changes to new plan

**Action:**
- Don't downgrade immediately
- Show "Downgrades on [date]"
- User keeps current features until period end

---

### Scenario: Cancellation
**Events:**
1. User cancels in Customer Portal
2. `customer.subscription.updated` - `cancel_at_period_end: true`
3. At period end:
   - `customer.subscription.deleted`

**Action:**
- Show "Cancels on [date]"
- User keeps access until period end
- Then downgrade to free

---

### Scenario: Failed Payment → Recovery
**Events:**
1. `invoice.payment_failed` - First attempt fails
2. (Stripe retries automatically)
3. `invoice.payment_succeeded` - Payment succeeds on retry

**Action:**
- Mark subscription as `past_due` on failure
- Send warning email
- Restore to `active` on success
- Send success email

---

### Scenario: Failed Payment → Cancellation
**Events:**
1. `invoice.payment_failed` - Attempt 1
2. `invoice.payment_failed` - Attempt 2 (3 days later)
3. `invoice.payment_failed` - Attempt 3 (5 days later)
4. `invoice.payment_failed` - Attempt 4 (7 days later)
5. `customer.subscription.deleted` - All retries exhausted

**Action:**
- Track failed attempts
- Send escalating warnings
- Downgrade to free on deletion
- Offer easy reactivation

---

### Scenario: Trial Conversion
**Events:**
1. `customer.subscription.created` - With `trial_end` set
2. `customer.subscription.trial_will_end` - 3 days before trial ends
3. At trial end:
   - `invoice.payment_succeeded` - First payment
   - `customer.subscription.updated` - Status changes to `active`

**Action:**
- Show trial status in UI
- Send reminder before trial ends
- Charge first payment at trial end
- Continue subscription

---

## 🔍 Testing Webhook Events

### Using Stripe CLI
```bash
# Install
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward to local
stripe listen --forward-to http://localhost:5001/aicoder-guru/europe-west2/stripeWebhook

# Trigger specific events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
```

### Using Stripe Dashboard
1. Go to **Developers → Webhooks → [Your Endpoint]**
2. Click **Send test webhook**
3. Select event type
4. Click **Send test webhook**

### Using Stripe Test Cards
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Insufficient funds: 4000 0000 0000 9995
Requires authentication: 4000 0025 0000 3155
```

---

## 📝 Event Handler Template

```typescript
export async function handleWebhookEvent(event: Stripe.Event) {
  // 1. Check idempotency
  const eventDoc = await firestore
    .collection('stripe_events')
    .doc(event.id)
    .get()
  
  if (eventDoc.exists && eventDoc.data()?.processed) {
    console.log(`Event ${event.id} already processed`)
    return
  }

  // 2. Store event
  await firestore.collection('stripe_events').doc(event.id).set({
    id: event.id,
    type: event.type,
    processed: false,
    createdAt: new Date()
  })

  try {
    // 3. Handle event by type
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      
      // ... more cases
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // 4. Mark as processed
    await firestore.collection('stripe_events').doc(event.id).update({
      processed: true,
      processedAt: new Date()
    })
  } catch (error) {
    console.error(`Error processing event ${event.id}:`, error)
    
    await firestore.collection('stripe_events').doc(event.id).update({
      processed: false,
      error: error.message,
      errorAt: new Date()
    })
    
    throw error
  }
}
```

---

## 🚨 Critical Error Scenarios

### Webhook Signature Verification Fails
**Cause:** Invalid signature, wrong secret, or tampered request  
**Action:** Return 400 error immediately, log security event

### Idempotency Check Fails
**Cause:** Database unavailable  
**Action:** Return 500, Stripe will retry

### Event Handler Throws Error
**Cause:** Bug in code, database issue, external service down  
**Action:** Log error, return 500, Stripe will retry, alert team

### Unknown Event Type
**Cause:** Stripe added new event type  
**Action:** Log warning, return 200 (don't fail), investigate later

---

## 📊 Webhook Monitoring

### Metrics to Track
- Events received per minute
- Processing time per event
- Success rate (200 responses)
- Failure rate (400, 500 responses)
- Events by type
- Idempotency hits

### Alerts
- Webhook signature verification failures > 5 in 5 minutes
- Event processing time > 5 seconds
- Error rate > 5% in 10 minutes
- Unknown event types received

### Logging
```typescript
console.log({
  eventId: event.id,
  eventType: event.type,
  processed: true,
  processingTime: Date.now() - startTime,
  subscriptionId: subscription?.id,
  customerId: customer?.id,
  timestamp: new Date().toISOString()
})
```

---

**Remember:** Always return a 200 response to Stripe, even for events you don't handle, to prevent unnecessary retries!

