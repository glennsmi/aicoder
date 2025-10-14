# Email Link Authentication Setup Guide

## Overview

Your app now supports **passwordless email link authentication** alongside Google Sign-In and traditional email/password authentication. This provides a secure, user-friendly way for users to sign in without remembering passwords.

## Firebase Configuration Required

### 1. Enable Email Link Sign-In in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/project/aicoder-guru/authentication/providers)
2. Navigate to **Authentication** > **Sign-in method**
3. Click on **Email/Password** provider
4. Enable **Email link (passwordless sign-in)**
5. Click **Save**

### 2. Add Authorized Domains

Make sure these domains are authorized in Firebase:

1. Go to **Authentication** > **Settings** > **Authorized domains**
2. Add the following domains:
   - `localhost` (for development)
   - `aicoder.guru` (your production domain)
   - `aicoder-guru.web.app` (Firebase Hosting default)
   - `aicoder-guru.firebaseapp.com` (Firebase Hosting default)

### 3. Configure Email Templates (Optional but Recommended)

1. Go to **Authentication** > **Templates**
2. Select **Email link sign-in**
3. Customize the email template:
   - **Sender name**: AI Coder
   - **Subject**: Sign in to AI Coder
   - **Body**: Customize with your branding

**Default Template Variables:**
- `%LINK%` - The sign-in link
- `%APP_NAME%` - Your app name
- `%EMAIL%` - User's email address

## How It Works

### User Flow

1. **User clicks "Sign in with email link"** in the AuthModal
2. **User enters their email address**
3. **System sends email** with a secure sign-in link
4. **User clicks link** in their email
5. **System redirects** to `/auth/complete`
6. **System completes sign-in** automatically (or asks for email confirmation)
7. **User is signed in** and redirected to the app

### Technical Flow

```typescript
// 1. Send Email Link
await sendEmailLink(email)
// Stores email in localStorage
// Sends email via Firebase

// 2. User Clicks Link
// Redirects to: https://aicoder.guru/auth/complete?apiKey=...&oobCode=...

// 3. Complete Sign-In
await completeEmailLinkSignIn(email)
// Verifies link
// Creates user account (if new)
// Checks for org invitations
// Creates personal org or joins team org
```

## Code Implementation

### AuthContext Methods

```typescript
// Send email link
const { sendEmailLink } = useAuth()
await sendEmailLink('user@example.com')

// Check if current URL is an email link
const { isEmailLinkSignIn } = useAuth()
if (isEmailLinkSignIn()) {
  // Complete sign-in
}

// Complete email link sign-in
const { completeEmailLinkSignIn } = useAuth()
await completeEmailLinkSignIn('user@example.com')
```

### Routes

- `/auth/complete` - Email link completion page
- Handles both automatic and manual email confirmation

## Features

### ✅ Automatic Organization Handling

When a user signs in via email link:

1. **Checks for pending invitations** to their email
2. **If invitation found**:
   - Auto-joins the organization
   - Assigns role (admin/team_manager/member)
   - Sets appropriate tier
3. **If no invitation**:
   - Creates personal FREE_INDIVIDUAL organization
   - Sets user as admin

### ✅ Email Persistence

- Email is saved to `localStorage` when link is sent
- Automatically retrieved when user clicks link
- Falls back to manual entry if localStorage is unavailable

### ✅ Error Handling

- Invalid link detection
- Expired link handling
- Clear error messages
- Retry functionality

### ✅ UI/UX Features

- Toggle between password and email link modes
- Success message after sending link
- Loading states
- Mobile-friendly

## Security Considerations

### Link Expiration

- Email links expire after **1 hour** by default
- Configure in Firebase Console if needed

### Domain Verification

- Only authorized domains can complete sign-in
- Prevents phishing attacks

### One-Time Use

- Each link can only be used once
- Prevents replay attacks

## Testing

### Local Development

1. Start your dev server: `npm run dev`
2. Open AuthModal
3. Click "Sign in with email link instead"
4. Enter your email
5. Check your email for the sign-in link
6. Click the link (should redirect to `http://localhost:5173/auth/complete`)

### Production Testing

1. Deploy to Firebase Hosting
2. Test with real email addresses
3. Verify redirect to `https://aicoder.guru/auth/complete`

## Customization

### Change Redirect URL

Edit in `AuthContext.tsx`:

```typescript
const actionCodeSettings = {
  url: `${window.location.origin}/auth/complete`, // Change this
  handleCodeInApp: true,
}
```

### Customize Email Template

1. Go to Firebase Console > Authentication > Templates
2. Edit the "Email link sign-in" template
3. Add your branding, logo, custom text

### Adjust Link Expiration

Currently uses Firebase default (1 hour). To customize:

```typescript
const actionCodeSettings = {
  url: `${window.location.origin}/auth/complete`,
  handleCodeInApp: true,
  // Add these for iOS/Android deep linking
  iOS: {
    bundleId: 'com.aicoder.app'
  },
  android: {
    packageName: 'com.aicoder.app',
    installApp: true,
    minimumVersion: '12'
  },
  // Note: Expiration time is set in Firebase Console
}
```

## Troubleshooting

### Link Not Working

1. **Check authorized domains** in Firebase Console
2. **Verify email link is enabled** in Sign-in methods
3. **Check browser console** for errors
4. **Try incognito mode** to rule out localStorage issues

### Email Not Sending

1. **Verify email provider** is configured in Firebase
2. **Check spam folder**
3. **Verify sender email** in Firebase Console
4. **Check Firebase quotas** (free tier has limits)

### Redirect Issues

1. **Verify URL in actionCodeSettings** matches your domain
2. **Check that domain is authorized** in Firebase
3. **Ensure `/auth/complete` route exists** in your app

## Firebase Quotas

### Free Tier Limits

- **Email sends**: 100/day
- **Authentication**: Unlimited sign-ins
- **Storage**: 1GB

### Paid Tier (Blaze Plan)

- **Email sends**: Pay per send ($0.10/1000)
- **Authentication**: Unlimited
- **Storage**: Pay as you go

## Next Steps

1. ✅ Enable email link sign-in in Firebase Console
2. ✅ Add authorized domains
3. ✅ Customize email template (optional)
4. ✅ Test locally
5. ✅ Deploy to production
6. ✅ Test with real users

## Support

For issues or questions:
- Firebase Auth Docs: https://firebase.google.com/docs/auth/web/email-link-auth
- Firebase Support: https://firebase.google.com/support

---

**Status**: ✅ Implemented and ready to use
**Last Updated**: October 14, 2025

