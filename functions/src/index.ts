import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import * as functions from 'firebase-functions';
import * as functionsV1 from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import sgMail from '@sendgrid/mail';

// Set global options for all functions
setGlobalOptions({
  region: 'europe-west2',
  maxInstances: 10,
});

// Initialize Firebase Admin
admin.initializeApp();

// Initialize SendGrid
// Support both local development (.env) and production (Firebase config)
const sendGridApiKey = process.env.SENDGRID_API_KEY || functions.config().sendgrid?.api_key;
if (!sendGridApiKey) {
  console.error('SENDGRID_API_KEY environment variable is not set');
  console.log('For local development: Add SENDGRID_API_KEY to functions/.env');
  console.log('For production: Run "firebase functions:config:set sendgrid.api_key=YOUR_KEY"');
  console.log('Available config:', JSON.stringify(functions.config(), null, 2));
} else {
  sgMail.setApiKey(sendGridApiKey);
  console.log('SendGrid initialized successfully');
}

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

    console.log(`Testing welcome email to ${testEmail} for ${testName}`);

    // Check if SendGrid is configured
    if (!sendGridApiKey) {
      response.status(500).json({ error: 'SendGrid API key not configured' });
      return;
    }

    // Email content (same as the main function)
    const emailContent = {
      to: testEmail,
      from: {
        email: 'cursor_costs@fueld.ai', 
        name: 'Cursor Costs by Fueld AI'
      },
      subject: 'Welcome to Cursor Costs! (Test)',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">Welcome to Cursor Costs, ${testName}!</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            This is a test email. Thank you for signing up. We're excited to help you track your Cursor usage and costs.
          </p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Get started by uploading your usage data and exploring your analytics dashboard.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://cursorcosts.fueld.ai" 
               style="background-color: #97D700; color: #0A2E36; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Get Started
            </a>
          </div>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            If you have any questions, feel free to reach out to our support team.
          </p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Best regards,<br>
            <strong>The Cursor Costs Team</strong>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            This is a test email from the Cursor Costs welcome email function.
            <br><br>
            To unsubscribe, please log in and update your email preferences.
          </p>
        </div>
      `,
      text: `
Welcome to Cursor Costs, ${testName}!

This is a test email. Thank you for signing up. We're excited to help you track your Cursor usage and costs.

Get started by uploading your usage data and exploring your analytics dashboard.

Visit: https://cursorcosts.fueld.ai

If you have any questions, feel free to reach out to our support team.

Best regards,
The Cursor Costs Team

---
This is a test email from the Cursor Costs welcome email function.

To unsubscribe, please log in and update your email preferences.
      `.trim()
    };

    try {
      await sgMail.send(emailContent);
      console.log(`Test welcome email sent successfully to ${testEmail}`);
      response.json({ 
        success: true, 
        message: `Test welcome email sent to ${testEmail}`,
        emailContent: emailContent
      });
    } catch (sendGridError: any) {
      console.error('SendGrid error:', sendGridError);
      
      // Log more details about the error
      if (sendGridError.response) {
        console.error('SendGrid response body:', sendGridError.response.body);
        console.error('SendGrid response status:', sendGridError.response.status);
      }
      
      response.status(500).json({ 
        error: 'Failed to send test email', 
        details: sendGridError.message,
        sendGridError: sendGridError.response?.body
      });
    }
    
  } catch (error) {
    console.error('Error in testWelcomeEmail function:', error);
    response.status(500).json({ error: 'Internal server error', details: error });
  }
});

// Import new Cloud Functions
export { createTeam } from './teams/createTeam'
export { addTeamMember } from './teams/addTeamMember'
export { testApiConnection, addApiConnection, syncApiConnection, scheduledApiSync } from './api/apiConnections'

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

    // Check if SendGrid is configured
    if (!sendGridApiKey) {
      console.error('SendGrid API key not configured. Email not sent.');
      return;
    }

    // Email content
    const emailContent = {
      to: email,
      from: {
        email: 'cursor_costs@fueld.ai',
        name: 'Cursor Costs by Fueld AI'
      },
      subject: 'Welcome to Cursor Costs!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">Welcome to Cursor Costs!</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5; margin-top: 20px;">
            Thank you for signing up. We're excited to help you track your Cursor usage and costs.
          </p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Get started by uploading your usage data and exploring your analytics dashboard.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://cursorcosts.fueld.ai" 
               style="background-color: #97D700; color: #0A2E36; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Get Started
            </a>
          </div>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            If you have any questions, feel free to reach out to our support team.
          </p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Best regards,<br>
            <strong>The Cursor Costs Team</strong>
          </p>
                      <a href="https://go.fueld.ai/4kkKxYj" style="display: block; text-align: center; margin: 20px 0;">
              <img src="https://cursorcosts.web.app/logos/fueld-logo.png" alt="Fueld AI Logo" style="width: 150px; margin: 0 auto; display: block;">
            </a>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            This email was sent because you created an account on Cursor Costs.
            <br><br>
            To unsubscribe, please log in and update your email preferences.
          </p>
        </div>
      `,
      text: `
Welcome to Cursor Costs!

Thank you for signing up. We're excited to help you track your Cursor usage and costs.

Get started by uploading your usage data and exploring your analytics dashboard.

Visit: https://cursorcosts.fueld.ai

If you have any questions, feel free to reach out to us on cursor_costs@fueld.ai.

Best regards,
The Cursor Costs powered by Fueld AI

PS: If you want to try out some super cool usage of AI in Nutrition tracking and recipe generation, check out Fueld AI at https://fueld.ai.


---
This email was sent because you created an account on Cursor Costs. 

      `.trim()
    };

    try {
      await sgMail.send(emailContent);
      console.log(`Welcome email sent successfully to ${email}`);
      
      // Send notification to admin about new user
      const adminNotification = {
        to: 'glenn@fireforge.ai',
        from: {
          email: 'cursor_costs@fueld.ai',
          name: 'Cursor Costs Notifications'
        },
        subject: 'New Cursor Costs User Signup',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #114C5A;">New User Signup</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              A new user has signed up for Cursor Costs:
            </p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>User ID:</strong> ${uid}</p>
              <p style="margin: 5px 0;"><strong>Signup Time:</strong> ${new Date().toISOString()}</p>
            </div>
            <p style="color: #666; font-size: 14px;">
              This is an automated notification from Cursor Costs.
            </p>
          </div>
        `,
        text: `
New Cursor Costs User Signup

Email: ${email}
User ID: ${uid}
Signup Time: ${new Date().toISOString()}

This is an automated notification from Cursor Costs.
        `.trim()
      };
      
      try {
        await sgMail.send(adminNotification);
        console.log(`Admin notification sent successfully for new user: ${email}`);
      } catch (notificationError: any) {
        console.error('Error sending admin notification:', notificationError);
        // Don't throw - this shouldn't block user creation
      }
      
    } catch (sendGridError: any) {
      console.error('SendGrid error:', sendGridError);
      
      // Log more details about the error
      if (sendGridError.response) {
        console.error('SendGrid response body:', sendGridError.response.body);
        console.error('SendGrid response status:', sendGridError.response.status);
      }
      
      // Don't throw the error to avoid blocking user creation
    }
    
  } catch (error) {
    console.error('Error in sendWelcomeEmail function:', error);
    // Don't throw the error to avoid blocking user creation
  }
}); 