# Data Deduplication Solution

## Problem Statement

The application was experiencing **data aggregation distortion** due to duplicate imports:

1. **Same raw data** imported multiple times across different import sessions
2. **Aggregation inflation** - duplicate data inflated recent periods, making historical data appear diminished
3. **Chart distortion** - bar charts showed incorrect weights, with recent data over-represented
4. **No deduplication mechanism** - the system simply added new data to existing aggregations without checking for duplicates

### Example Scenario
```
Import 1: May 24, 2025 01:50 PM - claude-3.5-sonnet - 5 requests - $0.20
Import 2: May 24, 2025 01:50 PM - claude-3.5-sonnet - 5 requests - $0.20  ← DUPLICATE

Result: Aggregation shows 10 requests and $0.40 for that minute (WRONG!)
```

## Solution Overview

Implemented a **content-based deduplication system** with:

1. **Content Hash Generation** - Unique fingerprints for each data point
2. **Duplicate Detection** - Identifies identical data across imports
3. **Retrospective Cleanup** - Removes existing duplicates and rebuilds aggregations
4. **Prevention** - Prevents future duplicates during import

## Technical Implementation

### 1. Content Hash System

```typescript
function generateContentHash(usage: CursorUsage): string {
  const content = `${usage.date}|${usage.model}|${usage.status}|${usage.requests}|${usage.totalCost.toFixed(6)}`
  
  // Simple hash function
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}
```

**Key Features:**
- **Deterministic** - Same data always produces same hash
- **Content-based** - Based on actual data values, not metadata
- **Import-agnostic** - Ignores `importId` and `importedAt` timestamps
- **Precision-aware** - Uses `toFixed(6)` for cost consistency

### 2. Enhanced Data Structures

#### Raw Usage Document
```typescript
export interface RawUsageDocument extends CursorUsage {
  id: string
  userId: string
  importId: string
  sequence: number
  rawTimestamp: Timestamp
  importedAt: Timestamp
  contentHash: string // NEW: Content-based hash for deduplication
}
```

#### Aggregated Usage Document
```typescript
export interface AggregatedUsageDocument {
  id: string
  userId: string
  date: string // YYYY-MM-DD
  minute: string // YYYY-MM-DD HH:mm
  model: string
  status: string
  totalRequests: number
  totalCost: number
  costPerRequest: number
  entryCount: number
  uniqueHashes: string[] // NEW: Track which content hashes contributed
  lastUpdated: Timestamp
  createdAt: Timestamp
}
```

### 3. Deduplication Algorithm

#### Step 1: Analyze Existing Data
```typescript
// Get all raw usage data
const rawSnapshot = await getDocs(rawQuery)

// Group by content hash
const hashGroups = new Map<string, RawUsageDocument[]>()
rawSnapshot.docs.forEach(doc => {
  const data = doc.data() as RawUsageDocument
  const contentHash = data.contentHash || generateContentHash(data)
  
  if (!hashGroups.has(contentHash)) {
    hashGroups.set(contentHash, [])
  }
  hashGroups.get(contentHash)!.push(data)
})
```

#### Step 2: Identify Duplicates
```typescript
// Keep earliest import, mark rest for deletion
hashGroups.forEach((entries) => {
  if (entries.length > 1) {
    // Sort by import timestamp, keep the earliest
    entries.sort((a, b) => a.importedAt.toMillis() - b.importedAt.toMillis())
    toKeep.add(entries[0].id)
    
    // Mark the rest for deletion
    for (let i = 1; i < entries.length; i++) {
      toDelete.add(entries[i].id)
    }
  } else {
    toKeep.add(entries[0].id)
  }
})
```

#### Step 3: Rebuild Aggregations
```typescript
// Clear existing aggregations
aggSnapshot.docs.forEach(doc => {
  batch.delete(doc.ref)
})

// Rebuild from deduplicated data
allRawData
  .filter(entry => toKeep.has(entry.id))
  .forEach(entry => {
    const contentHash = entry.contentHash || generateContentHash(entry)
    const aggKey = generateAggregationKey(entry.date, entry.model, entry.status)
    
    // Aggregate the clean data
    const agg = aggregations.get(aggKey)!
    agg.totalRequests += entry.requests
    agg.totalCost += entry.totalCost
    agg.entryCount += 1
    agg.uniqueHashes.add(contentHash)
  })
```

### 4. Import Prevention

During new imports, the system now:

1. **Generates content hashes** for incoming data
2. **Queries existing hashes** in batches (Firestore 'in' limit is 10)
3. **Skips duplicates** and only saves new data
4. **Updates aggregations** with only truly new entries

```typescript
// Check for existing duplicates
for (let i = 0; i < uniqueHashes.length; i += 10) {
  const batch = uniqueHashes.slice(i, i + 10)
  if (batch.length > 0) {
    const batchQuery = query(
      getUserRawUsageCollection(userId),
      where('contentHash', 'in', batch)
    )
    const snapshot = await getDocs(batchQuery)
    snapshot.docs.forEach(doc => {
      const data = doc.data() as RawUsageDocument
      if (data.contentHash) {
        existingHashes.add(data.contentHash)
      }
    })
  }
}

// Skip duplicates during import
usageData.forEach((usage, index) => {
  const contentHash = generateContentHash(usage)
  
  if (existingHashes.has(contentHash)) {
    results.duplicates++
    return // Skip this entry
  }
  
  // Save only new data...
})
```

## User Interface

### Account Settings Integration

Added a **Data Management** section to Account Settings with:

- **Warning indicator** - Amber warning box explaining the action
- **One-click deduplication** - "Remove Duplicates" button
- **Progress feedback** - Loading spinner during operation
- **Results display** - Shows detailed deduplication statistics

### Deduplication Results

The UI displays comprehensive results:
```
• Total raw entries: 1,247
• Duplicates removed: 623
• Unique entries kept: 624
• Aggregations rebuilt: 156
• Errors: 0
```

## Benefits

### 1. **Data Integrity**
- ✅ Eliminates duplicate data inflation
- ✅ Accurate aggregations reflect true usage
- ✅ Historical data properly weighted

### 2. **Chart Accuracy**
- ✅ Bar charts show correct proportions
- ✅ Recent data no longer artificially inflated
- ✅ Historical trends accurately represented

### 3. **Retrospective Cleanup**
- ✅ Fixes existing duplicate data
- ✅ Rebuilds all aggregations from clean data
- ✅ One-time operation to clean up past issues

### 4. **Future Prevention**
- ✅ Prevents new duplicates during import
- ✅ Maintains data integrity going forward
- ✅ Provides feedback on skipped duplicates

## Usage Instructions

### For Users with Existing Duplicate Data

1. **Open Account Settings** - Click your profile icon
2. **Navigate to Data Management** - Scroll to the amber warning section
3. **Click "Remove Duplicates"** - This will:
   - Analyze all your raw data
   - Remove duplicate entries
   - Rebuild aggregations from clean data
   - Show detailed results

### For New Imports

The system now automatically:
- Detects duplicates during CSV import
- Shows count of duplicates skipped
- Only adds truly new data to aggregations

## Technical Notes

### Performance Considerations

1. **Batch Operations** - Uses Firestore batch writes for efficiency
2. **Query Limits** - Handles Firestore 'in' query limits (max 10 items)
3. **Memory Efficient** - Processes data in chunks to avoid memory issues

### Data Safety

1. **Keeps Earliest Import** - Preserves the first occurrence of duplicate data
2. **Atomic Operations** - Uses batch writes to ensure consistency
3. **Error Handling** - Comprehensive error reporting and recovery

### Firestore Indexes

Required indexes for efficient queries:
```json
{
  "collectionGroup": "rawUsage",
  "fields": [
    {"fieldPath": "userId", "order": "ASCENDING"},
    {"fieldPath": "contentHash", "order": "ASCENDING"}
  ]
}
```

## Future Enhancements

1. **Crypto Hash** - Could use `crypto.subtle.digest` for better hash distribution
2. **Incremental Cleanup** - Process large datasets in smaller chunks
3. **Duplicate Prevention UI** - Show duplicate detection during CSV upload
4. **Data Validation** - Additional checks for data consistency

## Conclusion

This deduplication solution provides:
- **Complete data integrity** for both existing and future data
- **User-friendly interface** for one-click cleanup
- **Robust prevention** of future duplicate issues
- **Comprehensive feedback** on deduplication results

The implementation ensures that your Cursor usage analytics are accurate and reliable, with proper weighting of historical vs. recent data. 