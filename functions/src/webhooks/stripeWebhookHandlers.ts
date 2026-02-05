/**
 * Stripe Webhook Event Handlers
 * Handles all Stripe webhook events and updates Firestore
 */

import * as admin from 'firebase-admin'
import { 
  determineTierFromPrice, 
  getCodeNameFromPrice, 
  getBillingCycleFromPrice 
} from '../utils/stripe'
import { 
  sendWelcomeEmail, 
  sendSubscriptionConfirmation,
  sendPaymentFailedEmail,
  sendSubscriptionCanceledEmail,
  sendAdminNotification
} from '../utils/email'

const db = admin.firestore()
const FieldValue = admin.firestore.FieldValue

type EntityType = 'user' | 'organization'

function parseClientReferenceId(
  clientReferenceId: unknown
): { entityType?: EntityType; entityId?: string } {
  if (typeof clientReferenceId !== 'string' || !clientReferenceId.trim()) return {}
  const raw = clientReferenceId.trim()

  // Preferred format: "org:{orgId}" or "user:{uid}"
  const colonParts = raw.split(':')
  if (colonParts.length >= 2) {
    const prefix = colonParts[0].toLowerCase()
    const id = colonParts.slice(1).join(':')
    if (prefix === 'org' || prefix === 'organization') return { entityType: 'organization', entityId: id }
    if (prefix === 'user') return { entityType: 'user', entityId: id }
  }

  // Back-compat formats: "org_{orgId}" or "user_{uid}"
  if (raw.toLowerCase().startsWith('org_')) return { entityType: 'organization', entityId: raw.slice(4) }
  if (raw.toLowerCase().startsWith('user_')) return { entityType: 'user', entityId: raw.slice(5) }

  // If no prefix, treat as opaque ID (caller decides type).
  return { entityId: raw }
}

function mapInternalTierToAppTiers(internalTier: string): {
  orgTier: 'free' | 'team' | 'enterprise'
  userTier: 'free_individual' | 'paid_individual' | 'team' | 'enterprise'
} {
  // Internal tiers currently used in Stripe mapping + emails:
  // - free_individual
  // - team_apprentice / team_sensei / team_master
  // - enterprise
  // Apprentice is an individual paid plan (user-billed)
  if (internalTier === 'team_apprentice') return { orgTier: 'free', userTier: 'paid_individual' }
  if (internalTier === 'enterprise') return { orgTier: 'enterprise', userTier: 'enterprise' }
  if (internalTier.startsWith('team_')) return { orgTier: 'team', userTier: 'team' }
  if (internalTier === 'paid_individual') return { orgTier: 'free', userTier: 'paid_individual' }
  return { orgTier: 'free', userTier: 'free_individual' }
}

function billingTargetForInternalTier(internalTier: string): EntityType {
  // Business rule:
  // - Apprentice => individual (user billed)
  // - Sensei/Master/Grandmaster => organization billed
  if (internalTier === 'team_apprentice') return 'user'
  if (internalTier === 'enterprise') return 'organization'
  if (internalTier.startsWith('team_')) return 'organization'
  return 'user'
}

/**
 * Handle checkout.session.completed
 * User has completed payment on pricing table or checkout page
 */
export async function handleCheckoutSessionCompleted(
  session: any
) {
  console.log('Processing checkout.session.completed:', session.id)

  const customerId = session.customer as string
  const subscriptionId = session.subscription as string
  const clientReferenceId = session.client_reference_id
  const metadata = session.metadata || {}
  const parsedRef = parseClientReferenceId(clientReferenceId)

  if (!subscriptionId) {
    console.log('No subscription in checkout session')
    return
  }

  // Determine source and entity type from metadata
  const sourceMeta = metadata.source as 'website' | 'app' | undefined
  const source: 'website' | 'app' = sourceMeta === 'app' || sourceMeta === 'website'
    ? sourceMeta
    : (parsedRef.entityId ? 'app' : 'website')

  const entityTypeFromMeta = metadata.entityType as EntityType | undefined
  let entityType: EntityType = entityTypeFromMeta || parsedRef.entityType || 'user'
  let entityId: string = parsedRef.entityId || metadata.entityId || ''
  const codeName = metadata.codeName || ''

  // Get full subscription details from Stripe
  const Stripe = require('stripe')
  const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-09-30.clover'
  })
  const subscription = await stripeClient.subscriptions.retrieve(subscriptionId)
  const priceId = subscription.items.data[0]?.price.id || ''
  const internalTier = determineTierFromPrice(priceId)
  const { orgTier, userTier } = mapInternalTierToAppTiers(internalTier)
  const desiredBillingTarget = billingTargetForInternalTier(internalTier)

  // If entityId is missing (e.g. marketing-site pricing table), try to match by email.
  if (!entityId) {
    const email: string =
      session.customer_details?.email ||
      session.customer_email ||
      ''

    if (email) {
      const userQuery = await db
        .collection('users')
        .where('email', '==', email)
        .limit(1)
        .get()

      if (!userQuery.empty) {
        const userDoc = userQuery.docs[0]
        const userData = userDoc.data() as any

        // Resolve based on billing target for the purchased plan.
        if (desiredBillingTarget === 'organization' && userData?.organizationId) {
          entityType = 'organization'
          entityId = String(userData.organizationId)
        } else {
          entityType = 'user'
          entityId = userDoc.id
        }

        console.log(`Resolved checkout entity by email: ${email} -> ${entityType} ${entityId}`)
      }
    }
  }

  // Enforce billing target (org-billed vs user-billed) based on plan.
  if (entityId && entityType !== desiredBillingTarget) {
    if (desiredBillingTarget === 'organization') {
      // We have a user id but need an org id
      if (entityType === 'user') {
        const userDoc = await db.collection('users').doc(entityId).get()
        const userData = userDoc.data() as any
        const orgId = userData?.organizationId ? String(userData.organizationId) : ''
        if (orgId) {
          entityType = 'organization'
          entityId = orgId
          console.log(`Coerced billing target to organization: user -> org ${orgId}`)
        }
      }
    } else {
      // We have an org id but need a user id (use org owner)
      if (entityType === 'organization') {
        const orgDoc = await db.collection('organizations').doc(entityId).get()
        const orgData = orgDoc.data() as any
        const ownerId = orgData?.ownerId ? String(orgData.ownerId) : ''
        if (ownerId) {
          entityType = 'user'
          entityId = ownerId
          console.log(`Coerced billing target to user: org -> owner ${ownerId}`)
        }
      }
    }
  }

  if (!entityId) {
    console.error(
      'Unable to resolve entity for checkout.session.completed. ' +
      'Expected client-reference-id like "org:{orgId}" or "user:{uid}".',
      {
        sessionId: session.id,
        customerId,
        subscriptionId,
        clientReferenceId,
        email: session.customer_details?.email || session.customer_email || null
      }
    )

    await db.collection('stripe_unmatched_checkouts').doc(session.id).set({
      sessionId: session.id,
      customerId,
      subscriptionId,
      clientReferenceId: clientReferenceId || null,
      internalTier,
      orgTier,
      userTier,
      email: session.customer_details?.email || session.customer_email || null,
      receivedAt: FieldValue.serverTimestamp()
    })

    await sendAdminNotification(
      'Stripe Checkout Unmatched',
      'A Stripe checkout completed but could not be linked to a user/org. Check stripe_unmatched_checkouts.',
      {
        sessionId: session.id,
        customerId,
        subscriptionId,
        clientReferenceId: clientReferenceId || null,
        internalTier,
        orgTier,
        userTier
      }
    )
    return
  }

  console.log(`Checkout from ${source} for ${entityType} ${entityId} - ${codeName || internalTier}`)

  // Update entity with Stripe customer ID
  if (entityType === 'organization') {
    await db.collection('organizations').doc(entityId).update({
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      tier: orgTier,
      updatedAt: FieldValue.serverTimestamp()
    })
  } else {
    await db.collection('users').doc(entityId).update({
      stripeCustomerId: customerId,
      tier: userTier,
      updatedAt: FieldValue.serverTimestamp()
    })
  }

  // Create subscription record
  await handleSubscriptionCreated(subscription, entityId, entityType, source)
}

/**
 * Handle customer.subscription.created
 */
export async function handleSubscriptionCreated(
  subscription: any,
  entityId?: string,
  entityType?: 'user' | 'organization',
  source?: 'website' | 'app'
) {
  console.log('Processing subscription.created:', subscription.id)

  const customerId = subscription.customer as string
  const priceId = subscription.items.data[0]?.price.id || ''
  const internalTier = determineTierFromPrice(priceId)
  const { orgTier, userTier } = mapInternalTierToAppTiers(internalTier)
  const codeName = getCodeNameFromPrice(priceId)
  const billingCycle = getBillingCycleFromPrice(priceId)
  const quantity = subscription.items.data[0]?.quantity || 1

  // Find entity by customer ID if not provided
  if (!entityId || !entityType) {
    const result = await findEntityByCustomerId(customerId)
    entityId = result.entityId
    entityType = result.entityType
  }

  // Create subscription document
  const subscriptionData = {
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customerId,
    ...(entityType === 'organization' 
      ? { organizationId: entityId } 
      : { userId: entityId }
    ),
    // Back-compat: keep existing "tier" field as the internal tier string.
    tier: internalTier,
    internalTier,
    orgTier,
    userTier,
    entityType,
    entityId,
    codeName,
    status: subscription.status,
    seats: quantity,
    billingCycle,
    stripePriceId: priceId,
    currentPeriodStart: new Date((subscription.current_period_start as number) * 1000),
    currentPeriodEnd: new Date((subscription.current_period_end as number) * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    ...(subscription.trial_start && {
      trialStart: new Date(subscription.trial_start * 1000)
    }),
    ...(subscription.trial_end && {
      trialEnd: new Date(subscription.trial_end * 1000)
    }),
    source: source || 'unknown',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  }

  // Store in Firestore
  await db.collection('subscriptions').doc(subscription.id).set(subscriptionData)

  // Update user/org tier
  await updateEntityTier(entityId, entityType, { orgTier, userTier }, subscription.status)

  // Get user email for sending confirmation
  const userEmail = await getUserEmail(entityId, entityType)
  const userName = await getUserName(entityId, entityType)

  if (userEmail) {
    if (source === 'website') {
      // New user from website - send welcome email
      await sendWelcomeEmail(userEmail, userName, internalTier)
    } else {
      // Existing user upgrading - send subscription confirmation
      await sendSubscriptionConfirmation(userEmail, userName, internalTier, billingCycle)
    }

    // Send admin notification
    await sendAdminNotification(
      'New Subscription Created',
      `A new subscription has been created for ${entityType} ${entityId}`,
      {
        subscriptionId: subscription.id,
        internalTier,
        orgTier,
        userTier,
        codeName,
        billingCycle,
        source,
        email: userEmail
      }
    )
  }

  console.log(`Subscription ${subscription.id} created for ${entityType} ${entityId}`)
}

/**
 * Handle customer.subscription.updated
 */
export async function handleSubscriptionUpdated(
  subscription: any
) {
  console.log('Processing subscription.updated:', subscription.id)

  const priceId = subscription.items.data[0]?.price.id || ''
  const internalTier = determineTierFromPrice(priceId)
  const { orgTier, userTier } = mapInternalTierToAppTiers(internalTier)
  const codeName = getCodeNameFromPrice(priceId)
  const quantity = subscription.items.data[0]?.quantity || 1

  // Update subscription document
  const updateData: any = {
    tier: internalTier,
    internalTier,
    orgTier,
    userTier,
    codeName,
    status: subscription.status,
    seats: quantity,
    stripePriceId: priceId,
    currentPeriodStart: new Date((subscription.current_period_start as number) * 1000),
    currentPeriodEnd: new Date((subscription.current_period_end as number) * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    updatedAt: FieldValue.serverTimestamp()
  }

  if (subscription.canceled_at) {
    updateData.canceledAt = new Date(subscription.canceled_at * 1000)
  }

  await db.collection('subscriptions').doc(subscription.id).update(updateData)

  // Get subscription to find entity
  const subDoc = await db.collection('subscriptions').doc(subscription.id).get()
  const subData = subDoc.data()

  if (subData) {
    const entityType = subData.organizationId ? 'organization' : 'user'
    const entityId = subData.organizationId || subData.userId

    // Update entity tier
    const resolvedInternalTier = subData.internalTier || subData.tier || internalTier
    const resolvedTiers = {
      ...mapInternalTierToAppTiers(resolvedInternalTier),
      // If the subscription update includes a new tier, prefer it.
      orgTier,
      userTier
    }
    await updateEntityTier(entityId, entityType, resolvedTiers, subscription.status)

    // If subscription was just canceled, send email
    if (subscription.cancel_at_period_end && !subData.cancelAtPeriodEnd) {
      const userEmail = await getUserEmail(entityId, entityType)
      const userName = await getUserName(entityId, entityType)
      
      if (userEmail) {
        await sendSubscriptionCanceledEmail(
          userEmail,
          userName,
          resolvedInternalTier,
          new Date((subscription.current_period_end as number) * 1000)
        )
      }
    }
  }

  console.log(`Subscription ${subscription.id} updated`)
}

/**
 * Handle customer.subscription.deleted
 */
export async function handleSubscriptionDeleted(
  subscription: any
) {
  console.log('Processing subscription.deleted:', subscription.id)

  // Update subscription status
  await db.collection('subscriptions').doc(subscription.id).update({
    status: 'canceled',
    canceledAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  })

  // Get subscription to find entity
  const subDoc = await db.collection('subscriptions').doc(subscription.id).get()
  const subData = subDoc.data()

  if (subData) {
    const entityType = subData.organizationId ? 'organization' : 'user'
    const entityId = subData.organizationId || subData.userId

    // Downgrade to free tier
    await updateEntityTier(
      entityId,
      entityType,
      { orgTier: 'free', userTier: 'free_individual' },
      'canceled'
    )

    // Send admin notification
    await sendAdminNotification(
      'Subscription Deleted',
      `Subscription has ended for ${entityType} ${entityId}`,
      {
        subscriptionId: subscription.id,
        internalTier: subData.internalTier || subData.tier,
        canceledAt: new Date().toISOString()
      }
    )
  }

  console.log(`Subscription ${subscription.id} canceled`)
}

/**
 * Handle invoice.payment_succeeded
 */
export async function handleInvoicePaymentSucceeded(
  invoice: any
) {
  console.log('Processing invoice.payment_succeeded:', invoice.id)

  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) {
    console.log('Invoice not related to subscription')
    return
  }

  // Get subscription to find entity
  const subDoc = await db.collection('subscriptions').doc(subscriptionId).get()
  const subData = subDoc.data()

  if (!subData) {
    console.log('Subscription not found in Firestore')
    return
  }

  // Store invoice
  await storeInvoice(invoice, subData)

  console.log(`Invoice ${invoice.id} payment succeeded`)
}

/**
 * Handle invoice.payment_failed
 */
export async function handleInvoicePaymentFailed(
  invoice: any
) {
  console.log('Processing invoice.payment_failed:', invoice.id)

  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) return

  // Update subscription status to past_due
  await db.collection('subscriptions').doc(subscriptionId).update({
    status: 'past_due',
    updatedAt: FieldValue.serverTimestamp()
  })

  // Get subscription to update entity
  const subDoc = await db.collection('subscriptions').doc(subscriptionId).get()
  const subData = subDoc.data()

  if (subData) {
    const entityType = subData.organizationId ? 'organization' : 'user'
    const entityId = subData.organizationId || subData.userId

    const resolvedInternalTier = subData.internalTier || subData.tier || 'free_individual'
    const resolvedTiers = subData.orgTier && subData.userTier
      ? { orgTier: subData.orgTier, userTier: subData.userTier }
      : mapInternalTierToAppTiers(resolvedInternalTier)

    await updateEntityTier(entityId, entityType, resolvedTiers, 'past_due')

    // Send payment failed email
    const userEmail = await getUserEmail(entityId, entityType)
    const userName = await getUserName(entityId, entityType)

    if (userEmail) {
      await sendPaymentFailedEmail(userEmail, userName, resolvedInternalTier)
    }

    // Send admin notification
    await sendAdminNotification(
      'Payment Failed',
      `Payment failed for ${entityType} ${entityId}`,
      {
        subscriptionId,
        invoiceId: invoice.id,
        email: userEmail
      }
    )
  }

  console.log(`Invoice ${invoice.id} payment failed`)
}

/**
 * Handle customer.subscription.trial_will_end
 */
export async function handleSubscriptionTrialWillEnd(
  subscription: any
) {
  console.log('Processing subscription.trial_will_end:', subscription.id)

  const subDoc = await db.collection('subscriptions').doc(subscription.id).get()
  const subData = subDoc.data()

  if (subData) {
    // Send admin notification about trial ending
    await sendAdminNotification(
      'Trial Ending Soon',
      `Trial ending soon for subscription ${subscription.id}`,
      {
        subscriptionId: subscription.id,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : 'unknown'
      }
    )
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Store invoice in Firestore
 */
async function storeInvoice(invoice: any, subscriptionData: any) {
  const invoiceData = {
    stripeInvoiceId: invoice.id,
    stripeCustomerId: invoice.customer as string,
    organizationId: subscriptionData.organizationId || null,
    userId: subscriptionData.userId || null,
    subscriptionId: invoice.subscription as string,
    amount: (invoice.amount_paid || 0) / 100, // Convert from cents
    currency: invoice.currency,
    status: invoice.status || 'draft',
    periodStart: new Date(invoice.period_start * 1000),
    periodEnd: new Date(invoice.period_end * 1000),
    ...(invoice.due_date && {
      dueDate: new Date(invoice.due_date * 1000)
    }),
    ...(invoice.status_transitions?.paid_at && {
      paidAt: new Date(invoice.status_transitions.paid_at * 1000)
    }),
    hostedInvoiceUrl: invoice.hosted_invoice_url || null,
    invoicePdfUrl: invoice.invoice_pdf || null,
    createdAt: FieldValue.serverTimestamp()
  }

  await db.collection('invoices').doc(invoice.id).set(invoiceData)
}

/**
 * Update user or organization tier
 */
async function updateEntityTier(
  entityId: string,
  entityType: 'user' | 'organization',
  tiers: { orgTier: string; userTier: string },
  status: string
) {
  const collection = entityType === 'organization' ? 'organizations' : 'users'
  
  await db.collection(collection).doc(entityId).update({
    tier: entityType === 'organization' ? tiers.orgTier : tiers.userTier,
    subscriptionStatus: status,
    updatedAt: FieldValue.serverTimestamp()
  })

  // If organization, update all members
  if (entityType === 'organization') {
    const membersQuery = await db
      .collection('users')
      .where('organizationId', '==', entityId)
      .get()

    const batch = db.batch()
    membersQuery.docs.forEach(doc => {
      batch.update(doc.ref, {
        tier: tiers.userTier,
        updatedAt: FieldValue.serverTimestamp()
      })
    })
    await batch.commit()

    console.log(`Updated ${membersQuery.size} organization members`)
  }
}

/**
 * Find entity by Stripe customer ID
 */
async function findEntityByCustomerId(customerId: string): Promise<{
  entityId: string
  entityType: 'user' | 'organization'
}> {
  // Check organizations first
  const orgQuery = await db
    .collection('organizations')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get()

  if (!orgQuery.empty) {
    return {
      entityId: orgQuery.docs[0].id,
      entityType: 'organization'
    }
  }

  // Check users
  const userQuery = await db
    .collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get()

  if (!userQuery.empty) {
    return {
      entityId: userQuery.docs[0].id,
      entityType: 'user'
    }
  }

  throw new Error(`No entity found for customer ${customerId}`)
}

/**
 * Get user email
 */
async function getUserEmail(entityId: string, entityType: 'user' | 'organization'): Promise<string> {
  if (entityType === 'organization') {
    const orgDoc = await db.collection('organizations').doc(entityId).get()
    const orgData = orgDoc.data()
    
    // Get owner's email
    if (orgData?.ownerId) {
      const ownerDoc = await db.collection('users').doc(orgData.ownerId).get()
      return ownerDoc.data()?.email || ''
    }
    return ''
  } else {
    const userDoc = await db.collection('users').doc(entityId).get()
    return userDoc.data()?.email || ''
  }
}

/**
 * Get user name
 */
async function getUserName(entityId: string, entityType: 'user' | 'organization'): Promise<string> {
  if (entityType === 'organization') {
    const orgDoc = await db.collection('organizations').doc(entityId).get()
    return orgDoc.data()?.name || 'there'
  } else {
    const userDoc = await db.collection('users').doc(entityId).get()
    return userDoc.data()?.displayName || 'there'
  }
}

