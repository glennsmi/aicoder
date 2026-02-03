# Security Best Practices

## Environment Variables

This project uses environment variables to store sensitive configuration like Firebase credentials.

### Setup

1. **Frontend Configuration**:
   ```bash
   cd frontend
   cp .env.example .env.local
   ```
   
2. Fill in `.env.local` with your Firebase credentials from:
   https://console.firebase.google.com/project/YOUR_PROJECT/settings/general

3. **Never commit** `.env.local` or any file containing real credentials to Git.
   The `.gitignore` file is configured to exclude these files.

### Vite Environment Variables

- Prefix all env vars with `VITE_` to expose them to the client-side code
- Access them using `import.meta.env.VITE_VARIABLE_NAME`
- Example: `import.meta.env.VITE_FIREBASE_API_KEY`

### Security Notes

⚠️ **Important**: Firebase API keys for web apps are not secret. They identify your Firebase project but don't grant access to your data. Access is controlled by:
- Firebase Security Rules (in `firestore.rules`)
- Firebase Authentication
- Authorized domains in Firebase Console

However, it's still best practice to:
1. Use environment variables
2. Keep production keys separate from development
3. Monitor usage in Firebase Console
4. Restrict API key usage by HTTP referrer or app bundle ID

### Production Deployment

For production (e.g., Firebase Hosting, Vercel, Netlify):
1. Set environment variables in your hosting platform's dashboard
2. Use different Firebase projects for dev/staging/production
3. Never hardcode credentials in source code

### If Credentials Are Compromised

If you accidentally commit credentials:
1. Rotate the credentials immediately in Firebase Console
2. Update `.env.local` with new credentials
3. Remove the sensitive commit from Git history:
   ```bash
   # WARNING: This rewrites history
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch frontend/src/config/firebase.ts" \
     --prune-empty --tag-name-filter cat -- --all
   ```
4. Force push (coordinate with team first!)
   ```bash
   git push origin --force --all
   ```

## Additional Security Measures

### Firestore Security Rules
- Review `firestore.rules` regularly
- Test rules using Firebase Console's Rules Playground
- Never use `allow read, write: if true` in production

### Authentication
- Enable only required sign-in methods
- Configure authorized domains in Firebase Console
- Implement proper session management

### API Endpoints
- Use Firebase Security Rules to validate requests
- Implement rate limiting
- Log and monitor suspicious activity
