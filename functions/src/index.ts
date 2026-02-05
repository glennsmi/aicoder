import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import * as functionsV1 from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { sendWelcomeEmail, sendAdminNotification } from './utils/email';

// Set global options for all functions
setGlobalOptions({
  region: 'europe-west2',
  maxInstances: 10,
});

// Initialize Firebase Admin
admin.initializeApp();

// Debug function to check recent user documents
export const debugUserCreation = onRequest(async (request, response) => {
  try {
    const db = admin.firestore();
    const usersRef = db.collection('users');

    // Get the 10 most recent user documents
    const snapshot = await usersRef.orderBy('createdAt', 'desc').limit(10).get();

    const recentUsers = snapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || 'No timestamp'
    }));

    response.json({
      success: true,
      message: 'Recent user documents',
      count: recentUsers.length,
      users: recentUsers
    });

  } catch (error) {
    console.error('Error in debugUserCreation:', error);
    response.status(500).json({ error: 'Failed to fetch user documents', details: error });
  }
});



// Test function to manually test email sending
export const testWelcomeEmail = onRequest(async (request, response) => {
  try {
    const testEmail = request.query.email as string || 'test@example.com';
    const testName = request.query.name as string || 'Test User';
    const tier = request.query.tier as string || 'novice';

    console.log(`Testing welcome email to ${testEmail} for ${testName} (${tier} tier)`);

    // Check if MailerSend is configured
    if (!process.env.MAILER_SEND_KEY) {
      response.status(500).json({ error: 'MailerSend API key not configured' });
      return;
    }

    try {
      const success = await sendWelcomeEmail(testEmail, testName, tier);

      if (success) {
        console.log(`Test welcome email sent successfully to ${testEmail}`);
        response.json({
          success: true,
          message: `Test welcome email sent to ${testEmail}`,
          tier
        });
      } else {
        response.status(500).json({
          success: false,
          error: 'Failed to send test email'
        });
      }
    } catch (emailError: any) {
      console.error('Email error:', emailError);
      response.status(500).json({
        error: 'Failed to send test email',
        details: emailError.message
      });
    }

  } catch (error: any) {
    console.error('Error in testWelcomeEmail function:', error);
    response.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Import new Cloud Functions
export { createTeam } from './teams/createTeam'
export { addTeamMember } from './teams/addTeamMember'
export { removeTeamMember } from './teams/260205_1650_removeTeamMember'
export { createInvitation, resendInvitation, revokeInvitation, acceptInvitationByToken } from './invitations/invitations'
export { testApiConnection, addApiConnection, syncApiConnection, scheduledApiSync } from './api/apiConnections'
export { ingestUsageEventsFromCursorCsv } from './usage/ingestUsageEventsFromCursorCsv'
export { ingestUsageEventsFromCcusageDailyJson } from './usage/ingestUsageEventsFromCcusageDailyJson'
export { materializeOrgUsageEvents } from './usage/materializeOrgUsageEvents'
export { refreshPricingCatalog } from './pricing/refreshPricingCatalog'

// Export Stripe webhook
export { stripeWebhook } from './webhooks/stripeWebhook'

// Export Stripe customer management
export { createStripeCustomer, createBillingPortalSession, getOrCreateStripeCustomer } from './stripe/stripeCustomer'

// Function to send welcome email when a new user is created in Firebase Auth
export const sendWelcomeEmailOnAuth = functionsV1.region('europe-west2').auth.user().onCreate(async (user) => {
  try {
    console.log('🎉 sendWelcomeEmail function triggered by Auth user creation!');
    console.log('📅 Timestamp:', new Date().toISOString());

    const { email, uid } = user;

    console.log('User email:', email);
    console.log('User ID:', uid);

    if (!email) {
      console.error('No email found for user:', uid);
      return;
    }

    console.log(`Sending welcome email to ${email} for user ${uid}`);

    // Check if MailerSend is configured
    if (!process.env.MAILER_SEND_KEY) {
      console.error('MailerSend API key not configured. Email not sent.');
      return;
    }

    try {
      // Send welcome email
      const emailSent = await sendWelcomeEmail(email, user.displayName || undefined);

      if (emailSent) {
        console.log(`Welcome email sent successfully to ${email}`);

        // Send admin notification
        await sendAdminNotification(
          'New User Signup',
          `A new user has signed up for AICoder.Guru`,
          {
            email,
            userId: uid,
            signupTime: new Date().toISOString()
          }
        );
      } else {
        console.error('Failed to send welcome email');
      }
    } catch (emailError: any) {
      console.error('Error sending emails:', emailError);
      // Don't throw the error to avoid blocking user creation
    }

  } catch (error) {
    console.error('Error in sendWelcomeEmail function:', error);
    // Don't throw the error to avoid blocking user creation
  }
}); 