# Testing Setup Guide

## 🔥 Firebase Console Setup Required

Before you can test the multi-tenant authentication system, you need to configure Firebase manually.

---

## Step 1: Update Firestore Security Rules

### Go to Firestore Rules
👉 https://console.firebase.google.com/project/aicoder-guru/firestore/rules

### Replace with Development Rules

**Copy and paste this into the Firebase Console:**

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Allow all authenticated users to read/write during development
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Click "Publish"

⚠️ **Note**: These are development-only rules! Before production, we'll use the secure rules in `firestore.rules.prod`.

---

## Step 2: Enable Email Link Authentication

### Go to Authentication Sign-in Methods
👉 https://console.firebase.google.com/project/aicoder-guru/authentication/providers

### Enable Email/Password Provider

1. Click on **"Email/Password"**
2. Enable **"Email/Password"** (should already be enabled)
3. Enable **"Email link (passwordless sign-in)"** ✅
4. Click **"Save"**

---

## Step 3: Add Authorized Domains

### Go to Authentication Settings
👉 https://console.firebase.google.com/project/aicoder-guru/authentication/settings

### Add These Domains to "Authorized domains":

- ✅ `localhost` (for local development)
- ✅ `aicoder.guru` (your production domain)
- ✅ `aicoder-guru.web.app` (Firebase Hosting default)
- ✅ `aicoder-guru.firebaseapp.com` (Firebase Hosting default)

---

## Step 4: Test the Application

### Start the Dev Server (if not already running)

```bash
cd frontend
npm run dev
```

### Open Your Browser

Go to: **http://localhost:3002** (or whatever port Vite shows)

---

## 🧪 Test Scenarios

### Test 1: Email/Password Sign-Up ✅

1. Click **"Sign Up"** or **"Sign In"** button
2. Switch to **"Create Account"** tab
3. Enter:
   - Name: `Test User`
   - Email: `test@example.com`
   - Password: `password123`
4. Click **"Create Account"**

**Expected Result:**
- ✅ User is created
- ✅ Personal organization is created automatically
- ✅ User is signed in
- ✅ Console shows success messages

**Check Console for:**
```
🚀 Starting signup process for: test@example.com
✅ Firebase Auth user created: [user-id]
🏢 Creating personal organization for: test@example.com
✅ Personal organization created: [org-id]
✅ User document created in Firestore
```

---

### Test 2: Google Sign-In ✅

1. Click **"Continue with Google"**
2. Select your Google account
3. Authorize the app

**Expected Result:**
- ✅ User is created (if new) or signed in (if existing)
- ✅ Personal organization created (if new user)
- ✅ User is signed in

---

### Test 3: Email Link Sign-In ✅

1. Click **"Sign in with email link instead"**
2. Enter your email: `your-email@example.com`
3. Click **"Send Sign-In Link"**
4. Check your email inbox
5. Click the link in the email
6. You'll be redirected to `/auth/complete`
7. Should auto-sign in

**Expected Result:**
- ✅ Email is sent
- ✅ Link redirects to app
- ✅ User is signed in automatically
- ✅ Personal organization created (if new user)

---

## 🔍 Verify Organization Creation

### Check Firestore Database

👉 https://console.firebase.google.com/project/aicoder-guru/firestore/data

You should see:

```
📁 organizations/
  └── [org-id]/
      ├── name: "user@example.com's Workspace"
      ├── tier: "free"
      ├── ownerId: [user-id]
      └── members/
          └── [user-id]/
              ├── role: "admin"
              ├── status: "active"

📁 users/
  └── [user-id]/
      ├── email: "user@example.com"
      ├── organizationId: [org-id]
      ├── currentRole: "admin"
      ├── tier: "free_individual"
```

---

## 🐛 Troubleshooting

### Issue: "Missing or insufficient permissions"

**Solution**: Make sure you updated the Firestore rules (Step 1)

### Issue: "Email link not working"

**Solutions**:
1. Check that email link sign-in is enabled (Step 2)
2. Check authorized domains (Step 3)
3. Check spam folder for the email
4. Try using incognito mode

### Issue: "CORS errors"

**Solution**: Make sure `localhost` is in authorized domains

### Issue: "Google Sign-In popup blocked"

**Solution**: Allow popups for localhost in your browser

---

## 📊 What Gets Created on Sign-Up

When a user signs up (any method), the system automatically:

1. **Creates Firebase Auth User**
   - Email/password or Google account
   - Unique user ID

2. **Creates Personal Organization**
   - Name: `{email}'s Workspace`
   - Tier: `free`
   - 1 seat (the user)
   - User is set as admin

3. **Creates Organization Member Document**
   - Links user to organization
   - Role: `admin`
   - Status: `active`

4. **Creates User Document**
   - Stores user profile
   - Links to organization
   - Stores preferences

---

## 🎯 Next Steps After Testing

Once basic authentication is working:

1. ✅ Test invitation flow (when backend functions are created)
2. ✅ Test team creation
3. ✅ Test role-based permissions
4. ✅ Deploy to production with secure rules

---

## 🔐 Security Notes

**Current State**: Development rules allow all authenticated users to read/write

**Production**: Will use `firestore.rules.prod` with proper role-based access control:
- Admins can manage their organization
- Team managers can view their team
- Members can only view their own data
- Proper data isolation between organizations

---

## 📝 Files Reference

- `firestore.rules` - Current rules (development)
- `firestore.rules.dev` - Development rules (relaxed)
- `firestore.rules.prod` - Production rules (secure)
- `EMAIL_LINK_AUTH_SETUP.md` - Email link authentication details

---

**Status**: Ready for testing! 🚀
**Last Updated**: October 14, 2025

