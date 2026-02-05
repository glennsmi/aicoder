# Pricing Migration Plan: Per 1K → Per 1M Tokens

**Date:** October 16, 2025  
**Status:** 📋 Planning Phase  
**Priority:** High - Industry Standard Compliance

---

## 🎯 Objective

Migrate the entire application from **per 1,000 tokens** pricing to **per 1,000,000 tokens** (1M) pricing to align with industry standards and keep numbers sensible.

---

## 📊 Current State Analysis

### Core Calculation (BaseConnector.ts)
```typescript
// CURRENT (Per 1K tokens):
const inputCost = (inputTokens / 1000) * pricing.inputPrice
```

### Connector Pricing Storage

1. **OpenAI** - Just updated to per 1M, then divided by 1000 ❌
2. **Anthropic** - Stored as per 1M, then divided by 1000 at calculation ❌
3. **GitHub Copilot** - Per-seat pricing (no change needed) ✅

---

## 🔧 Migration Steps

### Phase 1: Update Base Calculation ✅
**File:** `functions/src/connectors/BaseConnector.ts`

**Change:**
```typescript
// BEFORE:
protected calculateTokenCost(
  inputTokens: number,
  outputTokens: number,
  cachedTokens: number = 0,
  pricing: {
    inputPrice: number  // per 1K tokens
    outputPrice: number
    cachedPrice?: number
  }
): number {
  const inputCost = (inputTokens / 1000) * pricing.inputPrice
  const outputCost = (outputTokens / 1000) * pricing.outputPrice
  const cachedCost = cachedTokens > 0 && pricing.cachedPrice 
    ? (cachedTokens / 1000) * pricing.cachedPrice 
    : 0

  return inputCost + outputCost + cachedCost
}

// AFTER:
protected calculateTokenCost(
  inputTokens: number,
  outputTokens: number,
  cachedTokens: number = 0,
  pricing: {
    inputPrice: number  // per 1M tokens
    outputPrice: number
    cachedPrice?: number
  }
): number {
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPrice
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPrice
  const cachedCost = cachedTokens > 0 && pricing.cachedPrice 
    ? (cachedTokens / 1_000_000) * pricing.cachedPrice 
    : 0

  return inputCost + outputCost + cachedCost
}
```

**Documentation Update:**
```typescript
/**
 * Helper: Calculate cost from tokens and pricing
 * @param inputTokens Number of input tokens
 * @param outputTokens Number of output tokens
 * @param cachedTokens Number of cached tokens (optional)
 * @param pricing Pricing per 1,000,000 tokens (industry standard)
 * @returns Total cost in USD
 */
```

---

### Phase 2: Update OpenAI Connector ✅
**File:** `functions/src/connectors/OpenAIConnector.ts`

**Change:**
```typescript
// BEFORE:
private static readonly PRICING = {
  'gpt-5': { input: 1.25 / 1000, output: 10.00 / 1000, cached: 0.125 / 1000 },
  // ...
}

// AFTER:
private static readonly PRICING = {
  // GPT-5 Series - Prices per 1M tokens
  'gpt-5': { input: 1.25, output: 10.00, cached: 0.125 },
  'gpt-5-mini': { input: 0.25, output: 2.00, cached: 0.025 },
  'gpt-5-nano': { input: 0.05, output: 0.40, cached: 0.005 },
  'gpt-5-chat-latest': { input: 1.25, output: 10.00, cached: 0.125 },
  'gpt-5-codex': { input: 1.25, output: 10.00, cached: 0.125 },
  'gpt-5-pro': { input: 15.00, output: 120.00 },
  
  // GPT-4.1 Series - Prices per 1M tokens
  'gpt-4.1': { input: 2.00, output: 8.00, cached: 0.50 },
  'gpt-4.1-mini': { input: 0.40, output: 1.60, cached: 0.10 },
  'gpt-4.1-nano': { input: 0.10, output: 0.40, cached: 0.025 },
  
  // GPT-4o Series - Prices per 1M tokens
  'gpt-4o': { input: 2.50, output: 10.00, cached: 1.25 },
  'gpt-4o-2024-11-20': { input: 2.50, output: 10.00, cached: 1.25 },
  'gpt-4o-2024-08-06': { input: 2.50, output: 10.00, cached: 1.25 },
  'gpt-4o-2024-05-13': { input: 5.00, output: 15.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60, cached: 0.075 },
  
  // ... (all other models)
  currency: 'USD'
}
```

**Remove division by 1000** from all pricing entries.

**Update comment:**
```typescript
// OpenAI model pricing (per 1M tokens - industry standard)
// Updated: October 2025 - Source: https://platform.openai.com/docs/pricing
```

**Remove conversion** in `fetchUsage()` method - prices are already per 1M:
```typescript
// BEFORE:
const cost = this.calculateTokenCost(
  inputTokens,
  outputTokens,
  0,
  {
    inputPrice: pricing.input,
    outputPrice: pricing.output
  }
)

// AFTER: (no change needed, just ensure pricing is per 1M)
const cost = this.calculateTokenCost(
  inputTokens,
  outputTokens,
  0,
  {
    inputPrice: pricing.input,  // Already per 1M
    outputPrice: pricing.output
  }
)
```

---

### Phase 3: Update Anthropic Usage Connector ✅
**File:** `functions/src/connectors/AnthropicUsageConnector.ts`

**Change:**
```typescript
// BEFORE:
private static readonly PRICING = {
  'claude-3-opus-20240229': { input: 15, output: 75 },
  'claude-3-sonnet-20240229': { input: 3, output: 15 },
  // ... (already per 1M)
}

// In fetchUsage():
const cost = this.calculateTokenCost(
  inputTokens,
  outputTokens,
  cachedTokens,
  {
    inputPrice: pricing.input / 1000, // ❌ Remove this conversion
    outputPrice: pricing.output / 1000,
    cachedPrice: pricing.cached ? pricing.cached / 1000 : undefined
  }
)

// AFTER:
const cost = this.calculateTokenCost(
  inputTokens,
  outputTokens,
  cachedTokens,
  {
    inputPrice: pricing.input,  // Already per 1M
    outputPrice: pricing.output,
    cachedPrice: pricing.cached
  }
)
```

**Update comment:**
```typescript
// Anthropic model pricing (per 1M tokens - industry standard)
```

---

### Phase 4: Update Anthropic Code Connector ✅
**File:** `functions/src/connectors/AnthropicCodeConnector.ts`

**Same changes as Phase 3:**
- Remove `/1000` division in `calculateTokenCost()` calls
- Update comment to clarify per 1M tokens
- Pricing object already correct (per 1M)

---

### Phase 5: Update GitHub Copilot Connector ✅
**File:** `functions/src/connectors/GitHubCopilotConnector.ts`

**No changes needed** - Uses per-seat pricing, not token-based.

---

### Phase 6: Update Type Definitions 📝
**File:** `shared/src/types/apiConnections.ts`

**Add documentation:**
```typescript
// Provider-specific pricing models
export interface ProviderPricing {
  provider: AIProvider
  models: {
    [modelName: string]: {
      inputTokenPrice: number  // Per 1,000,000 tokens (industry standard)
      outputTokenPrice: number // Per 1,000,000 tokens
      cachedTokenPrice?: number // Per 1,000,000 tokens
      currency: string
    }
  }
  perSeatPricing?: {
    price: number
    currency: string
    billingCycle: 'monthly' | 'yearly'
  }
}
```

---

### Phase 7: Update Frontend Display 📊
**Files to check:**
- `frontend/src/components/CursorUsageChart.tsx`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/CursorCostsPage.tsx`
- Any component that displays token counts or costs

**Considerations:**
- Display tokens in appropriate format (1M, 1K, etc.)
- Show pricing with proper decimals
- Add tooltips: "Pricing shown per 1M tokens"
- Format large numbers: `1,234,567 tokens (1.23M)`

**Example:**
```typescript
// Helper function to add
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(2)}M`
  } else if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(2)}K`
  }
  return tokens.toString()
}

export function formatCost(cost: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(cost)
}
```

---

### Phase 8: Update Documentation 📚

**Files to update:**
1. `plans/docs/API_INTEGRATIONS.md`
   - Update cost calculation examples
   - Update pricing model documentation

2. `plans/docs/task-reports/251015_2330_api_integrations_implementation.md`
   - Update pricing examples

3. `README.md` (if exists)
   - Update pricing information

4. Inline code comments
   - Ensure all pricing-related comments say "per 1M tokens"

---

## ✅ Testing Checklist

### Unit Tests
- [ ] Test BaseConnector.calculateTokenCost() with known values
- [ ] Verify 1M tokens × $1.25 = $1.25
- [ ] Verify 1K tokens × $1.25 = $0.00125
- [ ] Test with cached tokens

### Integration Tests
- [ ] OpenAI connector calculates correct costs
- [ ] Anthropic Usage connector calculates correct costs
- [ ] Anthropic Code connector calculates correct costs
- [ ] Test with real API responses (if available)

### Frontend Tests
- [ ] Token counts display correctly
- [ ] Costs display with proper decimals
- [ ] Charts show accurate data
- [ ] Export/CSV has correct values

### Manual Verification
- [ ] Create test data with known token counts
- [ ] Verify calculated costs match expected values
- [ ] Check dashboard displays
- [ ] Verify CSV uploads still work correctly

---

## 📋 Implementation Order

### Step 1: Backend (Cloud Functions) - **30 minutes**
1. Update `BaseConnector.ts` (5 min)
2. Update `OpenAIConnector.ts` (10 min)
3. Update `AnthropicUsageConnector.ts` (5 min)
4. Update `AnthropicCodeConnector.ts` (5 min)
5. Update type definitions comments (5 min)

### Step 2: Test Backend - **15 minutes**
1. Run TypeScript build
2. Test calculations manually
3. Verify no breaking changes

### Step 3: Frontend Updates - **20 minutes**
1. Check existing CSV parsing logic
2. Update display formatters (if needed)
3. Add helper functions for formatting
4. Update tooltips/labels

### Step 4: Documentation - **10 minutes**
1. Update all docs
2. Update inline comments
3. Create migration notes

### Step 5: Testing - **20 minutes**
1. Manual testing with sample data
2. Verify dashboard calculations
3. Test CSV upload/download
4. Check edge cases (very small/large numbers)

### Step 6: Deploy - **10 minutes**
1. Build functions: `npm run build`
2. Build frontend: `npm run build`
3. Deploy: `firebase deploy`
4. Verify production

**Total Estimated Time: 1.5-2 hours**

---

## 🔢 Example Calculations (Before/After)

### Before (Per 1K tokens):
```
Model: GPT-5
Input tokens: 1,000,000
Price per 1K: $0.00125
Calculation: (1,000,000 / 1,000) × $0.00125 = $1.25 ✅
```

### After (Per 1M tokens):
```
Model: GPT-5
Input tokens: 1,000,000
Price per 1M: $1.25
Calculation: (1,000,000 / 1,000,000) × $1.25 = $1.25 ✅
```

### Small Request Example:
```
Input tokens: 1,500
Price per 1M: $1.25

Calculation: (1,500 / 1,000,000) × $1.25 = $0.001875 ✅

Display: "$0.0019" or "~$0.002"
```

---

## 🚨 Breaking Changes

### None Expected ✅
- All calculations happen in backend
- Frontend just displays results
- Database stores raw token counts and calculated costs
- No data migration needed

### Potential Issues
1. **Rounding differences** - Very minor (< $0.001)
2. **Display formatting** - May need adjustment for very small costs
3. **CSV exports** - Verify cost column accuracy

---

## 📊 Files to Modify

### Backend (Cloud Functions)
1. ✅ `functions/src/connectors/BaseConnector.ts` - Core calculation
2. ✅ `functions/src/connectors/OpenAIConnector.ts` - Remove /1000 divisions
3. ✅ `functions/src/connectors/AnthropicUsageConnector.ts` - Remove /1000 divisions
4. ✅ `functions/src/connectors/AnthropicCodeConnector.ts` - Remove /1000 divisions
5. 📝 `functions/src/connectors/GitHubCopilotConnector.ts` - No changes (per-seat)

### Types
6. 📝 `shared/src/types/apiConnections.ts` - Update comments

### Frontend (if needed)
7. 🔍 `frontend/src/components/CursorUsageChart.tsx` - Check display
8. 🔍 `frontend/src/pages/DashboardPage.tsx` - Check display
9. 🔍 `frontend/src/pages/CursorCostsPage.tsx` - Check CSV parsing
10. 🔍 `frontend/src/hooks/useUserUsageData.ts` - Check calculations

### Documentation
11. 📝 `plans/docs/API_INTEGRATIONS.md`
12. 📝 `plans/docs/task-reports/251015_2330_api_integrations_implementation.md`
13. 📝 `claude.md` - Update development notes

---

## 🎯 Success Criteria

- ✅ All pricing stored as per 1M tokens
- ✅ BaseConnector divides by 1,000,000
- ✅ All connectors pass pricing without conversion
- ✅ TypeScript builds without errors
- ✅ Manual cost calculations match expected values
- ✅ Frontend displays costs correctly
- ✅ CSV import/export works correctly
- ✅ Documentation updated

---

## 🚀 Deployment Strategy

1. **Development:** Make changes, test locally
2. **Staging:** Deploy to staging environment (if available)
3. **Validation:** Run test suite
4. **Production:** Deploy to production
5. **Monitor:** Watch for calculation errors in first 24 hours

---

## 📝 Migration Notes

**Version:** v2.0.0 (Pricing Migration)  
**Date:** October 16, 2025  
**Breaking:** No breaking changes for end users  
**Action Required:** None - automatic migration

---

**Ready to implement?** Let's start with Phase 1! 🚀


