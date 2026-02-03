/**
 * Stripe Customer Management Functions
 * Handles creating Stripe customers and generating billing portal sessions
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { getStripeClient } from '../utils/stripe'

const db = admin.firestore()

/**
 * Create a Stripe customer for a user
 * Called when a user signs up or when manually creating a customer for existing users
 */
export const createStripeCustomer = onCall(
  {
    region: 'europe-west2',
    secrets: ['STRIPE_SECRET_KEY']
  },
  async (request) => {
    const { auth, data } = request

    // Verify user is authenticated
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated')
    }

    const userId = data?.userId || auth.uid
    const email = data?.email

    // Only allow users to create their own customer or admins to create for others
    if (userId !== auth.uid) {
      // Check if user is admin (you can add more sophisticated admin checks)
      const userDoc = await db.collection('users').doc(auth.uid).get()
      const userData = userDoc.data()
      if (userData?.currentRole !== 'admin') {
        throw new HttpsError('permission-denied', 'Only admins can create customers for other users')
      }
    }

    try {
      console.log(`Creating Stripe customer for user: ${userId}`)

      // Get user data
      const userDocRef = db.collection('users').doc(userId)
      const userDoc = await userDocRef.get()

      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User not found')
      }

      const userData = userDoc.data()!

      // Check if user already has a Stripe customer ID
      if (userData.stripeCustomerId) {
        console.log(`User ${userId} already has Stripe customer: ${userData.stripeCustomerId}`)
        return {
          success: true,
          customerId: userData.stripeCustomerId,
          message: 'Customer already exists'
        }
      }

      const stripe = getStripeClient()

      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: email || userData.email,
        name: userData.displayName || undefined,
        metadata: {
          firebaseUserId: userId,
          organizationId: userData.organizationId || '',
          tier: userData.tier || 'free_individual'
        }
      })

      console.log(`Created Stripe customer: ${customer.id} for user: ${userId}`)

      // Update user document with Stripe customer ID
      await userDocRef.update({
        stripeCustomerId: customer.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      return {
        success: true,
        customerId: customer.id,
        message: 'Stripe customer created successfully'
      }
    } catch (error: any) {
      console.error('Error creating Stripe customer:', error)
      throw new HttpsError('internal', `Failed to create Stripe customer: ${error.message}`)
    }
  }
)

/**
 * Create a Stripe billing portal session
 * Allows users to manage their subscription, payment methods, and billing history
 */
export const createBillingPortalSession = onCall(
  {
    region: 'europe-west2',
    secrets: ['STRIPE_SECRET_KEY']
  },
  async (request) => {
    const { auth, data } = request

    // Verify user is authenticated
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated')
    }

    const returnUrl = data?.returnUrl || process.env.VITE_APP_URL || 'http://localhost:3003'

    try {
      console.log(`Creating billing portal session for user: ${auth.uid}`)

      // Get user data
      const userDoc = await db.collection('users').doc(auth.uid).get()

      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User not found')
      }

      const userData = userDoc.data()!

      // Check if user has a Stripe customer ID
      if (!userData.stripeCustomerId) {
        throw new HttpsError(
          'failed-precondition',
          'No Stripe customer found. Please create a customer first.'
        )
      }

      const stripe = getStripeClient()

      // Create billing portal session
      const session = await stripe.billingPortal.sessions.create({
        customer: userData.stripeCustomerId,
        return_url: `${returnUrl}/billing`
      })

      console.log(`Created billing portal session: ${session.id}`)

      return {
        success: true,
        url: session.url
      }
    } catch (error: any) {
      console.error('Error creating billing portal session:', error)
      throw new HttpsError('internal', `Failed to create billing portal session: ${error.message}`)
    }
  }
)

/**
 * Get or create Stripe customer for a user
 * This is a helper that ensures a customer exists before proceeding
 */
export const getOrCreateStripeCustomer = onCall(
  {
    region: 'europe-west2',
    secrets: ['STRIPE_SECRET_KEY']
  },
  async (request) => {
    const { auth } = request

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated')
    }

    try {
      const userDoc = await db.collection('users').doc(auth.uid).get()

      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User not found')
      }

      const userData = userDoc.data()!

      // If customer already exists, return it
      if (userData.stripeCustomerId) {
        return {
          success: true,
          customerId: userData.stripeCustomerId,
          exists: true
        }
      }

      // Create new customer
      const stripe = getStripeClient()
      const customer = await stripe.customers.create({
        email: userData.email,
        name: userData.displayName || undefined,
        metadata: {
          firebaseUserId: auth.uid,
          organizationId: userData.organizationId || '',
          tier: userData.tier || 'free_individual'
        }
      })

      // Update user document
      await db.collection('users').doc(auth.uid).update({
        stripeCustomerId: customer.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      return {
        success: true,
        customerId: customer.id,
        exists: false
      }
    } catch (error: any) {
      console.error('Error in getOrCreateStripeCustomer:', error)
      throw new HttpsError('internal', error.message)
    }
  }
)
