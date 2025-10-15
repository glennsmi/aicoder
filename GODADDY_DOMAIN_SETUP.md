# GoDaddy Domain Setup for AI Coder

## Overview

You'll be setting up two domains:
- **aicoder.guru** → Marketing website
- **app.aicoder.guru** → SaaS application

## Step-by-Step Instructions

### Part 1: Add Custom Domain in Firebase Console

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/project/aicoder-guru/hosting/sites
   
2. **Setup Marketing Website Domain (aicoder.guru)**
   - Click on the `aicoder-guru` site
   - Click "Add custom domain"
   - Enter: `aicoder.guru`
   - Click "Continue"
   - Firebase will show you DNS records to add
   - **IMPORTANT**: Keep this page open - you'll need these values!

3. **Setup App Domain (app.aicoder.guru)**
   - Click on the `app-aicoder-guru` site
   - Click "Add custom domain"
   - Enter: `app.aicoder.guru`
   - Click "Continue"
   - Firebase will show you DNS records to add
   - **IMPORTANT**: Keep this page open too!

### Part 2: Configure DNS in GoDaddy

1. **Login to GoDaddy**
   - Go to: https://dcc.godaddy.com/control/portfolio/
   - Find your `aicoder.guru` domain
   - Click "DNS" or "Manage DNS"

2. **Add DNS Records for Main Domain (aicoder.guru)**

   Firebase will typically ask for these records:
   
   **Record 1: A Record (for root domain)**
   - Type: `A`
   - Name: `@` (this means root domain)
   - Value: Firebase IP addresses (they'll provide these)
   - TTL: `600` (or default)
   
   Firebase usually provides multiple A records like:
   ```
   151.101.1.195
   151.101.65.195
   ```
   Add all of them as separate A records.

   **Record 2: TXT Record (for verification)**
   - Type: `TXT`
   - Name: `@`
   - Value: (Firebase will provide a long string like `google-site-verification=...`)
   - TTL: `600` (or default)

3. **Add DNS Records for App Subdomain (app.aicoder.guru)**

   **CNAME Record:**
   - Type: `CNAME`
   - Name: `app`
   - Value: (Firebase will provide, typically something like `app-aicoder-guru.web.app` or a Firebase hosting URL)
   - TTL: `600` (or default)

   **TXT Record (if required):**
   - Type: `TXT`
   - Name: `app`
   - Value: (Firebase verification string if provided)
   - TTL: `600` (or default)

### Part 3: GoDaddy DNS Management Tips

**Adding Records in GoDaddy:**

1. Click "Add" or "Add Record"
2. Select record type (A, CNAME, or TXT)
3. Fill in Name and Value
4. Click "Save"

**Common GoDaddy DNS Fields:**
- **Type**: Select A, CNAME, or TXT
- **Host** or **Name**: What goes before your domain
  - `@` = root domain (aicoder.guru)
  - `app` = subdomain (app.aicoder.guru)
  - `www` = www subdomain
- **Points to** or **Value**: The destination
- **TTL**: How long to cache (use 600 or 1 Hour)

**Remove Conflicting Records:**
- If you have existing A records for `@`, you may need to delete them
- If you have a CNAME for `@`, delete it (root domains can't use CNAME)
- If you have parking page records, remove them

### Part 4: Verify in Firebase

1. After adding all DNS records in GoDaddy, go back to Firebase Console
2. Click "Verify" on each domain setup page
3. Firebase will check the DNS records

**Note:** DNS propagation can take:
- **Minimum**: 10-15 minutes
- **Typical**: 1-2 hours
- **Maximum**: 48 hours

### Part 5: SSL Certificate (Automatic)

Once verified:
- Firebase automatically provisions SSL certificates
- This can take 10-30 minutes
- You'll see "Pending" status during this time
- When complete, you'll see "Connected" with a green checkmark
- Your sites will be accessible via HTTPS

## Expected Final DNS Configuration

After everything is set up, your GoDaddy DNS should look like:

| Type  | Name | Value                          | TTL  |
|-------|------|--------------------------------|------|
| A     | @    | 151.101.1.195                 | 600  |
| A     | @    | 151.101.65.195                | 600  |
| TXT   | @    | google-site-verification=...  | 600  |
| CNAME | app  | app-aicoder-guru.web.app      | 600  |

*(Exact values will come from Firebase)*

## Testing

Once DNS has propagated and SSL is provisioned:

**Test Marketing Website:**
```bash
# Should show Firebase hosting
curl -I https://aicoder.guru

# Should redirect to HTTPS
curl -I http://aicoder.guru
```

**Test App:**
```bash
# Should show Firebase hosting
curl -I https://app.aicoder.guru
```

**Browser Test:**
- Visit https://aicoder.guru - should show marketing site
- Visit https://app.aicoder.guru - should show app login
- Check that dark mode works
- Verify SSL certificate is valid (green padlock)

## Troubleshooting

### Domain Not Connecting

1. **Check DNS Propagation:**
   - Use: https://dnschecker.org
   - Enter: aicoder.guru
   - Check if A records are propagating globally

2. **Verify DNS Records:**
   - In GoDaddy, double-check all records match Firebase exactly
   - No extra spaces in values
   - Correct record types

3. **Common Issues:**
   - **Parking page showing**: Remove GoDaddy parking records
   - **DNS not updating**: Check TTL isn't too high, wait for propagation
   - **Certificate pending**: Wait 30 minutes, then check Firebase Console
   - **403 Error**: Check that the site is deployed in Firebase

### GoDaddy-Specific Issues

- **CNAME at root not allowed**: Use A records for root domain instead
- **DNS updates not saving**: Try different browser or clear cache
- **"Forwarding" tab**: Don't use forwarding - use DNS records only

## Advanced: WWW Subdomain (Optional)

If you want www.aicoder.guru to work:

**Option 1: CNAME to root (recommended)**
- Type: `CNAME`
- Name: `www`
- Value: `aicoder.guru`
- TTL: `600`

**Option 2: Add as separate domain in Firebase**
- Add `www.aicoder.guru` as another custom domain
- Firebase will redirect www → non-www automatically

## Updating After Domain Setup

Once domains are connected, update environment variables:

**website/.env.production:**
```env
VITE_APP_URL=https://app.aicoder.guru
```

Then rebuild and redeploy:
```bash
cd website
npm run build
cd ..
firebase deploy --only hosting:aicoder-guru
```

## Support Resources

- **Firebase Hosting Docs**: https://firebase.google.com/docs/hosting/custom-domain
- **GoDaddy DNS Help**: https://www.godaddy.com/help/manage-dns-680
- **DNS Checker**: https://dnschecker.org
- **SSL Checker**: https://www.ssllabs.com/ssltest/

## Current Deployment Status

✅ **Website deployed to**: https://aicoder-guru.web.app
⏳ **Custom domain setup**: Follow steps above

After setup:
✅ **Website will be at**: https://aicoder.guru
✅ **App will be at**: https://app.aicoder.guru

