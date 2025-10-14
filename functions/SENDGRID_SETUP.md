# SendGrid Setup Guide

This guide will help you configure SendGrid for sending welcome emails in your Firebase Functions.

## Prerequisites

1. A SendGrid account (free tier available)
2. A verified sender email address
3. Firebase CLI installed and authenticated

## Step 1: Get Your SendGrid API Key

1. **Sign up for SendGrid** (if you haven't already):
   - Go to [SendGrid.com](https://sendgrid.com)
   - Create a free account

2. **Create an API Key**:
   - Log into your SendGrid dashboard
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Choose "Restricted Access" and give it a name like "Cursor Costs Functions"
   - Under "Mail Send", select "Full Access"
   - Click "Create & View"
   - **Copy the API key** (you won't be able to see it again!)

## Step 2: Verify Your Sender Email

1. **Single Sender Verification** (easiest for getting started):
   - Go to Settings → Sender Authentication
   - Click "Verify a Single Sender"
   - Enter your email address (e.g., `noreply@yourdomain.com`)
   - Fill out the form and click "Create"
   - Check your email and click the verification link

2. **Domain Authentication** (recommended for production):
   - Go to Settings → Sender Authentication
   - Click "Authenticate Your Domain"
   - Follow the DNS setup instructions

## Step 3: Configure Firebase Functions

### For Local Development (Emulators)

1. **Set the environment variable locally**:
   ```bash
   cd functions
   echo "SENDGRID_API_KEY=your_sendgrid_api_key_here" > .env
   ```

2. **Update your .gitignore** to exclude the .env file:
   ```bash
   echo ".env" >> .gitignore
   ```

### For Production Deployment

1. **Set the environment variable in Firebase**:
   ```bash
   firebase functions:config:set sendgrid.api_key="your_sendgrid_api_key_here"
   ```

2. **Update the function code** to use the config (if needed):
   ```typescript
   // The current code already handles both process.env and functions.config()
   const sendGridApiKey = process.env.SENDGRID_API_KEY || functions.config().sendgrid?.api_key;
   ```

## Step 4: Update Sender Email

1. **Edit the function code** in `functions/src/index.ts`:
   ```typescript
   from: {
     email: 'your-verified-email@yourdomain.com', // Replace with your verified sender
     name: 'Your App Name'
   },
   ```

## Step 5: Test the Function

### Local Testing

1. **Start the emulators**:
   ```bash
   cd .. # Go back to project root
   npm run firebase:emulators
   ```

2. **Create a test user document** in the Firestore emulator to trigger the function

### Production Testing

1. **Deploy the function**:
   ```bash
   firebase deploy --only functions
   ```

2. **Create a user** in your app to trigger the welcome email

## Troubleshooting

### Common Issues

1. **"Unauthorized" Error**:
   - Check that your API key is correct
   - Ensure the API key has "Mail Send" permissions

2. **"The from address does not match a verified Sender Identity"**:
   - Verify your sender email in SendGrid
   - Make sure the email in the code matches exactly

3. **Function not triggering**:
   - Check that the Firestore path matches: `users/{userId}`
   - Verify the document has an `email` field

### Checking Logs

```bash
# View function logs
firebase functions:log

# View specific function logs
firebase functions:log --only sendWelcomeEmail
```

## SendGrid Dashboard

Monitor your email sending in the SendGrid dashboard:
- **Activity** → See sent emails and delivery status
- **Statistics** → View email metrics
- **Suppressions** → Manage bounces and unsubscribes

## Rate Limits

SendGrid free tier includes:
- 100 emails/day
- 40,000 emails for first 30 days

For higher volumes, consider upgrading to a paid plan. 