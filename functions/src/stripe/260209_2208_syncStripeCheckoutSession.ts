npm run BucketBuilder/**
 * Manual Stripe checkout sync (fallback when webhooks misconfigured/delayed).
 *
 * Given a Stripe Checkout Session ID, retrieve the subscription/price from Stripe,
 * map to our internal tiers, and update Firestore (user + optionally organization members).
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { getStripeClient, determineTierFromStripePrice } from '../utils/stripe'
import { BucketBuilder } from 'firebase-functions/v1/storage'

const db = admin.firestore()
const FieldValue = admin.firestore.FieldValue

type EntityType = 'user' | 'organization'

function mapInternalTierToAppTiers(internalTier: string): {
  orgTier: 'free' | 'team' | 'enterprise'
  userTier: 'free_individual' | 'paid_individual' | 'team' | 'enterprise'
} {
  if (internalTier === 'team_apprentice') return { orgTier: 'free', userTier: 'paid_individual' }
  if (internalTier === 'enterprise') return { orgTier: 'enterprise', userTier: 'enterprise' }
  if (internalTier.startsWith('team_')) return { orgTier: 'team', userTier: 'team' }
  if (internalTier === 'paid_individual') return { orgTier: 'free', userTier: 'paid_individual' }
  return { orgTier: 'free', userTier: 'free_individual' }
}

function billingTargetForInternalTier(internalTier: string): EntityType {
  if (internalTier === 'team_apprentice') return 'user'
  if (internalTier === 'enterprise') return 'organization'
  if (internalTier.startsWith('team_')) return 'organization'
  return 'user'
}

async function updateEntityTier(
  entityId: string,
  entityType: EntityType,
  tiers: { orgTier: 'free' | 'team' | 'enterprise'; userTier: 'free_individual' | 'paid_individual' | 'team' | 'enterprise' },
  subscriptionStatus: string
) {
  const collection = entityType === 'organization' ? 'organizations' : 'users'

  await db.collection(collection).doc(entityId).update({
    tier: entityType === 'organization' ? tiers.orgTier : tiers.userTier,
    subscriptionStatus,
    updatedAt: FieldValue.serverTimestamp()
  })

  if (entityType === 'organization') {
    const membersQuery = await db
      .collection('users')
      .where('organizationId', '==', entityId)
      .get()

    const batch = db.batch()
    membersQuery.docs.forEach(docSnap => {
      batch.update(docSnap.ref, {
        tier: tiers.userTier,
        updatedAt: FieldValue.serverTimestamp()
      })
    })
    await batch.commit()
  }
}

export const syncStripeCheckoutSession = onCall(
  {
    region: 'europe-west2',
    secrets: ['STRIPE_SECRET_KEY']
  },
  async (request) => {
    const { auth, data } = request

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated')
    }

    const sessionId = String(data?.sessionId || data?.session_id || '').trim()
    if (!sessionId) {
      throw new HttpsError('invalid-argument', 'Missing sessionId')
    }

    // Load caller's user doc (we use this to decide which org/user to apply the tier to).
    const userRef = db.collection('users').doc(auth.uid)
    const userDoc = await userRef.get()
    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'User not found')
    }
    const userData = userDoc.data() as any
    const organizationId: string | null =
      typeof userData?.organizationId === 'string' && userData.organizationId.trim()
        ? userData.organizationId.trim()
        : null

    try {
      const stripe = getStripeClient()

      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'subscription.items.data.price', 'customer']
      } as any)

      const subscription: any = session.subscription
      if (!subscription || typeof subscription !== 'object') {
        throw new HttpsError('failed-precondition', 'Checkout session has no subscription')
      }

      const price = subscription.items?.data?.[0]?.price
      const internalTier = determineTierFromStripePrice(price)
      const tiers = mapInternalTierToAppTiers(internalTier)
      const desiredTarget = billingTargetForInternalTier(internalTier)

      // Determine which entity to update.
      let entityType: EntityType = desiredTarget
      let entityId: string = auth.uid

      if (desiredTarget === 'organization') {
        if (!organizationId) {
          // User has no org, but bought a team plan — fall back to user to avoid dropping the update.
          entityType = 'user'
          entityId = auth.uid
        } else {
          entityType = 'organization'
          entityId = organizationId
        }
      } else {
        entityType = 'user'
        entityId = auth.uid
      }

      // Persist Stripe ids on the entity when present.
      const stripeCustomerId = session.customer ? String((session.customer as any).id || session.customer) : null
      const stripeSubscriptionId = subscription.id ? String(subscription.id) : null
      const status = String(subscription.status || 'active')

      if (entityType === 'organization') {
        await db.collection('organizations').doc(entityId).set({
          stripeCustomerId: stripeCustomerId || admin.firestore.FieldValue.delete(),
          stripeSubscriptionId: stripeSubscriptionId || admin.firestore.FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true })
      } else {
        await userRef.set({
          stripeCustomerId: stripeCustomerId || admin.firestore.FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true })
      }

      await updateEntityTier(entityId, entityType, tiers, status)

      await db.collection('stripe_manual_syncs').doc(sessionId).set({
        sessionId,
        requestedByUid: auth.uid,
        entityType,
        entityId,
        internalTier,
        orgTier: tiers.orgTier,
        userTier: tiers.userTier,
        subscriptionStatus: status,
        stripeCustomerId,
        stripeSubscriptionId,
        createdAt: FieldValue.serverTimestamp()
      }, { merge: true })

      return {
        success: true,
        sessionId,
        entityType,
        entityId,
        internalTier,
        orgTier: tiers.orgTier,
        userTier: tiers.userTier,
        subscriptionStatus: status
      }
    } catch (error: any) {
      console.error('syncStripeCheckoutSession failed:', error)
      if (error instanceof HttpsError) throw error
      throw new HttpsError('internal', error?.message || 'Failed to sync checkout session')
    }
  }
)

