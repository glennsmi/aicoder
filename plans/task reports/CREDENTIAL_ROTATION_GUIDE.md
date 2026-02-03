# Firebase Credential Rotation Guide

## ⚠️ URGENT: Credentials Were Exposed in Git History

The Firebase API key and configuration were committed to the repository in previous commits. While Firebase API keys for web apps are not secret and are meant to be included in client-side code, it's best practice to rotate them after exposure.

## Steps to Rotate Firebase Credentials

### 1. Create a New Web App in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/project/aicoder-guru/settings/general)
2. Scroll to "Your apps" section
3. Click "Add app" → Web (</>) icon
4. Name it "aicoder.guru-web-v2" (or similar)
5. Click "Register app"
6. **Copy the new credentials** to `frontend/.env.local`
7. Click "Continue to console"

### 2. Update Environment Variables

Update `frontend/.env.local` with the new credentials:
```bash
VITE_FIREBASE_API_KEY=<new_api_key>
VITE_FIREBASE_AUTH_DOMAIN=aicoder-guru.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=aicoder-guru
VITE_FIREBASE_STORAGE_BUCKET=aicoder-guru.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=<new_sender_id>
VITE_FIREBASE_APP_ID=<new_app_id>
VITE_FIREBASE_MEASUREMENT_ID=<new_measurement_id>
```

### 3. Test the New Configuration

```bash
cd frontend
npm run dev
```

Test:
- Sign in with Google
- Sign in with Email Link
- Create an organization
- Upload CSV data

### 4. Delete the Old Web App (Optional)

Once you've confirmed the new credentials work:
1. Go to Firebase Console → Project Settings
2. Find the old web app in "Your apps"
3. Click the three dots (⋮) → Delete app
4. Confirm deletion

### 5. Update Production Environment Variables

If deployed to production:
- **Firebase Hosting**: Update via `firebase use` and redeploy
- **Vercel**: Update environment variables in project settings
- **Netlify**: Update in site settings → Build & deploy → Environment

### 6. Clean Git History (Optional but Recommended)

⚠️ **WARNING**: This rewrites Git history and can disrupt collaborators!

```bash
# Backup your work first!
git clone your-repo your-repo-backup

# Remove the sensitive file from all commits
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch frontend/src/config/firebase.ts" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (coordinate with team!)
git push origin --force --all
git push origin --force --tags
```

Better alternative - Use [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/):
```bash
# Install BFG
brew install bfg  # on macOS

# Clone a fresh copy
git clone --mirror git@github.com:glennsmi/aicoder.git

# Remove the file from history
bfg --delete-files firebase.ts aicoder.git

# Clean up and push
cd aicoder.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

### 7. Monitor for Suspicious Activity

After rotation:
1. Check Firebase Console → Authentication → Users for unexpected accounts
2. Review Firestore Database for unusual data
3. Check Firebase Console → Usage for unexpected spikes
4. Set up billing alerts if not already configured

## Prevention for Future

- ✅ Use environment variables (now implemented)
- ✅ Add `.env.local` to `.gitignore` (already done)
- ✅ Use pre-commit hooks to scan for secrets
- ✅ Enable GitHub secret scanning (if not already enabled)
- ✅ Review PRs carefully before merging

## Questions?

If you need help or have questions about this process, please:
1. Check the [SECURITY.md](./SECURITY.md) file
2. Review [Firebase Security Best Practices](https://firebase.google.com/docs/projects/api-keys)
3. Contact the team lead

## Current Status

- [x] Credentials moved to environment variables
- [ ] New Firebase web app created
- [ ] New credentials tested
- [ ] Old web app deleted
- [ ] Git history cleaned (optional)
- [ ] Production environment updated
