# AI Coding Tools API Integration Guide

**Project:** AICoder.Guru  
**Last Updated:** October 15, 2025  
**Status:** Research & Implementation Phase

---

## 🎯 Overview

This document outlines the API integration strategy for connecting AICoder.Guru with major AI coding assistant platforms to automatically sync usage data.

## 📊 Target Platforms

### Priority 1 (Immediate - TOP PRIORITY)
1. **Anthropic Claude** - ✅ Official Usage & Cost Admin API available
2. **Cursor** - CSV export available (manual)
3. **OpenAI API** - Direct API access

### Priority 2 (Near Term)
4. **GitHub Copilot** - Enterprise API available
5. **Google Gemini** - API billing data
6. **Codeium** - Team usage metrics

### Priority 3 (Future)
7. **Tabnine** - Enterprise analytics
8. **Replit Ghostwriter** - Usage API
9. **AWS CodeWhisperer** - Organization metrics

---

## 1. Anthropic Claude API Integration ⭐ TOP PRIORITY

### Current Status
- ✅ Official Admin API available
- ✅ Usage & Cost API endpoints documented
- ✅ Supports organization-level tracking
- 🔄 Implementation in progress

### API Documentation
- **Official Docs:** https://docs.claude.com/en/api/usage-cost-api
- **Base URL:** `https://api.anthropic.com/v1`
- **Authentication:** Admin API Key (starts with `sk-ant-admin...`)
- **Required Role:** Organization Admin (to provision Admin API keys)

### Key Features
1. **Usage Tracking:** Token-level consumption data
2. **Cost Reporting:** Actual costs in USD (cents)
3. **Granular Filtering:** By workspace, API key, model, service tier
4. **Time Buckets:** Minute, hourly, or daily aggregation
5. **Real-time Data:** Updates within 5 minutes

### Available Endpoints

#### 1. Usage Report API
**Endpoint:** `GET /v1/organizations/usage_report/messages`

**Query Parameters:**
- `starting_at` (required): ISO 8601 timestamp
- `ending_at` (required): ISO 8601 timestamp
- `bucket_width`: `1m`, `1h`, or `1d` (default: `1d`)
- `models[]`: Filter by model (e.g., `claude-sonnet-4-5-20250929`)
- `service_tiers[]`: Filter by tier (`standard`, `batch`, `priority`)
- `context_window[]`: Filter by context window size (`0-200k`, `200k+`)
- `api_key_ids[]`: Filter by specific API keys
- `workspace_ids[]`: Filter by workspaces
- `group_by[]`: Group results by `model`, `workspace_id`, `api_key_id`, `service_tier`, `context_window`
- `limit`: Results per page (default: 100)
- `page`: Pagination token

**Response Structure:**
```json
{
  "data": [
    {
      "bucket_start_time": "2025-01-15T00:00:00Z",
      "bucket_end_time": "2025-01-16T00:00:00Z",
      "model": "claude-sonnet-4-5-20250929",
      "workspace_id": "wrkspc_01JwQvzr7rXLA5AGx3HKfFUJ",
      "api_key_id": "apikey_01Rj2N8SVvo6BePZj99NhmiT",
      "service_tier": "standard",
      "context_window": "0-200k",
      "input_tokens": 125000,
      "cache_creation_input_tokens": 15000,
      "cache_read_input_tokens": 45000,
      "output_tokens": 32000,
      "server_tool_usage": {
        "web_search_count": 15
      }
    }
  ],
  "has_more": false,
  "next_page": null
}
```

**Token Types:**
- `input_tokens`: Uncached input tokens
- `cache_creation_input_tokens`: Tokens written to cache
- `cache_read_input_tokens`: Tokens read from cache
- `output_tokens`: Generated output tokens

#### 2. Cost Report API
**Endpoint:** `GET /v1/organizations/cost_report`

**Query Parameters:**
- `starting_at` (required): ISO 8601 timestamp
- `ending_at` (required): ISO 8601 timestamp
- `workspace_ids[]`: Filter by workspaces
- `group_by[]`: Group by `workspace_id`, `description`
- `limit`: Results per page
- `page`: Pagination token

**Response Structure:**
```json
{
  "data": [
    {
      "bucket_start_time": "2025-01-15T00:00:00Z",
      "bucket_end_time": "2025-01-16T00:00:00Z",
      "workspace_id": "wrkspc_01JwQvzr7rXLA5AGx3HKfFUJ",
      "description": "Token Usage",
      "amount": "12345",
      "currency": "usd"
    },
    {
      "bucket_start_time": "2025-01-15T00:00:00Z",
      "bucket_end_time": "2025-01-16T00:00:00Z",
      "workspace_id": "wrkspc_01JwQvzr7rXLA5AGx3HKfFUJ",
      "description": "Web Search Usage",
      "amount": "567",
      "currency": "usd"
    }
  ],
  "has_more": false,
  "next_page": null
}
```

**Cost Details:**
- All amounts in USD cents (as decimal strings)
- Separate line items for:
  - Token Usage
  - Web Search Usage
  - Code Execution Usage
- Priority Tier costs NOT included (track via usage endpoint)

### Time Granularity Limits

| Granularity | Default Limit | Maximum Limit | Use Case               |
|-------------|---------------|---------------|------------------------|
| 1m          | 60 buckets    | 1440 buckets  | Real-time monitoring   |
| 1h          | 24 buckets    | 168 buckets   | Daily patterns         |
| 1d          | 7 buckets     | 31 buckets    | Weekly/monthly reports |

### Implementation

**Connector:** `functions/src/connectors/AnthropicConnector.ts`

```typescript
import { BaseConnector } from './BaseConnector'
import { UsageData, SyncResult } from '@shared/types/usage'

interface AnthropicCredentials {
  adminApiKey: string  // sk-ant-admin...
  organizationId: string
}

interface AnthropicUsageBucket {
  bucket_start_time: string
  bucket_end_time: string
  model: string
  workspace_id: string | null
  api_key_id: string | null
  service_tier: 'standard' | 'batch' | 'priority'
  context_window: string
  input_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
  output_tokens: number
  server_tool_usage?: {
    web_search_count?: number
  }
}

interface AnthropicCostBucket {
  bucket_start_time: string
  bucket_end_time: string
  workspace_id: string | null
  description: string
  amount: string  // USD cents as decimal string
  currency: 'usd'
}

export class AnthropicConnector extends BaseConnector {
  private credentials: AnthropicCredentials
  private baseURL = 'https://api.anthropic.com/v1'
  private apiVersion = '2023-06-01'

  constructor(credentials: AnthropicCredentials) {
    super('anthropic')
    this.credentials = credentials
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test with a minimal date range
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      
      const response = await this.fetchUsageReport(
        yesterday.toISOString(),
        now.toISOString(),
        '1d'
      )
      
      return response !== null
    } catch (error) {
      console.error('Anthropic connection test failed:', error)
      return false
    }
  }

  async fetchUsage(startDate: Date, endDate: Date): Promise<UsageData[]> {
    const usageData: UsageData[] = []
    
    // Fetch usage report with daily buckets
    const usageReport = await this.fetchUsageReport(
      startDate.toISOString(),
      endDate.toISOString(),
      '1d',
      ['model', 'workspace_id', 'api_key_id']
    )

    // Fetch cost report
    const costReport = await this.fetchCostReport(
      startDate.toISOString(),
      endDate.toISOString(),
      ['workspace_id', 'description']
    )

    // Transform usage data
    for (const bucket of usageReport) {
      usageData.push(this.transformUsageBucket(bucket, costReport))
    }

    return usageData
  }

  private async fetchUsageReport(
    startingAt: string,
    endingAt: string,
    bucketWidth: '1m' | '1h' | '1d',
    groupBy: string[] = []
  ): Promise<AnthropicUsageBucket[]> {
    const allData: AnthropicUsageBucket[] = []
    let nextPage: string | null = null

    do {
      const params = new URLSearchParams({
        starting_at: startingAt,
        ending_at: endingAt,
        bucket_width: bucketWidth,
        limit: '1000'
      })

      groupBy.forEach(group => params.append('group_by[]', group))
      if (nextPage) params.append('page', nextPage)

      const response = await fetch(
        `${this.baseURL}/organizations/usage_report/messages?${params}`,
        {
          headers: {
            'anthropic-version': this.apiVersion,
            'x-api-key': this.credentials.adminApiKey,
            'User-Agent': 'AICoder.Guru/1.0.0 (https://aicoder.guru)'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      allData.push(...data.data)
      
      nextPage = data.has_more ? data.next_page : null
    } while (nextPage)

    return allData
  }

  private async fetchCostReport(
    startingAt: string,
    endingAt: string,
    groupBy: string[] = []
  ): Promise<AnthropicCostBucket[]> {
    const allData: AnthropicCostBucket[] = []
    let nextPage: string | null = null

    do {
      const params = new URLSearchParams({
        starting_at: startingAt,
        ending_at: endingAt,
        limit: '1000'
      })

      groupBy.forEach(group => params.append('group_by[]', group))
      if (nextPage) params.append('page', nextPage)

      const response = await fetch(
        `${this.baseURL}/organizations/cost_report?${params}`,
        {
          headers: {
            'anthropic-version': this.apiVersion,
            'x-api-key': this.credentials.adminApiKey,
            'User-Agent': 'AICoder.Guru/1.0.0 (https://aicoder.guru)'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      allData.push(...data.data)
      
      nextPage = data.has_more ? data.next_page : null
    } while (nextPage)

    return allData
  }

  private transformUsageBucket(
    bucket: AnthropicUsageBucket,
    costReport: AnthropicCostBucket[]
  ): UsageData {
    const date = bucket.bucket_start_time.split('T')[0]
    
    // Calculate total tokens
    const totalInputTokens = bucket.input_tokens + 
                            bucket.cache_creation_input_tokens +
                            bucket.cache_read_input_tokens
    const totalTokens = totalInputTokens + bucket.output_tokens

    // Find matching cost data
    const matchingCost = costReport.find(
      cost => 
        cost.bucket_start_time === bucket.bucket_start_time &&
        cost.workspace_id === bucket.workspace_id &&
        cost.description === 'Token Usage'
    )

    // Convert cost from cents to dollars
    const cost = matchingCost 
      ? parseFloat(matchingCost.amount) / 100 
      : this.estimateCost(bucket)

    return {
      date,
      userId: bucket.api_key_id || undefined,
      model: bucket.model,
      provider: 'anthropic',
      inputTokens: bucket.input_tokens,
      outputTokens: bucket.output_tokens,
      cachedTokens: bucket.cache_read_input_tokens,
      totalTokens,
      requests: 1, // Not provided by API
      cost,
      metadata: {
        workspaceId: bucket.workspace_id,
        serviceTier: bucket.service_tier,
        contextWindow: bucket.context_window,
        cacheCreationTokens: bucket.cache_creation_input_tokens,
        webSearchCount: bucket.server_tool_usage?.web_search_count || 0
      }
    }
  }

  private estimateCost(bucket: AnthropicUsageBucket): number {
    // Fallback pricing if cost API doesn't have data
    // Prices per 1M tokens (as of Oct 2025)
    const pricing: Record<string, { input: number; output: number; cache_write: number; cache_read: number }> = {
      'claude-sonnet-4-5-20250929': {
        input: 3.00,
        output: 15.00,
        cache_write: 3.75,
        cache_read: 0.30
      },
      'claude-3-5-sonnet-20241022': {
        input: 3.00,
        output: 15.00,
        cache_write: 3.75,
        cache_read: 0.30
      },
      'claude-3-opus-20240229': {
        input: 15.00,
        output: 75.00,
        cache_write: 18.75,
        cache_read: 1.50
      },
      'claude-3-haiku-20240307': {
        input: 0.25,
        output: 1.25,
        cache_write: 0.30,
        cache_read: 0.03
      }
    }

    const modelPricing = pricing[bucket.model] || pricing['claude-3-5-sonnet-20241022']

    const inputCost = (bucket.input_tokens / 1_000_000) * modelPricing.input
    const outputCost = (bucket.output_tokens / 1_000_000) * modelPricing.output
    const cacheWriteCost = (bucket.cache_creation_input_tokens / 1_000_000) * modelPricing.cache_write
    const cacheReadCost = (bucket.cache_read_input_tokens / 1_000_000) * modelPricing.cache_read

    return inputCost + outputCost + cacheWriteCost + cacheReadCost
  }

  async sync(organizationId: string, connectionId: string): Promise<SyncResult> {
    return super.sync(organizationId, connectionId)
  }
}
```

### Required Credentials

**Admin API Key Setup:**
1. Log in to Claude Console as Organization Admin
2. Navigate to Settings → API Keys
3. Create new Admin API key (starts with `sk-ant-admin...`)
4. Store securely in AICoder.Guru

**Permissions Required:**
- Organization Admin role
- Admin API key (not standard API key)

### Data Freshness & Polling

- **Data Latency:** Typically 5 minutes, occasionally longer
- **Recommended Polling:** Once per minute for sustained use
- **Burst Polling:** Acceptable for short periods (pagination)
- **Cache Results:** For frequently updated dashboards

### Special Considerations

1. **Workbench Usage:** API key ID will be `null` for Workbench requests
2. **Default Workspace:** Workspace ID is `null` for default workspace
3. **Priority Tier:** Track via usage endpoint, NOT in cost endpoint
4. **Code Execution:** Appears in cost endpoint as "Code Execution Usage"
5. **Web Search:** Tracked separately in `server_tool_usage`

### Integration with AICoder.Guru

**UI Components:**
1. **Connection Setup:**
   - Admin API key input
   - Connection test
   - Workspace selection

2. **Dashboard Features:**
   - Real-time usage monitoring (1m buckets)
   - Daily usage trends (1d buckets)
   - Cost breakdown by workspace
   - Cache efficiency metrics
   - Model usage distribution

3. **Analytics:**
   - Cache hit rate analysis
   - Cost optimization recommendations
   - Service tier usage patterns
   - Per-workspace cost attribution

### Testing Strategy

```typescript
// Test connection
const connector = new AnthropicConnector({
  adminApiKey: 'sk-ant-admin-...',
  organizationId: 'org_...'
})

const isConnected = await connector.testConnection()
console.log('Connection test:', isConnected)

// Fetch last 7 days usage
const endDate = new Date()
const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)

const usageData = await connector.fetchUsage(startDate, endDate)
console.log(`Fetched ${usageData.length} usage records`)

// Calculate total cost
const totalCost = usageData.reduce((sum, record) => sum + record.cost, 0)
console.log(`Total cost: $${totalCost.toFixed(2)}`)
```

### Next Steps

1. ✅ Document API endpoints and response formats
2. 🔄 Implement `AnthropicConnector` class
3. ⏳ Add Admin API key management UI
4. ⏳ Create workspace mapping interface
5. ⏳ Build real-time usage dashboard
6. ⏳ Implement cost optimization alerts
7. ⏳ Add cache efficiency analytics

---

## 2. Cursor IDE Integration

### Current Status
- ✅ CSV export available in Cursor settings
- ✅ Manual CSV upload working in AICoder.Guru
- ⏳ API integration - researching availability

### Data Available
```json
{
  "date": "2024-10-15",
  "model": "claude-sonnet-3.5",
  "inputTokens": 1500,
  "outputTokens": 800,
  "cachedTokens": 200,
  "cost": 0.015,
  "requests": 5
}
```

### Implementation Strategy

#### Phase 1: CSV Upload (✅ Complete)
- Users manually export CSV from Cursor
- Drag & drop into AICoder.Guru
- Automatic parsing and storage

#### Phase 2: API Integration (🔄 In Progress)
**Research Needed:**
- Check if Cursor provides API access
- Look for usage export API endpoints
- Investigate OAuth/API key authentication

**Potential Approach:**
```typescript
interface CursorConnector {
  authenticate(apiKey: string): Promise<boolean>
  fetchUsage(startDate: Date, endDate: Date): Promise<UsageData[]>
  sync(): Promise<SyncResult>
}
```

**Implementation Location:**
- `functions/src/connectors/CursorConnector.ts`
- Cloud Function: `syncCursorUsage`
- Schedule: Daily at 2 AM UTC

---

## 2. GitHub Copilot Integration

### API Documentation
- **Endpoint:** GitHub REST API
- **Base URL:** `https://api.github.com`
- **Authentication:** GitHub App or Personal Access Token
- **Scope Required:** `copilot:read` (organization level)

### Available Endpoints

#### Get Organization Usage
```http
GET /enterprises/{enterprise}/copilot/usage
GET /orgs/{org}/copilot/usage
```

**Response:**
```json
{
  "day": "2024-10-15",
  "total_suggestions_count": 1500,
  "total_acceptances_count": 450,
  "total_lines_suggested": 3200,
  "total_lines_accepted": 980,
  "total_active_users": 25,
  "breakdown": [
    {
      "language": "typescript",
      "editor": "vscode",
      "suggestions_count": 800,
      "acceptances_count": 250
    }
  ]
}
```

#### Get Seat Information
```http
GET /orgs/{org}/copilot/billing/seats
```

**Response:**
```json
{
  "total_seats": 50,
  "seats": [
    {
      "assignee": {
        "login": "username",
        "id": 12345
      },
      "created_at": "2024-01-15T10:30:00Z",
      "last_activity_at": "2024-10-15T14:20:00Z",
      "last_activity_editor": "vscode"
    }
  ]
}
```

### Implementation

**Connector:** `functions/src/connectors/GitHubCopilotConnector.ts`

```typescript
export class GitHubCopilotConnector extends BaseConnector {
  private octokit: Octokit
  
  constructor(credentials: { token: string, org: string }) {
    super('github_copilot')
    this.octokit = new Octokit({ auth: credentials.token })
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.octokit.rest.copilot.getCopilotOrganizationDetails({
        org: this.credentials.org
      })
      return true
    } catch (error) {
      return false
    }
  }

  async fetchUsage(startDate: Date, endDate: Date): Promise<UsageData[]> {
    const usage = await this.octokit.rest.copilot.usageMetricsForOrg({
      org: this.credentials.org,
      since: startDate.toISOString(),
      until: endDate.toISOString()
    })
    
    return this.transformToStandardFormat(usage.data)
  }
}
```

**Required Credentials:**
- GitHub Organization name
- Personal Access Token or GitHub App credentials
- Permissions: `copilot:read`, `org:read`

**Cost Calculation:**
- GitHub Copilot: $19/user/month (Business)
- GitHub Copilot: $39/user/month (Enterprise)
- Calculate based on active seats

---

## 3. OpenAI API Integration

### API Documentation
- **Endpoint:** OpenAI API
- **Base URL:** `https://api.openai.com/v1`
- **Authentication:** API Key (Bearer token)
- **Scope:** Organization usage data

### Available Endpoints

#### Get Usage Data
```http
GET /v1/usage?date={YYYY-MM-DD}
Authorization: Bearer {API_KEY}
```

**Response:**
```json
{
  "object": "list",
  "data": [
    {
      "aggregation_timestamp": 1697328000,
      "n_requests": 150,
      "operation": "completion",
      "snapshot_id": "gpt-4",
      "n_context_tokens_total": 45000,
      "n_generated_tokens_total": 12000
    }
  ],
  "ft_data": [],
  "dalle_api_data": []
}
```

#### Get Organization Details
```http
GET /v1/organizations/{org_id}
Authorization: Bearer {API_KEY}
```

### Implementation

**Connector:** `functions/src/connectors/OpenAIConnector.ts`

```typescript
export class OpenAIConnector extends BaseConnector {
  private apiKey: string
  private baseURL = 'https://api.openai.com/v1'

  async fetchUsage(startDate: Date, endDate: Date): Promise<UsageData[]> {
    const usageData = []
    let currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const response = await fetch(`${this.baseURL}/usage?date=${dateStr}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      usageData.push(...this.transformData(data, currentDate))
      
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return usageData
  }

  private transformData(apiData: any, date: Date): UsageData[] {
    return apiData.data.map((item: any) => ({
      date: date.toISOString().split('T')[0],
      model: item.snapshot_id,
      inputTokens: item.n_context_tokens_total,
      outputTokens: item.n_generated_tokens_total,
      totalTokens: item.n_context_tokens_total + item.n_generated_tokens_total,
      requests: item.n_requests,
      cost: this.calculateCost(item),
      provider: 'openai'
    }))
  }

  private calculateCost(item: any): number {
    // GPT-4 pricing: $0.03/1K input, $0.06/1K output
    const inputCost = (item.n_context_tokens_total / 1000) * 0.03
    const outputCost = (item.n_generated_tokens_total / 1000) * 0.06
    return inputCost + outputCost
  }
}
```

**Required Credentials:**
- OpenAI API Key
- Organization ID (optional, for org-level data)

---

## 4. Anthropic Claude Code Analytics API 🎯 DEVELOPER PRIORITY

### Current Status
- ✅ Official Admin API available
- ✅ Daily aggregated metrics per user
- ✅ Developer productivity tracking
- 🔄 Implementation priority for developer teams

### API Documentation
- **Official Docs:** https://docs.claude.com/en/api/claude-code-analytics-api
- **Base URL:** `https://api.anthropic.com/v1`
- **Authentication:** Admin API Key (starts with `sk-ant-admin...`)
- **Required Role:** Organization Admin

### Why This API is Critical for AICoder.Guru

The Claude Code Analytics API is **essential for tracking developer productivity** and is optimized for organizations with many developers. This is the primary API for monitoring AI coding tool adoption and measuring developer impact.

### Key Differences from Usage & Cost API

| Feature | Usage & Cost API | Code Analytics API |
|---------|------------------|-------------------|
| **Scope** | All Claude API usage | Claude Code only |
| **Granularity** | Token-level | User-level daily aggregates |
| **Cost Type** | Actual costs (cents) | Estimated costs (cents) |
| **Performance** | Limited by many API keys | Optimized for many users |
| **Use Case** | General API tracking | Developer productivity |
| **Data Freshness** | 5 minutes | 1 hour |
| **Pagination** | Page tokens | Cursor-based |
| **Metrics** | Tokens only | Sessions, LOC, commits, PRs, tool acceptance |

### When to Use

- **PRIMARY USE:** Track Claude Code usage across developer teams
- **SECONDARY USE:** Measure developer productivity metrics
- **COMBINED:** Use both APIs for comprehensive organization monitoring

### Available Endpoints

#### Claude Code Analytics
**Endpoint:** `GET /v1/organizations/usage_report/claude_code`

**Query Parameters:**
- `starting_at` (required): UTC date in YYYY-MM-DD format (single day only)
- `limit`: Records per page (default: 20, max: 1000)
- `page`: Opaque cursor token from `next_page`

**Response Structure:**
```json
{
  "data": [
    {
      "date": "2025-09-01T00:00:00Z",
      "actor": {
        "type": "user_actor",
        "email_address": "developer@company.com"
      },
      "organization_id": "dc9f6c26-b22c-4831-8d01-0446bada88f1",
      "customer_type": "api",
      "terminal_type": "vscode",
      "core_metrics": {
        "num_sessions": 5,
        "lines_of_code": {
          "added": 1543,
          "removed": 892
        },
        "commits_by_claude_code": 12,
        "pull_requests_by_claude_code": 2
      },
      "tool_actions": {
        "edit_tool": {
          "accepted": 45,
          "rejected": 5
        },
        "multi_edit_tool": {
          "accepted": 12,
          "rejected": 2
        },
        "write_tool": {
          "accepted": 8,
          "rejected": 1
        },
        "notebook_edit_tool": {
          "accepted": 3,
          "rejected": 0
        }
      },
      "model_breakdown": [
        {
          "model": "claude-3-5-sonnet-20241022",
          "tokens": {
            "input": 100000,
            "output": 35000,
            "cache_read": 10000,
            "cache_creation": 5000
          },
          "estimated_cost": {
            "currency": "USD",
            "amount": 1025
          }
        }
      ]
    }
  ],
  "has_more": false,
  "next_page": null
}
```

### Available Metrics

#### Dimensions
- **date**: RFC 3339 timestamp (UTC)
- **actor**: User or API key identifier
  - `user_actor` with `email_address` (OAuth users)
  - `api_actor` with `api_key_name` (API key users)
- **organization_id**: Organization UUID
- **customer_type**: `api` (API PAYG) or `subscription` (Pro/Team)
- **terminal_type**: Environment (e.g., `vscode`, `iTerm.app`, `tmux`)

#### Core Productivity Metrics
- **num_sessions**: Number of Claude Code sessions
- **lines_of_code.added**: Total lines added by Claude Code
- **lines_of_code.removed**: Total lines removed by Claude Code
- **commits_by_claude_code**: Git commits created via Claude Code
- **pull_requests_by_claude_code**: PRs created via Claude Code

#### Tool Action Metrics (Acceptance/Rejection)
- **edit_tool**: Edit proposals accepted/rejected
- **multi_edit_tool**: Multi-edit proposals accepted/rejected
- **write_tool**: Write proposals accepted/rejected
- **notebook_edit_tool**: Notebook edit proposals accepted/rejected

**Calculate Acceptance Rate:**
```typescript
acceptanceRate = accepted / (accepted + rejected) * 100
// Example: edit_tool with 45 accepted, 5 rejected = 90% acceptance
```

#### Model Breakdown (per user, per day)
- **model**: Claude model identifier
- **tokens.input/output**: Token counts by type
- **tokens.cache_read/cache_creation**: Cache-related tokens
- **estimated_cost.amount**: Cost in cents USD
- **estimated_cost.currency**: Always `USD`

### Implementation

**Connector:** `functions/src/connectors/ClaudeCodeConnector.ts`

```typescript
import { BaseConnector } from './BaseConnector'
import { UsageData, SyncResult } from '@shared/types/usage'

interface ClaudeCodeCredentials {
  adminApiKey: string  // sk-ant-admin...
  organizationId: string
}

interface ClaudeCodeAnalyticsRecord {
  date: string
  actor: {
    type: 'user_actor' | 'api_actor'
    email_address?: string
    api_key_name?: string
  }
  organization_id: string
  customer_type: 'api' | 'subscription'
  terminal_type: string
  core_metrics: {
    num_sessions: number
    lines_of_code: {
      added: number
      removed: number
    }
    commits_by_claude_code: number
    pull_requests_by_claude_code: number
  }
  tool_actions: {
    edit_tool: { accepted: number; rejected: number }
    multi_edit_tool?: { accepted: number; rejected: number }
    write_tool: { accepted: number; rejected: number }
    notebook_edit_tool: { accepted: number; rejected: number }
  }
  model_breakdown: Array<{
    model: string
    tokens: {
      input: number
      output: number
      cache_read: number
      cache_creation: number
    }
    estimated_cost: {
      currency: 'USD'
      amount: number  // cents
    }
  }>
}

interface ClaudeCodeAnalyticsResponse {
  data: ClaudeCodeAnalyticsRecord[]
  has_more: boolean
  next_page: string | null
}

export class ClaudeCodeConnector extends BaseConnector {
  private credentials: ClaudeCodeCredentials
  private baseURL = 'https://api.anthropic.com/v1'
  private apiVersion = '2023-06-01'

  constructor(credentials: ClaudeCodeCredentials) {
    super('claude_code')
    this.credentials = credentials
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test with yesterday's date
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const dateStr = yesterday.toISOString().split('T')[0]
      
      await this.fetchAnalytics(dateStr, 1)
      return true
    } catch (error) {
      console.error('Claude Code connection test failed:', error)
      return false
    }
  }

  async fetchUsage(startDate: Date, endDate: Date): Promise<UsageData[]> {
    const allUsageData: UsageData[] = []
    
    // Iterate through each day in the range
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      
      // Fetch analytics for this day with pagination
      const records = await this.fetchAnalyticsForDay(dateStr)
      
      // Transform each user's record to UsageData format
      for (const record of records) {
        const usageData = this.transformRecord(record)
        allUsageData.push(...usageData)
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return allUsageData
  }

  private async fetchAnalyticsForDay(date: string): Promise<ClaudeCodeAnalyticsRecord[]> {
    const allRecords: ClaudeCodeAnalyticsRecord[] = []
    let nextPage: string | null = null

    do {
      const data = await this.fetchAnalytics(date, 1000, nextPage)
      allRecords.push(...data.data)
      nextPage = data.has_more ? data.next_page : null
    } while (nextPage)

    return allRecords
  }

  private async fetchAnalytics(
    startingAt: string,
    limit: number = 20,
    page?: string | null
  ): Promise<ClaudeCodeAnalyticsResponse> {
    const params = new URLSearchParams({
      starting_at: startingAt,
      limit: limit.toString()
    })

    if (page) {
      params.append('page', page)
    }

    const response = await fetch(
      `${this.baseURL}/organizations/usage_report/claude_code?${params}`,
      {
        headers: {
          'anthropic-version': this.apiVersion,
          'x-api-key': this.credentials.adminApiKey,
          'User-Agent': 'AICoder.Guru/1.0.0 (https://aicoder.guru)'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Claude Code API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  private transformRecord(record: ClaudeCodeAnalyticsRecord): UsageData[] {
    const usageData: UsageData[] = []
    const date = record.date.split('T')[0]
    
    // Get user identifier
    const userId = record.actor.type === 'user_actor' 
      ? record.actor.email_address 
      : record.actor.api_key_name

    // Create a UsageData entry for each model in the breakdown
    for (const modelData of record.model_breakdown) {
      const totalTokens = modelData.tokens.input + 
                         modelData.tokens.output + 
                         modelData.tokens.cache_read +
                         modelData.tokens.cache_creation

      // Calculate tool acceptance rates
      const toolAcceptanceRates = this.calculateToolAcceptanceRates(record.tool_actions)

      usageData.push({
        date,
        userId,
        model: modelData.model,
        provider: 'anthropic_claude_code',
        inputTokens: modelData.tokens.input,
        outputTokens: modelData.tokens.output,
        cachedTokens: modelData.tokens.cache_read,
        totalTokens,
        requests: record.core_metrics.num_sessions,
        cost: modelData.estimated_cost.amount / 100, // Convert cents to dollars
        metadata: {
          organizationId: record.organization_id,
          customerType: record.customer_type,
          terminalType: record.terminal_type,
          productivity: {
            sessions: record.core_metrics.num_sessions,
            linesAdded: record.core_metrics.lines_of_code.added,
            linesRemoved: record.core_metrics.lines_of_code.removed,
            netLines: record.core_metrics.lines_of_code.added - 
                     record.core_metrics.lines_of_code.removed,
            commits: record.core_metrics.commits_by_claude_code,
            pullRequests: record.core_metrics.pull_requests_by_claude_code
          },
          toolActions: record.tool_actions,
          toolAcceptanceRates,
          cacheCreationTokens: modelData.tokens.cache_creation
        }
      })
    }

    // If no model breakdown, create a single entry with just productivity metrics
    if (record.model_breakdown.length === 0) {
      usageData.push({
        date,
        userId,
        model: 'unknown',
        provider: 'anthropic_claude_code',
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 0,
        requests: record.core_metrics.num_sessions,
        cost: 0,
        metadata: {
          organizationId: record.organization_id,
          customerType: record.customer_type,
          terminalType: record.terminal_type,
          productivity: {
            sessions: record.core_metrics.num_sessions,
            linesAdded: record.core_metrics.lines_of_code.added,
            linesRemoved: record.core_metrics.lines_of_code.removed,
            netLines: record.core_metrics.lines_of_code.added - 
                     record.core_metrics.lines_of_code.removed,
            commits: record.core_metrics.commits_by_claude_code,
            pullRequests: record.core_metrics.pull_requests_by_claude_code
          },
          toolActions: record.tool_actions,
          toolAcceptanceRates: this.calculateToolAcceptanceRates(record.tool_actions)
        }
      })
    }

    return usageData
  }

  private calculateToolAcceptanceRates(toolActions: any): Record<string, number> {
    const rates: Record<string, number> = {}

    for (const [toolName, actions] of Object.entries(toolActions)) {
      const { accepted, rejected } = actions as { accepted: number; rejected: number }
      const total = accepted + rejected
      rates[toolName] = total > 0 ? (accepted / total) * 100 : 0
    }

    return rates
  }

  async sync(organizationId: string, connectionId: string): Promise<SyncResult> {
    return super.sync(organizationId, connectionId)
  }
}
```

### Data Freshness & Polling

- **Data Latency:** Up to 1 hour delay
- **Daily Aggregation:** Metrics for a single day only
- **Recommended Strategy:** Daily batch job at 2 AM UTC to fetch previous day
- **Historical Access:** All historical data retained, no deletion period

### Special Considerations

1. **Single Day Queries:** Each API call returns data for ONE day only
2. **Date Range Handling:** Loop through dates to fetch multiple days
3. **User Identification:**
   - `user_actor` for OAuth authentication (most common)
   - `api_actor` for API key authentication
4. **1st Party Only:** Only tracks Claude Code on Anthropic API (not Bedrock/Vertex)
5. **Free API:** No cost to use the Analytics API
6. **Cursor-Based Pagination:** Stable pagination with opaque cursors
7. **UTC Timezone:** All dates in UTC (YYYY-MM-DD format)

### Integration with AICoder.Guru

**UI Components:**

1. **Developer Dashboard:**
   - Sessions per developer per day
   - Lines of code contribution (added/removed/net)
   - Commits and PR creation via Claude Code
   - Tool acceptance rates by developer
   - Terminal/IDE usage distribution

2. **Team Analytics:**
   - Top contributors by lines of code
   - Team-wide tool acceptance rates
   - Model usage distribution
   - Cost allocation by developer
   - Adoption rate trends

3. **Productivity Metrics:**
   - **Code Velocity:** Lines of code per session
   - **Tool Efficiency:** Acceptance rate trends
   - **AI Impact:** Commits/PRs attributed to Claude Code
   - **Cost per Developer:** Daily/weekly/monthly spend
   - **ROI Metrics:** Productivity vs. cost analysis

4. **Leaderboards:**
   - Top developers by Claude Code usage
   - Highest tool acceptance rates
   - Most commits/PRs created
   - Greatest code contribution

### Analytics Formulas

```typescript
// Code Velocity
codeVelocity = linesAdded / numSessions

// Tool Acceptance Rate
toolAcceptanceRate = (accepted / (accepted + rejected)) * 100

// Net Code Contribution
netLines = linesAdded - linesRemoved

// Cost per Line of Code
costPerLine = totalCost / linesAdded

// Session Efficiency
sessionEfficiency = (commits + pullRequests) / numSessions

// Developer Productivity Score
productivityScore = (
  (linesAdded * 0.3) +
  (commits * 0.3) +
  (pullRequests * 0.2) +
  (toolAcceptanceRate * 0.2)
)
```

### Testing Strategy

```typescript
// Test connection
const connector = new ClaudeCodeConnector({
  adminApiKey: 'sk-ant-admin-...',
  organizationId: 'org_...'
})

const isConnected = await connector.testConnection()
console.log('Connection test:', isConnected)

// Fetch last 7 days of developer activity
const endDate = new Date()
endDate.setDate(endDate.getDate() - 1) // Yesterday (data is 1 hour delayed)
const startDate = new Date(endDate)
startDate.setDate(startDate.getDate() - 7)

const usageData = await connector.fetchUsage(startDate, endDate)
console.log(`Fetched ${usageData.length} developer records`)

// Aggregate metrics
const stats = {
  totalDevelopers: new Set(usageData.map(d => d.userId)).size,
  totalSessions: usageData.reduce((sum, d) => sum + d.requests, 0),
  totalLinesAdded: usageData.reduce((sum, d) => sum + (d.metadata.productivity?.linesAdded || 0), 0),
  totalCost: usageData.reduce((sum, d) => sum + d.cost, 0)
}

console.log('Team Stats:', stats)
```

### Common Use Cases for AICoder.Guru

1. **Executive Dashboards:**
   - Show overall team productivity impact
   - ROI justification for Claude Code adoption
   - Cost vs. productivity trends

2. **AI Tool Comparison:**
   - Compare Claude Code vs. GitHub Copilot vs. Cursor
   - Tool acceptance rate benchmarking
   - Cost efficiency analysis

3. **Developer Performance:**
   - Individual productivity metrics
   - Identify top performers
   - Training opportunities (low acceptance rates)

4. **Cost Management:**
   - Per-developer cost tracking
   - Team budget allocation
   - Cost optimization opportunities

5. **Adoption Monitoring:**
   - Track which developers are using Claude Code
   - Identify teams not yet adopted
   - Measure growth over time

6. **League Tables:**
   - Top developers by lines of code
   - Highest tool acceptance rates
   - Most efficient users (cost per line)

### Next Steps

1. ✅ Document API endpoints and metrics
2. 🔄 Implement `ClaudeCodeConnector` class (HIGH PRIORITY)
3. ⏳ Add Admin API key management UI
4. ⏳ Build developer productivity dashboard
5. ⏳ Create team leaderboards
6. ⏳ Implement tool acceptance rate analytics
7. ⏳ Add ROI calculation features
8. ⏳ Create executive summary reports

---

## 5. Google Gemini API Integration

### API Documentation
- **Endpoint:** Google AI Studio / Vertex AI
- **Base URL:** `https://generativelanguage.googleapis.com/v1`
- **Authentication:** API Key or OAuth 2.0

### Available Endpoints

#### Generate Content (with usage tracking)
```http
POST /v1/models/{model}:generateContent
x-goog-api-key: {API_KEY}

{
  "contents": [...]
}
```

**Response includes usage:**
```json
{
  "candidates": [...],
  "usageMetadata": {
    "promptTokenCount": 45,
    "candidatesTokenCount": 127,
    "totalTokenCount": 172
  }
}
```

### Implementation

**Connector:** `functions/src/connectors/GeminiConnector.ts`

```typescript
export class GeminiConnector extends BaseConnector {
  private apiKey: string

  // Similar to Anthropic, Gemini doesn't have a dedicated usage API
  // We need to track usage through API call responses

  async fetchUsage(startDate: Date, endDate: Date): Promise<UsageData[]> {
    // Aggregate from stored API call logs
    const logs = await this.queryGeminiLogs(startDate, endDate)
    return this.transformToUsageData(logs)
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = {
      'gemini-pro': { input: 0.00025, output: 0.0005 },
      'gemini-pro-vision': { input: 0.00025, output: 0.0005 },
      'gemini-ultra': { input: 0.001, output: 0.002 }
    }

    const modelPricing = pricing[model] || pricing['gemini-pro']
    return (inputTokens / 1000) * modelPricing.input + 
           (outputTokens / 1000) * modelPricing.output
  }
}
```

---

## 6. Codeium Integration

### Status
- ⏳ API documentation research needed
- 📧 Contact Codeium for enterprise API access

### Expected Data
```json
{
  "user_id": "user123",
  "completions_accepted": 450,
  "completions_shown": 1200,
  "characters_accepted": 12500,
  "languages": ["typescript", "python", "go"],
  "date": "2024-10-15"
}
```

### Implementation Plan
1. Research Codeium Teams/Enterprise API
2. Request API access from Codeium
3. Implement connector similar to GitHub Copilot
4. Map completions to token equivalents for cost estimation

---

## 🔧 Implementation Architecture

### Base Connector Interface

**Location:** `functions/src/connectors/BaseConnector.ts`

```typescript
export abstract class BaseConnector {
  protected provider: string
  protected credentials: any

  constructor(provider: string) {
    this.provider = provider
  }

  abstract testConnection(): Promise<boolean>
  abstract fetchUsage(startDate: Date, endDate: Date): Promise<UsageData[]>
  
  async sync(organizationId: string, connectionId: string): Promise<SyncResult> {
    try {
      const lastSync = await this.getLastSyncDate(connectionId)
      const today = new Date()
      
      const usageData = await this.fetchUsage(lastSync, today)
      
      await this.saveUsageData(organizationId, usageData)
      
      await this.updateSyncHistory(connectionId, {
        status: 'success',
        recordsSynced: usageData.length,
        lastSyncAt: today
      })

      return {
        success: true,
        recordsSynced: usageData.length
      }
    } catch (error) {
      await this.updateSyncHistory(connectionId, {
        status: 'failed',
        error: error.message
      })
      
      return {
        success: false,
        error: error.message
      }
    }
  }
}
```

### Standard Usage Data Format

```typescript
interface UsageData {
  date: string                    // YYYY-MM-DD
  userId?: string                 // Optional user identifier
  model: string                   // Model name
  provider: string                // cursor, github_copilot, openai, etc.
  inputTokens: number             // Input/prompt tokens
  outputTokens: number            // Output/completion tokens
  cachedTokens?: number           // Cached tokens (if available)
  totalTokens: number             // Total tokens
  requests: number                // Number of API requests
  cost: number                    // Calculated cost in USD
  metadata?: {                    // Provider-specific metadata
    [key: string]: any
  }
}
```

---

## 🔐 Security & Credentials

### Credential Storage

**Firestore Collection:** `organizations/{orgId}/apiConnections/{connectionId}`

```typescript
interface APIConnection {
  provider: 'cursor' | 'github_copilot' | 'openai' | 'anthropic' | 'gemini' | 'codeium'
  credentials: EncryptedCredentials  // Encrypted at rest
  status: 'active' | 'failed' | 'paused'
  lastSyncAt: Timestamp
  nextSyncAt: Timestamp
  createdBy: string
  createdAt: Timestamp
}

interface EncryptedCredentials {
  encrypted: string    // AES-256 encrypted credentials
  iv: string          // Initialization vector
  authTag: string     // Authentication tag
}
```

### Encryption

```typescript
import crypto from 'crypto'

export function encryptCredentials(credentials: any): EncryptedCredentials {
  const algorithm = 'aes-256-gcm'
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')
  const iv = crypto.randomBytes(16)
  
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex')
  }
}

export function decryptCredentials(encrypted: EncryptedCredentials): any {
  const algorithm = 'aes-256-gcm'
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')
  const iv = Buffer.from(encrypted.iv, 'hex')
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'))
  
  let decrypted = decipher.update(encrypted.encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return JSON.parse(decrypted)
}
```

---

## 📅 Sync Schedule

### Cloud Scheduler Configuration

**Function:** `scheduledApiSync`  
**Schedule:** Daily at 2:00 AM UTC  
**Cron:** `0 2 * * *`

```typescript
export const scheduledApiSync = functions
  .region('europe-west2')
  .pubsub.schedule('0 2 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    // Get all active API connections
    const connections = await getActiveConnections()
    
    // Sync each connection
    for (const connection of connections) {
      try {
        const connector = getConnector(connection.provider, connection.credentials)
        await connector.sync(connection.organizationId, connection.id)
      } catch (error) {
        console.error(`Failed to sync ${connection.provider}:`, error)
        // Send alert email
      }
    }
  })
```

---

## 📊 Cost Calculation

### Pricing Tables

**Location:** `shared/src/types/pricing.ts`

```typescript
export const AI_MODEL_PRICING = {
  // OpenAI
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  
  // Anthropic
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  
  // Google
  'gemini-pro': { input: 0.00025, output: 0.0005 },
  'gemini-ultra': { input: 0.001, output: 0.002 },
  
  // GitHub Copilot (per user per month)
  'github-copilot-business': { monthly: 19 },
  'github-copilot-enterprise': { monthly: 39 }
}
```

---

## 🧪 Testing Strategy

### Unit Tests
- Test each connector's authentication
- Test data transformation
- Test error handling

### Integration Tests
- Test with real API credentials (test accounts)
- Verify data accuracy
- Test sync scheduling

### Manual Testing
- Connect each provider
- Verify usage data appears correctly
- Check cost calculations

---

## 📝 Next Steps

### Immediate (This Week)
1. ✅ Complete Cursor CSV import
2. 🔄 Research GitHub Copilot API access
3. 🔄 Implement OpenAI connector
4. 🔄 Set up credential encryption

### Short Term (Next 2 Weeks)
1. Implement GitHub Copilot connector
2. Set up sync scheduler
3. Add connection management UI
4. Test with real data

### Medium Term (Next Month)
1. Anthropic connector (if API available)
2. Gemini connector
3. Codeium integration
4. Advanced analytics dashboard

---

**Last Updated:** October 15, 2025  
**Maintained By:** AICoder.Guru Team  
**Status:** 🔄 Active Development

