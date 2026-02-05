# API Connections Testing Guide

**Date:** October 16, 2025  
**Status:** 🧪 Ready for Testing  
**App URL:** https://app-aicoder-guru.web.app (or http://localhost:5173 for local)

---

## 🎯 Quick Start

### 1. Access the App
- **Production:** https://app-aicoder-guru.web.app
- **Local Dev:** http://localhost:5173 (just started for you!)

### 2. Sign In
- Click "Sign In with Google" or use email authentication
- You'll need to be an **admin** of an organization to add API connections

### 3. Navigate to API Connections
- Once signed in, look in the left sidebar for **"API Connections"** or **"Integrations"**
- Click to open the API Connections page

---

## 🧪 Testing Each Provider

### GitHub Copilot ✅

#### What You Need:
- GitHub Personal Access Token (PAT) with `copilot` scope
- Organization or Enterprise name

#### Steps:
1. **Get Your PAT:**
   - Go to https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Select scopes: `admin:org` and `copilot`
   - Generate and copy token

2. **In AICoder.Guru UI:**
   - Click "Connect" on GitHub Copilot card
   - Enter a display name: e.g., "My GitHub Org"
   - Enter your PAT (starts with `ghp_...`)
   - Enter your organization name (e.g., `my-company`)
   - Click "Test Connection"
   - ✅ Should see: "Successfully connected to GitHub Copilot API"
   - Click "Add Connection"

3. **Sync Data:**
   - Once added, click "Sync Now"
   - Wait for sync to complete
   - Check your dashboard for usage data!

---

### OpenAI ✅

#### What You Need:
- OpenAI API Key
- (Optional) Organization ID

#### Steps:
1. **Get Your API Key:**
   - Go to https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Name it (e.g., "AICoder Guru")
   - Copy the key (starts with `sk-...`)

2. **In AICoder.Guru UI:**
   - Click "Connect" on OpenAI card
   - Enter display name: e.g., "Production OpenAI"
   - Enter your API key
   - (Optional) Enter Organization ID if you have one
   - Click "Test Connection"
   - ✅ Should see: "Successfully connected to OpenAI API" + model count
   - Click "Add Connection"

3. **Sync Data:**
   - Click "Sync Now"
   - Will fetch last 7 days of usage
   - View in dashboard!

---

### Anthropic Claude Usage API ✅ (TOP PRIORITY)

#### What You Need:
- Anthropic API Key (organization-level access)

#### Steps:
1. **Get Your API Key:**
   - Go to https://console.anthropic.com/
   - Navigate to API Keys
   - Create a new key with organization-level access
   - Copy the key (starts with `sk-ant-...`)

2. **In AICoder.Guru UI:**
   - Click "Connect" on "Anthropic Claude (Usage)" card
   - Enter display name: e.g., "Org Claude Usage"
   - Enter your API key
   - Click "Test Connection"
   - ✅ Should see: "Successfully connected to Anthropic Usage API"
   - Click "Add Connection"

3. **Sync Data:**
   - Click "Sync Now"
   - Gets organization-wide token usage
   - View aggregated usage in dashboard!

**What You'll See:**
- Total input/output/cached tokens
- Cost breakdown by model (Opus 4.1, Sonnet 4.5, Haiku 4.5, etc.)
- Requests per model

---

### Anthropic Claude Code Analytics ✅ (MOST IMPORTANT)

#### What You Need:
- Same Anthropic API Key as above

#### Steps:
1. **In AICoder.Guru UI:**
   - Click "Connect" on "Anthropic Claude Code Analytics" card
   - Enter display name: e.g., "Developer Metrics"
   - Enter your API key (same as Usage API)
   - Click "Test Connection"
   - ✅ Should see: "Successfully connected to Anthropic Code Analytics API"
   - Click "Add Connection"

2. **Sync Data:**
   - Click "Sync Now"
   - Gets **per-user** developer metrics
   - This is the GOLD for developer analytics!

**What You'll See:**
- Token usage **per developer**
- Code suggestions & acceptance rates
- Lines of code generated
- Files modified
- Language and editor breakdown
- Individual developer productivity metrics

---

## 🎨 UI Walkthrough

### Main API Connections Page

```
┌─────────────────────────────────────────────────────────────┐
│ API Connections                                              │
│ Connect your AI coding tools to automatically sync usage    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Active Connections (if any)                                 │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│ │ 🐙 GitHub    │  │ ✨ OpenAI    │  │ 🤖 Claude    │      │
│ │ Copilot      │  │              │  │ Usage        │      │
│ │ ✓ Connected  │  │ ✓ Connected  │  │ ✓ Connected  │      │
│ │ Last: 5 min  │  │ Last: 1 hr   │  │ Last: 2 hrs  │      │
│ │ [Sync Now]   │  │ [Sync Now]   │  │ [Sync Now]   │      │
│ └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│ Available Integrations                                      │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│ │ 🐙 GitHub    │  │ ✨ OpenAI    │  │ 🤖 Claude    │      │
│ │ Copilot      │  │              │  │ Usage        │      │
│ │ Track usage  │  │ Monitor API  │  │ Org-wide     │      │
│ │ [Connect]    │  │ [Connect]    │  │ [Connect]    │      │
│ └──────────────┘  └──────────────┘  └──────────────┘      │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│ │ 💻 Claude    │  │ 🖱️ Cursor    │  │ 🚀 Codeium   │      │
│ │ Code         │  │ (CSV Only)   │  │ Coming Soon  │      │
│ │ Analytics    │  │              │  │              │      │
│ │ [Connect]    │  │ Manual only  │  │ [Coming]     │      │
│ └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Connection Modal (When You Click "Connect")

```
┌─────────────────────────────────────────────────────────┐
│ Connect GitHub Copilot                              [X] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Display Name *                                          │
│ [Production GitHub                                   ]  │
│                                                         │
│ Personal Access Token *                                 │
│ [ghp_••••••••••••••••••••••••                       ]  │
│                                                         │
│ Organization Name                                       │
│ [my-company                                          ]  │
│                                                         │
│ [Test Connection]                                       │
│                                                         │
│ ✅ Connection successful! Ready to sync data.          │
│    Organization: my-company                             │
│    Active Seats: 25                                     │
│                                                         │
│ [Cancel]                    [Add Connection]            │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Expected Results

### After Successful Connection & Sync:

#### Dashboard View
```
┌─────────────────────────────────────────────────────────┐
│ Organization Dashboard                                   │
├─────────────────────────────────────────────────────────┤
│ Total Usage (Last 30 Days)                              │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│ │ 125.4M   │ │ 87.2M    │ │ $234.50  │ │ 1,234    │   │
│ │ Input    │ │ Output   │ │ Cost     │ │ Requests │   │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                          │
│ Usage by Provider                                        │
│ GitHub Copilot  ████████░░  $120.00  (51%)             │
│ OpenAI          ██████░░░░  $ 89.50  (38%)             │
│ Claude          ███░░░░░░░  $ 25.00  (11%)             │
│                                                          │
│ Top Models                                               │
│ 1. GPT-4o         45.2M tokens    $113.00               │
│ 2. Sonnet 4.5     28.7M tokens    $ 86.10               │
│ 3. GPT-5 Mini     12.1M tokens    $  3.03               │
└─────────────────────────────────────────────────────────┘
```

#### Team Analytics (Claude Code Analytics)
```
┌─────────────────────────────────────────────────────────┐
│ Developer Productivity (Last 7 Days)                     │
├─────────────────────────────────────────────────────────┤
│ Top Developers                                           │
│                                                          │
│ 1. Alice Johnson                                         │
│    12.4M tokens | 2,456 suggestions | 87% accepted     │
│    3,200 lines of code | 45 files modified             │
│                                                          │
│ 2. Bob Smith                                             │
│    8.7M tokens | 1,823 suggestions | 92% accepted      │
│    2,100 lines of code | 32 files modified             │
│                                                          │
│ 3. Carol Davis                                           │
│    6.2M tokens | 1,234 suggestions | 79% accepted      │
│    1,800 lines of code | 28 files modified             │
└─────────────────────────────────────────────────────────┘
```

---

## 🔍 Troubleshooting

### Issue: "Connection Test Failed"

**GitHub Copilot:**
- ❌ Token doesn't have `copilot` scope → Create new token with correct scopes
- ❌ Wrong organization name → Check exact name on GitHub
- ❌ No Copilot subscription → Verify org has active Copilot subscription

**OpenAI:**
- ❌ Invalid API key → Verify key copied correctly (should start with `sk-`)
- ❌ No usage yet → Need at least one API call in your account
- ❌ Rate limited → Wait a moment and try again

**Anthropic:**
- ❌ Invalid API key → Check key starts with `sk-ant-`
- ❌ No organization access → Need org-level API key, not personal
- ❌ API endpoint not available → Check if you have the right Anthropic plan

### Issue: "Sync Failed"

1. **Check Connection Status:**
   - Should show "Active" not "Failed" or "Paused"
   
2. **Check Permissions:**
   - Only admins can sync connections
   - Verify you're logged in with admin account

3. **Check API Limits:**
   - OpenAI: 3,500 requests/day (free tier)
   - Anthropic: Check your plan limits
   - GitHub: 5,000 requests/hour

4. **Check Date Range:**
   - Default syncs last 7 days
   - Some APIs may not have older data available

### Issue: "No Data Showing"

1. **Wait for Sync:**
   - First sync can take 30-60 seconds
   - Refresh page after sync completes

2. **Check Data Exists:**
   - OpenAI: Must have API usage in date range
   - GitHub: Must have active Copilot users
   - Anthropic: Must have API calls recorded

3. **Check Time Period:**
   - Dashboard might be filtered to "Last 7 Days"
   - Try different date ranges

---

## 🧪 Manual Testing Checklist

### Basic Flow:
- [ ] Sign in to app
- [ ] Navigate to API Connections page
- [ ] Click "Connect" on a provider
- [ ] Enter credentials
- [ ] Click "Test Connection"
- [ ] See success message with metadata
- [ ] Click "Add Connection"
- [ ] See connection in "Active Connections"
- [ ] Click "Sync Now"
- [ ] Wait for sync to complete
- [ ] Navigate to Dashboard
- [ ] See usage data populated

### Each Provider:
- [ ] GitHub Copilot - Test & Sync
- [ ] OpenAI - Test & Sync
- [ ] Anthropic Usage - Test & Sync
- [ ] Anthropic Code Analytics - Test & Sync

### Error Scenarios:
- [ ] Try invalid API key → See error message
- [ ] Try without organization ID (GitHub) → See error
- [ ] Try syncing without test → Should be disabled
- [ ] Cancel modal → Should close without saving

---

## 🎯 Success Criteria

✅ **Connection Works** when:
- Test connection returns success
- Shows provider-specific metadata (org name, seat count, etc.)
- Can save connection without errors

✅ **Sync Works** when:
- Sync completes without errors
- Shows "X records synced successfully"
- Data appears in dashboard within 60 seconds
- Cost calculations match provider's billing

✅ **Data Accuracy** when:
- Token counts match provider console
- Costs calculated correctly (verify a few samples)
- User names populated (Claude Code Analytics)
- Date ranges correct

---

## 📸 What to Look For

### Good Signs ✅
- Green "✓ Connected" status
- Recent "Last Sync" timestamps
- Sync button is clickable
- Dashboard shows data from multiple sources
- Costs look reasonable (not $0 or $999,999)

### Bad Signs ❌
- Red "⚠️ Error" status
- "Last Error" message showing
- Sync button disabled or spinning forever
- Dashboard empty after sync
- Suspiciously high/low costs

---

## 🔐 Security Notes

1. **API Keys Are Encrypted:**
   - Your keys are encrypted before storage
   - Never visible in browser
   - Only Cloud Functions can decrypt

2. **Keep Keys Safe:**
   - Don't share API keys in screenshots
   - Rotate keys regularly
   - Use read-only keys when possible

3. **Delete Old Connections:**
   - Remove unused connections
   - Each connection syncs daily (can add up)

---

## 📞 Need Help?

### Check Logs:
```bash
# Backend errors
firebase functions:log

# Frontend errors
Browser DevTools → Console
```

### Common API Errors:

| Error Code | Provider | Meaning |
|------------|----------|---------|
| 401 | All | Invalid API key |
| 403 | GitHub | Missing permissions/scope |
| 404 | All | Resource not found (wrong org?) |
| 429 | All | Rate limit exceeded |
| 500 | All | Server error (try again) |

---

## 🚀 Quick Test Script

Want to test all at once? Try this flow:

1. **GitHub Copilot** (5 min)
   - Connect → Test → Add → Sync
   
2. **OpenAI** (3 min)
   - Connect → Test → Add → Sync
   
3. **Claude Usage** (3 min)
   - Connect → Test → Add → Sync
   
4. **Claude Code** (3 min)
   - Connect → Test → Add → Sync
   
5. **Check Dashboard** (2 min)
   - View combined data
   - Verify costs
   - Check charts

**Total Time:** ~15-20 minutes for complete test

---

## 📊 Sample Test Data

If you need to verify calculations manually:

```
Test Case 1: Small Request
Input: 1,500 tokens
Output: 500 tokens
Model: GPT-5 Mini ($0.25/$2.00 per 1M)
Expected Cost: (1,500/1M × $0.25) + (500/1M × $2.00) = $0.000375 + $0.001 = $0.001375
Display: ~$0.0014

Test Case 2: Large Request
Input: 500,000 tokens
Output: 500,000 tokens
Model: Sonnet 4.5 ($3/$15 per 1M)
Expected Cost: (500K/1M × $3) + (500K/1M × $15) = $1.50 + $7.50 = $9.00

Test Case 3: With Caching
Input: 1M tokens
Cached: 500K tokens
Output: 1M tokens
Model: GPT-4o ($2.50/$10.00 per 1M, cached $1.25)
Expected Cost: $2.50 + $0.625 + $10.00 = $13.125
```

---

**Happy Testing! 🎉**

Your frontend dev server is running at http://localhost:5173


