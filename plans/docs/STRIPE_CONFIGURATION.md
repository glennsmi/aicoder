# Stripe Configuration - Products, Prices & Metadata

**Version:** 1.0  
**Last Updated:** October 16, 2025  
**Purpose:** Stripe Dashboard setup with martial arts tier names and source tracking

---

## 🥋 Pricing Tiers (Martial Arts Theme)

### Tier Mapping

| Code Name | Internal Tier | User Type | Price | Max Users | API Integrations |
|-----------|--------------|-----------|-------|-----------|------------------|
| **Novice** | `free_individual` | Individual | Free | 1 | None |
| **Apprentice** | `team_apprentice` | Team | £2.99/month | 5 | None |
| **Sensei** | `team_sensei` | Team | £29/month | 10 | 1 service |
| **Master** | `team_master` | Team | £49/month | 30 | 3 services |
| **Grandmaster** | `enterprise` | Enterprise | Custom | Unlimited | All |

---

## 📦 Stripe Products to Create

### 1. Novice (Free)
**No Stripe product needed** - This is the default free tier

---

### 2. Apprentice - Team Starter

**Product Details:**
- **Name:** `AICoder.Guru - Apprentice`
- **Description:** Team starter plan for up to 5 users
- **Statement Descriptor:** `AICODER APPRENTICE`
- **Metadata:**
  ```json
  {
    "codeName": "apprentice",
    "internalTier": "team_apprentice",
    "maxUsers": "5",
    "dataRetentionDays": "90",
    "apiIntegrations": "0"
  }
  ```

**Prices to Create:**

#### Monthly (GBP)
- **Price ID:** `price_apprentice_monthly_gbp`
- **Amount:** £2.99 (299 pence)
- **Currency:** GBP
- **Billing Period:** Monthly
- **Type:** Recurring
- **Metadata:**
  ```json
  {
    "codeName": "apprentice",
    "billingCycle": "monthly",
    "currency": "gbp"
  }
  ```

#### Annual (GBP) - 20% discount
- **Price ID:** `price_apprentice_annual_gbp`
- **Amount:** £28.70 (2870 pence) - saves £7.18/year
- **Currency:** GBP
- **Billing Period:** Yearly
- **Type:** Recurring
- **Metadata:**
  ```json
  {
    "codeName": "apprentice",
    "billingCycle": "annual",
    "currency": "gbp",
    "discount": "20"
  }
  ```

---

### 3. Sensei - Team Pro

**Product Details:**
- **Name:** `AICoder.Guru - Sensei`
- **Description:** Team pro plan for up to 10 users with API integration
- **Statement Descriptor:** `AICODER SENSEI`
- **Metadata:**
  ```json
  {
    "codeName": "sensei",
    "internalTier": "team_sensei",
    "maxUsers": "10",
    "dataRetentionDays": "180",
    "apiIntegrations": "1"
  }
  ```

**Prices to Create:**

#### Monthly (GBP)
- **Price ID:** `price_sensei_monthly_gbp`
- **Amount:** £29 (2900 pence)
- **Currency:** GBP
- **Billing Period:** Monthly
- **Type:** Recurring
- **Metadata:**
  ```json
  {
    "codeName": "sensei",
    "billingCycle": "monthly",
    "currency": "gbp"
  }
  ```

#### Annual (GBP) - 20% discount
- **Price ID:** `price_sensei_annual_gbp`
- **Amount:** £278.40 (27840 pence) - saves £69.60/year
- **Currency:** GBP
- **Billing Period:** Yearly
- **Type:** Recurring
- **Metadata:**
  ```json
  {
    "codeName": "sensei",
    "billingCycle": "annual",
    "currency": "gbp",
    "discount": "20"
  }
  ```

---

### 4. Master - Team Advanced

**Product Details:**
- **Name:** `AICoder.Guru - Master`
- **Description:** Advanced team plan for up to 30 users with 3 API integrations
- **Statement Descriptor:** `AICODER MASTER`
- **Metadata:**
  ```json
  {
    "codeName": "master",
    "internalTier": "team_master",
    "maxUsers": "30",
    "dataRetentionDays": "365",
    "apiIntegrations": "3"
  }
  ```

**Prices to Create:**

#### Monthly (GBP)
- **Price ID:** `price_master_monthly_gbp`
- **Amount:** £49 (4900 pence)
- **Currency:** GBP
- **Billing Period:** Monthly
- **Type:** Recurring
- **Metadata:**
  ```json
  {
    "codeName": "master",
    "billingCycle": "monthly",
    "currency": "gbp"
  }
  ```

#### Annual (GBP) - 20% discount
- **Price ID:** `price_master_annual_gbp`
- **Amount:** £470.40 (47040 pence) - saves £117.60/year
- **Currency:** GBP
- **Billing Period:** Yearly
- **Type:** Recurring
- **Metadata:**
  ```json
  {
    "codeName": "master",
    "billingCycle": "annual",
    "currency": "gbp",
    "discount": "20"
  }
  ```

---

### 5. Grandmaster - Enterprise

**Product Details:**
- **Name:** `AICoder.Guru - Grandmaster`
- **Description:** Enterprise plan with unlimited users and all features
- **Statement Descriptor:** `AICODER ENTERPRISE`
- **Metadata:**
  ```json
  {
    "codeName": "grandmaster",
    "internalTier": "enterprise",
    "maxUsers": "-1",
    "dataRetentionDays": "-1",
    "apiIntegrations": "unlimited"
  }
  ```

**Prices to Create:**

#### Custom Pricing
- **Price ID:** `price_grandmaster_custom_gbp`
- **Amount:** Custom (negotiated)
- **Type:** Contact Sales
- **Note:** Create placeholder prices or handle via Stripe invoicing

---

## 🏷️ Metadata Strategy

### Checkout Session Metadata (Website vs App)

When creating a checkout session, always include these metadata fields:

```typescript
{
  source: 'website' | 'app',  // WHERE the checkout was initiated
  entityType: 'user' | 'organization',  // WHO is subscribing
  entityId: 'user_xxx' | 'org_xxx',  // Their ID
  codeName: 'apprentice' | 'sensei' | 'master' | 'grandmaster',  // WHAT tier
  returnUrl: 'https://aicoder.guru/success' | 'https://app.aicoder.guru/billing',  // WHERE to return
  timestamp: '2025-10-16T10:00:00Z'  // WHEN
}
```

### Website Checkout Example

```typescript
// Website pricing page checkout
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{
    price: 'price_sensei_monthly_gbp',
    quantity: 1
  }],
  customer_email: userEmail,
  client_reference_id: userId,
  success_url: 'https://aicoder.guru/success?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://aicoder.guru/pricing',
  metadata: {
    source: 'website',
    entityType: 'user',
    entityId: userId,
    codeName: 'sensei',
    returnUrl: 'https://aicoder.guru/success',
    timestamp: new Date().toISOString()
  }
})
```

### App Checkout Example

```typescript
// App billing page checkout
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{
    price: 'price_master_annual_gbp',
    quantity: 1
  }],
  customer: existingStripeCustomerId, // Existing customer
  client_reference_id: organizationId,
  success_url: 'https://app.aicoder.guru/billing?success=true',
  cancel_url: 'https://app.aicoder.guru/billing',
  metadata: {
    source: 'app',
    entityType: 'organization',
    entityId: organizationId,
    codeName: 'master',
    returnUrl: 'https://app.aicoder.guru/billing',
    timestamp: new Date().toISOString()
  }
})
```

---

## 🔄 Webhook Processing Based on Source

### Website Flow (New User Signup)

**Scenario:** User finds us via marketing, signs up on website, subscribes

**Checkout Metadata:**
```json
{
  "source": "website",
  "entityType": "user",
  "entityId": "user_abc123",
  "codeName": "sensei"
}
```

**Webhook Handler Logic:**
```typescript
if (metadata.source === 'website') {
  // 1. User might not exist in app yet - this is their first interaction
  // 2. Create user document if doesn't exist
  // 3. Send welcome email with app login link
  // 4. Set tier based on codeName
  // 5. Redirect to app with special onboarding flow
  
  await handleWebsiteCheckout({
    userId: metadata.entityId,
    codeName: metadata.codeName,
    subscriptionId: subscription.id,
    isNewUser: true  // Likely first time
  })
}
```

**Post-Checkout Actions:**
- Create user in Firestore if doesn't exist
- Send welcome email with "Complete your profile" link
- Redirect to `https://app.aicoder.guru/onboarding?subscription=success`
- Show onboarding wizard in app
- Pre-populate user data from Stripe customer

---

### App Flow (Existing User Upgrade)

**Scenario:** User already using free tier in app, decides to upgrade

**Checkout Metadata:**
```json
{
  "source": "app",
  "entityType": "organization",
  "entityId": "org_xyz789",
  "codeName": "master"
}
```

**Webhook Handler Logic:**
```typescript
if (metadata.source === 'app') {
  // 1. User/org already exists
  // 2. Update tier immediately
  // 3. Send upgrade confirmation email
  // 4. Enable paid features
  // 5. Redirect back to app billing page
  
  await handleAppCheckout({
    organizationId: metadata.entityId,
    codeName: metadata.codeName,
    subscriptionId: subscription.id,
    existingEntity: true
  })
}
```

**Post-Checkout Actions:**
- Update organization tier immediately
- Unlock paid features (API integrations, team management)
- Show success toast: "Welcome to Master tier! 🥋"
- Redirect to `https://app.aicoder.guru/billing?upgraded=true`
- No onboarding needed

---

## 🎯 Code Name to Internal Tier Mapping

```typescript
// functions/src/utils/billing.ts

export const CODE_NAME_TO_TIER: Record<string, string> = {
  'novice': 'free_individual',
  'apprentice': 'team_apprentice',
  'sensei': 'team_sensei',
  'master': 'team_master',
  'grandmaster': 'enterprise'
}

export const TIER_TO_CODE_NAME: Record<string, string> = {
  'free_individual': 'novice',
  'team_apprentice': 'apprentice',
  'team_sensei': 'sensei',
  'team_master': 'master',
  'enterprise': 'grandmaster'
}

export function determineTierFromPrice(priceId: string): string {
  // Extract code name from price ID
  if (priceId.includes('apprentice')) return 'team_apprentice'
  if (priceId.includes('sensei')) return 'team_sensei'
  if (priceId.includes('master')) return 'team_master'
  if (priceId.includes('grandmaster')) return 'enterprise'
  
  return 'free_individual'
}

export function determineTierFromCodeName(codeName: string): string {
  return CODE_NAME_TO_TIER[codeName.toLowerCase()] || 'free_individual'
}

export function getCodeNameFromTier(tier: string): string {
  return TIER_TO_CODE_NAME[tier] || 'novice'
}

export function getPriceIdFromCodeName(
  codeName: string,
  billingCycle: 'monthly' | 'annual'
): string {
  return `price_${codeName}_${billingCycle}_gbp`
}
```

---

## 🌐 Website Pricing Table Configuration

### Update Website Pricing Table

The Stripe pricing table on the website needs to pass metadata:

**Current (website/src/pages/PricingPage.tsx):**
```tsx
<stripe-pricing-table 
  pricing-table-id="prctbl_1SIXDRL6TuXGPgHwofLggk70"
  publishable-key="pk_live_51SIW2HL6TuXGPgHweNfizoiPnr9B71LQT6NW6DW2kvBRrNCaQId6c446qbsgNUt6kN0ayeDzwyjmH4Z4D66H7gCS00gW8CnEv1">
</stripe-pricing-table>
```

**Updated with metadata:**
```tsx
<stripe-pricing-table 
  pricing-table-id="prctbl_1SIXDRL6TuXGPgHwofLggk70"
  publishable-key="pk_live_51SIW2HL6TuXGPgHweNfizoiPnr9B71LQT6NW6DW2kvBRrNCaQId6c446qbsgNUt6kN0ayeDzwyjmH4Z4D66H7gCS00gW8CnEv1"
  customer-session-client-secret={clientSecret}>
</stripe-pricing-table>
```

**Note:** Stripe Pricing Tables have limited metadata support. Instead, configure in Stripe Dashboard:
1. Go to Pricing Tables in Stripe Dashboard
2. Edit your pricing table
3. Set success/cancel URLs with query params
4. Add metadata to products/prices (we did this above)

**Alternative:** Create custom checkout with full metadata control

---

## 📱 App Pricing Table Configuration

### Option 1: Embedded Pricing Table (Simple)

```tsx
// frontend/src/components/billing/StripePricingTable.tsx
import { useAuth } from '../../contexts/AuthContext'
import { useOrganization } from '../../contexts/OrganizationContext'

export default function StripePricingTable() {
  const { user, currentUser } = useAuth()
  const { organization } = useOrganization()

  const entityType = organization ? 'organization' : 'user'
  const entityId = organization?.id || user?.id

  return (
    <stripe-pricing-table
      pricing-table-id="prctbl_1SIXDRL6TuXGPgHwofLggk70"
      publishable-key={import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY}
      customer-email={currentUser?.email}
      client-reference-id={entityId}
    />
  )
}
```

### Option 2: Custom Checkout (Full Control)

```tsx
// frontend/src/components/billing/CustomCheckout.tsx
import { httpsCallable } from 'firebase/functions'
import { functions } from '../../config/firebase'

export default function CustomCheckout() {
  const createCheckout = async (codeName: string, billingCycle: 'monthly' | 'annual') => {
    try {
      const createCheckoutSession = httpsCallable(
        functions,
        'createCheckoutSession'
      )
      
      const result = await createCheckoutSession({
        codeName,
        billingCycle,
        source: 'app',
        returnUrl: window.location.href
      })
      
      const { url } = result.data as { url: string }
      window.location.href = url
    } catch (error) {
      console.error('Checkout failed:', error)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Apprentice Card */}
      <div className="border rounded-lg p-6">
        <h3 className="text-2xl font-bold">Apprentice</h3>
        <p className="text-4xl font-bold mt-4">£2.99<span className="text-sm">/month</span></p>
        <button 
          onClick={() => createCheckout('apprentice', 'monthly')}
          className="btn-primary mt-6"
        >
          Subscribe Monthly
        </button>
        <button 
          onClick={() => createCheckout('apprentice', 'annual')}
          className="btn-secondary mt-2"
        >
          Subscribe Annual (Save 20%)
        </button>
      </div>

      {/* Sensei Card */}
      <div className="border-2 border-primary rounded-lg p-6">
        <div className="badge">Most Popular</div>
        <h3 className="text-2xl font-bold">Sensei</h3>
        <p className="text-4xl font-bold mt-4">£29<span className="text-sm">/month</span></p>
        <button 
          onClick={() => createCheckout('sensei', 'monthly')}
          className="btn-primary mt-6"
        >
          Subscribe Monthly
        </button>
        <button 
          onClick={() => createCheckout('sensei', 'annual')}
          className="btn-secondary mt-2"
        >
          Subscribe Annual (Save 20%)
        </button>
      </div>

      {/* Master Card */}
      <div className="border rounded-lg p-6">
        <h3 className="text-2xl font-bold">Master</h3>
        <p className="text-4xl font-bold mt-4">£49<span className="text-sm">/month</span></p>
        <button 
          onClick={() => createCheckout('master', 'monthly')}
          className="btn-primary mt-6"
        >
          Subscribe Monthly
        </button>
        <button 
          onClick={() => createCheckout('master', 'annual')}
          className="btn-secondary mt-2"
        >
          Subscribe Annual (Save 20%)
        </button>
      </div>
    </div>
  )
}
```

---

## 🔧 Cloud Function: Custom Checkout Session

```typescript
// functions/src/api/billing/createCheckoutSession.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import Stripe from 'stripe'
import { auth, firestore } from '../../config/firebase'
import { getPriceIdFromCodeName, determineTierFromCodeName } from '../../utils/billing'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

interface CheckoutData {
  codeName: string  // 'apprentice' | 'sensei' | 'master' | 'grandmaster'
  billingCycle: 'monthly' | 'annual'
  source: 'website' | 'app'
  returnUrl?: string
}

export const createCheckoutSession = onCall(
  { region: 'europe-west2' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated')
    }

    const userId = request.auth.uid
    const data = request.data as CheckoutData

    // Get user data
    const userDoc = await firestore.collection('users').doc(userId).get()
    const userData = userDoc.data()

    if (!userData) {
      throw new HttpsError('not-found', 'User not found')
    }

    const entityType = userData.organizationId ? 'organization' : 'user'
    const entityId = userData.organizationId || userId

    // Get or create Stripe customer
    let customerId = userData.stripeCustomerId

    if (userData.organizationId) {
      const orgDoc = await firestore
        .collection('organizations')
        .doc(userData.organizationId)
        .get()
      customerId = orgDoc.data()?.stripeCustomerId
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: request.auth.token.email || userData.email,
        name: userData.displayName,
        metadata: {
          entityType,
          entityId,
          source: data.source
        }
      })
      customerId = customer.id

      // Save customer ID
      if (entityType === 'organization') {
        await firestore
          .collection('organizations')
          .doc(entityId)
          .update({ stripeCustomerId: customerId })
      } else {
        await firestore
          .collection('users')
          .doc(entityId)
          .update({ stripeCustomerId: customerId })
      }
    }

    // Get price ID
    const priceId = getPriceIdFromCodeName(data.codeName, data.billingCycle)

    // Determine success/cancel URLs
    const baseUrl = data.source === 'website' 
      ? 'https://aicoder.guru' 
      : 'https://app.aicoder.guru'
    
    const successUrl = data.returnUrl || `${baseUrl}/billing?success=true`
    const cancelUrl = data.returnUrl || `${baseUrl}/billing`

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      client_reference_id: entityId,
      success_url: `${successUrl}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        source: data.source,
        entityType,
        entityId,
        codeName: data.codeName,
        internalTier: determineTierFromCodeName(data.codeName),
        returnUrl: successUrl,
        timestamp: new Date().toISOString()
      }
    })

    return { url: session.url }
  }
)
```

---

## 🎣 Webhook Handler with Source Detection

```typescript
// functions/src/services/billing/webhookHandlers.ts

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  console.log('Processing checkout.session.completed:', session.id)

  const metadata = session.metadata || {}
  const source = metadata.source as 'website' | 'app'
  const entityType = metadata.entityType as 'user' | 'organization'
  const entityId = metadata.entityId
  const codeName = metadata.codeName
  const internalTier = metadata.internalTier

  console.log(`Checkout from ${source} for ${entityType} ${entityId} - ${codeName} tier`)

  // Get subscription
  const subscriptionId = session.subscription as string
  const customerId = session.customer as string

  if (!subscriptionId) {
    console.log('No subscription in checkout session')
    return
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20'
  })
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  // Handle based on source
  if (source === 'website') {
    await handleWebsiteCheckout({
      session,
      subscription,
      entityType,
      entityId,
      codeName,
      internalTier,
      customerId
    })
  } else if (source === 'app') {
    await handleAppCheckout({
      session,
      subscription,
      entityType,
      entityId,
      codeName,
      internalTier,
      customerId
    })
  }

  // Create subscription record (common for both)
  await createSubscriptionRecord(subscription, entityId, entityType, internalTier)
}

async function handleWebsiteCheckout(params: {
  session: Stripe.Checkout.Session
  subscription: Stripe.Subscription
  entityType: string
  entityId: string
  codeName: string
  internalTier: string
  customerId: string
}) {
  console.log('Handling WEBSITE checkout')

  // Check if user exists
  const userDoc = await firestore.collection('users').doc(params.entityId).get()

  if (!userDoc.exists) {
    // User signed up via website - create user document
    await firestore.collection('users').doc(params.entityId).set({
      id: params.entityId,
      email: params.session.customer_details?.email || params.session.customer_email,
      displayName: params.session.customer_details?.name || 'New User',
      tier: params.internalTier,
      stripeCustomerId: params.customerId,
      currentRole: 'individual',
      organizationId: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      metadata: {
        signupSource: 'website',
        firstSubscription: params.codeName
      }
    })

    // Send welcome email
    await sendWelcomeEmail({
      email: params.session.customer_details?.email,
      tier: params.codeName,
      appUrl: 'https://app.aicoder.guru/onboarding?new=true'
    })
  } else {
    // Existing user upgrading from website
    await firestore.collection('users').doc(params.entityId).update({
      tier: params.internalTier,
      stripeCustomerId: params.customerId,
      updatedAt: FieldValue.serverTimestamp()
    })

    // Send upgrade email
    await sendUpgradeEmail({
      email: userDoc.data()?.email,
      tier: params.codeName
    })
  }

  console.log(`Website checkout processed for ${params.entityType} ${params.entityId}`)
}

async function handleAppCheckout(params: {
  session: Stripe.Checkout.Session
  subscription: Stripe.Subscription
  entityType: string
  entityId: string
  codeName: string
  internalTier: string
  customerId: string
}) {
  console.log('Handling APP checkout')

  // Update existing entity (user or org)
  const collection = params.entityType === 'organization' ? 'organizations' : 'users'
  
  await firestore.collection(collection).doc(params.entityId).update({
    tier: params.internalTier,
    stripeCustomerId: params.customerId,
    subscriptionStatus: 'active',
    updatedAt: FieldValue.serverTimestamp()
  })

  // If organization, update all members
  if (params.entityType === 'organization') {
    const membersQuery = await firestore
      .collection('users')
      .where('organizationId', '==', params.entityId)
      .get()

    const batch = firestore.batch()
    membersQuery.docs.forEach(doc => {
      batch.update(doc.ref, {
        tier: params.internalTier,
        updatedAt: FieldValue.serverTimestamp()
      })
    })
    await batch.commit()

    console.log(`Updated ${membersQuery.size} organization members`)
  }

  // Send confirmation email
  await sendUpgradeConfirmationEmail({
    entityType: params.entityType,
    entityId: params.entityId,
    tier: params.codeName
  })

  console.log(`App checkout processed for ${params.entityType} ${params.entityId}`)
}
```

---

## 🎨 UI Differences: Website vs App

### Website Checkout Flow
1. User on `aicoder.guru/pricing`
2. Clicks "Subscribe" on a plan
3. Redirects to Stripe Checkout
4. After payment → Redirects to `aicoder.guru/success`
5. Success page says "Check your email to access the app!"
6. Email contains link to `app.aicoder.guru/login`
7. User logs in (or creates password if new)
8. Lands on app with paid tier already active

### App Checkout Flow
1. User on `app.aicoder.guru/billing`
2. Already logged in
3. Clicks "Upgrade to Sensei"
4. Redirects to Stripe Checkout (pre-filled with customer data)
5. After payment → Redirects back to `app.aicoder.guru/billing?success=true`
6. Shows success toast
7. UI immediately reflects new tier (features unlocked)

---

## ✅ Setup Checklist

### Stripe Dashboard
- [ ] Create Product: Apprentice (with metadata)
- [ ] Create Price: `price_apprentice_monthly_gbp`
- [ ] Create Price: `price_apprentice_annual_gbp`
- [ ] Create Product: Sensei (with metadata)
- [ ] Create Price: `price_sensei_monthly_gbp`
- [ ] Create Price: `price_sensei_annual_gbp`
- [ ] Create Product: Master (with metadata)
- [ ] Create Price: `price_master_monthly_gbp`
- [ ] Create Price: `price_master_annual_gbp`
- [ ] Create Product: Grandmaster (with metadata)
- [ ] Create Price: `price_grandmaster_custom_gbp`

### Environment Variables
- [ ] Add all price IDs to `functions/.env`
- [ ] Add code name mappings
- [ ] Add to `frontend/.env`
- [ ] Add to `website/.env`

### Code Updates
- [ ] Create `utils/billing.ts` with mapping functions
- [ ] Update webhook handler with source detection
- [ ] Create `createCheckoutSession` Cloud Function
- [ ] Update website pricing page (if custom checkout)
- [ ] Update app billing page with pricing options

---

**Ready to configure Stripe Dashboard with these exact specifications! 🥋**

