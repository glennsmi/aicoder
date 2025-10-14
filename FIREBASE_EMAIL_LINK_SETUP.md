# Firebase Email Link Authentication Setup

## Problem
Getting errors:
- `auth/operation-not-allowed` - Email link authentication not enabled
- `auth/missing-email` - Configuration issue

## Solution

### Step 1: Enable Email Link Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your **aicoder-guru** project
3. Navigate to **Authentication** → **Sign-in method** tab
4. Find the **Email/Password** provider in the list
5. Click on it to open the configuration
6. You should see TWO toggles:
   - ✅ **Enable** (Email/Password sign-in)
   - ✅ **Enable** (Email link - passwordless sign-in) ← **THIS MUST BE ENABLED**
7. Make sure BOTH are enabled (turned on)
8. Click **Save**

### Step 2: Add Authorized Domains

1. Still in **Authentication** section
2. Click on the **Settings** tab (top of the page)
3. Scroll down to **Authorized domains** section
4. You should see `localhost` already there
5. If not, click **Add domain** and add:
   - `localhost` (for local development)
   - `aicoder-guru.firebaseapp.com` (automatically added)
   - `aicoder-guru.web.app` (automatically added)
6. When deploying to production, add:
   - `aicoder.guru`
   - `www.aicoder.guru`

### Step 3: Email Templates (Optional but Recommended)

1. In **Authentication** → **Templates** tab
2. Click on **Email link** template
3. Customize the email template:
   - Update the sender name
   - Customize the message
   - Add your branding

### Step 4: Test the Email Link Flow

1. Start your dev server: `npm run dev`
2. Open the app in your browser
3. Click "Sign in with email link instead"
4. Enter your email address
5. Click "Send Sign-In Link"
6. Check your email inbox (and spam folder!)
7. Click the link in the email
8. You should be automatically signed in

### Common Issues

#### Email Not Arriving
- Check your spam/junk folder
- Verify the email address is correct
- Check Firebase Console → Authentication → Users to see if the email was queued
- Check Firebase Console → Authentication → Templates to ensure email sending is configured

#### Invalid Link Error
- The link expires after 1 hour
- The link can only be used once
- Make sure you're opening the link in the same browser where you requested it

#### Operation Not Allowed
- This means Email Link auth is not enabled in Firebase Console
- Follow Step 1 above to enable it

#### Missing Email Error
- This usually means the email wasn't passed correctly
- Check browser console for any JavaScript errors
- Verify the `sendEmailLink` function is being called with a valid email

### Development vs Production

For **development** (localhost):
- The redirect URL is: `http://localhost:3000/auth/complete`
- Make sure `localhost` is in authorized domains

For **production** (aicoder.guru):
- The redirect URL will be: `https://aicoder.guru/auth/complete`
- Make sure `aicoder.guru` is in authorized domains
- Update the domain in Firebase Console before going live

### Action Code Settings in Code

The current configuration in `AuthContext.tsx`:

```typescript
const actionCodeSettings = {
  url: `${window.location.origin}/auth/complete`,
  handleCodeInApp: true,
}
```

This automatically adapts to:
- Development: `http://localhost:3000/auth/complete`
- Production: `https://aicoder.guru/auth/complete`

No code changes needed when deploying!

## Verification Checklist

- [ ] Email/Password provider is enabled in Firebase Console
- [ ] Email link (passwordless sign-in) toggle is ON
- [ ] `localhost` is in Authorized domains
- [ ] Tested sending an email link
- [ ] Received the email (checked spam folder)
- [ ] Successfully signed in using the email link
- [ ] User document created in Firestore

## Next Steps

Once email link authentication is working:
1. Test the complete sign-in flow
2. Verify user documents are created in Firestore
3. Test the invitation flow (sending/accepting org invitations)
4. Deploy to production and add production domains

