/**
 * Stripe Webhook Handler
 * Main Cloud Function that receives and processes Stripe webhook events
 * Documentation: https://stripe.com/docs/webhooks
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getStripeClient } from '../utils/stripe'
import * as admin from 'firebase-admin'
import {
  handleCheckoutSessionCompleted,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleSubscriptionTrialWillEnd,
  handleInvoicePaymentSucceeded,
  handleInvoicePaymentFailed
} from './stripeWebhookHandlers'

const db = admin.firestore()
const FieldValue = admin.firestore.FieldValue

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

export const stripeWebhook = onRequest(
  {
    region: 'europe-west2',
    cors: false,
    invoker: 'public',
    memory: '256MiB',
    timeoutSeconds: 60,
    // These are injected from Google Secret Manager (per-function in Functions v2)
    secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'MAILER_SEND_KEY', 'MAIL_FROM_EMAIL']
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed')
      return
    }

    const sig = req.headers['stripe-signature']
    if (!sig) {
      console.error('Missing stripe-signature header')
      res.status(400).send('Missing stripe-signature header')
      return
    }

    if (!WEBHOOK_SECRET) {
      console.error('STRIPE_WEBHOOK_SECRET not configured')
      res.status(500).send('Webhook secret not configured')
      return
    }

    let event: any

    try {
      // Verify webhook signature
      const stripe = getStripeClient()
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        WEBHOOK_SECRET
      )
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      res.status(400).send(`Webhook Error: ${err.message}`)
      return
    }

    console.log(`Received webhook event: ${event.type} (${event.id})`)

    // Check for duplicate events (idempotency)
    const eventDoc = await db
      .collection('stripe_events')
      .doc(event.id)
      .get()

    if (eventDoc.exists && eventDoc.data()?.processed) {
      console.log(`Event ${event.id} already processed, skipping`)
      res.status(200).send({ received: true, message: 'Event already processed' })
      return
    }

    try {
      // Store event (mark as not processed yet)
      await db.collection('stripe_events').doc(event.id).set({
        id: event.id,
        type: event.type,
        processed: false,
        receivedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp()
      })

      // Handle event by type
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object)
          break

        case 'customer.subscription.created':
          await handleSubscriptionCreated(event.data.object)
          break

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object)
          break

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object)
          break

        case 'customer.subscription.trial_will_end':
          await handleSubscriptionTrialWillEnd(event.data.object)
          break

        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSucceeded(event.data.object)
          break

        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event.data.object)
          break

        case 'invoice.created':
        case 'invoice.finalized':
        case 'invoice.paid':
          // These are handled by invoice.payment_succeeded
          console.log(`Event ${event.type} received but not processed separately`)
          break

        default:
          console.log(`Unhandled event type: ${event.type}`)
      }

      // Mark event as processed
      await db.collection('stripe_events').doc(event.id).update({
        processed: true,
        processedAt: FieldValue.serverTimestamp()
      })

      res.status(200).send({ received: true })
    } catch (error: any) {
      console.error('Error processing webhook:', error)
      console.error('Error stack:', error.stack)
      
      // Log error but don't fail the webhook
      await db.collection('stripe_events').doc(event.id).update({
        processed: false,
        error: error.message,
        errorStack: error.stack,
        errorAt: FieldValue.serverTimestamp()
      })

      // Return 500 so Stripe will retry
      res.status(500).send({ 
        error: 'Webhook processing error', 
        message: error.message 
      })
    }
  }
)

