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

  if (!subscriptionId) {
    console.log('No subscription in checkout session')
    return
  }

  // Determine source and entity type from metadata
  const source = metadata.source as 'website' | 'app' || 'website'
  const entityType = metadata.entityType as 'user' | 'organization' || 'user'
  const entityId = clientReferenceId || metadata.entityId || ''
  const codeName = metadata.codeName || ''

  console.log(`Checkout from ${source} for ${entityType} ${entityId} - ${codeName} tier`)

  // Get full subscription details from Stripe
  const Stripe = require('stripe')
  const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-09-30.clover'
  })
  const subscription = await stripeClient.subscriptions.retrieve(subscriptionId)

  // Update entity with Stripe customer ID
  if (entityType === 'organization') {
    await db.collection('organizations').doc(entityId).update({
      stripeCustomerId: customerId,
      updatedAt: FieldValue.serverTimestamp()
    })
  } else {
    await db.collection('users').doc(entityId).update({
      stripeCustomerId: customerId,
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
  const tier = determineTierFromPrice(priceId)
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
    tier,
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
  await updateEntityTier(entityId, entityType, tier, subscription.status)

  // Get user email for sending confirmation
  const userEmail = await getUserEmail(entityId, entityType)
  const userName = await getUserName(entityId, entityType)

  if (userEmail) {
    if (source === 'website') {
      // New user from website - send welcome email
      await sendWelcomeEmail(userEmail, userName, tier)
    } else {
      // Existing user upgrading - send subscription confirmation
      await sendSubscriptionConfirmation(userEmail, userName, tier, billingCycle)
    }

    // Send admin notification
    await sendAdminNotification(
      'New Subscription Created',
      `A new subscription has been created for ${entityType} ${entityId}`,
      {
        subscriptionId: subscription.id,
        tier,
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
  const tier = determineTierFromPrice(priceId)
  const codeName = getCodeNameFromPrice(priceId)
  const quantity = subscription.items.data[0]?.quantity || 1

  // Update subscription document
  const updateData: any = {
    tier,
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
    await updateEntityTier(entityId, entityType, tier, subscription.status)

    // If subscription was just canceled, send email
    if (subscription.cancel_at_period_end && !subData.cancelAtPeriodEnd) {
      const userEmail = await getUserEmail(entityId, entityType)
      const userName = await getUserName(entityId, entityType)
      
      if (userEmail) {
        await sendSubscriptionCanceledEmail(
          userEmail,
          userName,
          tier,
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
    const freeTier = entityType === 'organization' ? 'free' : 'free_individual'
    await updateEntityTier(entityId, entityType, freeTier, 'canceled')

    // Send admin notification
    await sendAdminNotification(
      'Subscription Deleted',
      `Subscription has ended for ${entityType} ${entityId}`,
      {
        subscriptionId: subscription.id,
        tier: subData.tier,
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

    await updateEntityTier(entityId, entityType, subData.tier, 'past_due')

    // Send payment failed email
    const userEmail = await getUserEmail(entityId, entityType)
    const userName = await getUserName(entityId, entityType)

    if (userEmail) {
      await sendPaymentFailedEmail(userEmail, userName, subData.tier)
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
  tier: string,
  status: string
) {
  const collection = entityType === 'organization' ? 'organizations' : 'users'
  
  await db.collection(collection).doc(entityId).update({
    tier,
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
        tier,
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

