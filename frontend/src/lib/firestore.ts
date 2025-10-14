import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  Timestamp,
  doc,
  writeBatch,
  where,
  limit
} from 'firebase/firestore'
import { db } from '../config/firebaseApp'
import { CursorUsage } from '@shared'

export interface RawUsageDocument extends CursorUsage {
  id: string
  userId: string
  importId: string
  sequence: number
  rawTimestamp: Timestamp
  importedAt: Timestamp
  contentHash: string // NEW: Content-based hash for deduplication
}

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
  entryCount: number // How many raw entries contributed to this
  uniqueHashes: string[] // NEW: Track which content hashes contributed
  lastUpdated: Timestamp
  createdAt: Timestamp
}

// Generate content-based hash for deduplication
function generateContentHash(usage: CursorUsage): string {
  // Create a deterministic hash based on the actual data content
  // This ensures identical data gets the same hash regardless of import
  const content = `${usage.date}|${usage.model}|${usage.status}|${usage.requests}|${usage.totalCost.toFixed(6)}`
  
  // Simple hash function (you could use crypto.subtle.digest for better hashing)
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

// Get user's raw usage collection reference
export function getUserRawUsageCollection(userId: string) {
  return collection(db, 'users', userId, 'rawUsage')
}

// Get user's aggregated usage collection reference
export function getUserAggregatedUsageCollection(userId: string) {
  return collection(db, 'users', userId, 'aggregatedUsage')
}

// Generate aggregation key
function generateAggregationKey(date: string, model: string, status: string): string {
  const parsedDate = new Date(date)
  const dateStr = parsedDate.toISOString().split('T')[0] // YYYY-MM-DD
  const hour = parsedDate.getHours().toString().padStart(2, '0')
  const minute = parsedDate.getMinutes().toString().padStart(2, '0')
  const minuteStr = `${dateStr} ${hour}:${minute}`
  
  return `${dateStr}|${minuteStr}|${model}|${status}`
}

// Generate unique ID for raw usage entry
export function generateRawUsageId(importId: string, sequence: number): string {
  return `${importId}_${sequence.toString().padStart(6, '0')}`
}

// NEW: Deduplicate raw usage data and rebuild aggregations
export async function deduplicateAndRebuildAggregations(userId: string): Promise<{
  totalRawEntries: number
  duplicatesRemoved: number
  uniqueEntries: number
  aggregationsRebuilt: number
  errors: string[]
}> {
  console.log('🔄 Starting deduplication and aggregation rebuild for user:', userId)
  
  const results = {
    totalRawEntries: 0,
    duplicatesRemoved: 0,
    uniqueEntries: 0,
    aggregationsRebuilt: 0,
    errors: [] as string[]
  }

  try {
    // Step 1: Get all raw usage data
    console.log('📊 Fetching all raw usage data...')
    const rawQuery = query(getUserRawUsageCollection(userId), orderBy('rawTimestamp', 'asc'))
    const rawSnapshot = await getDocs(rawQuery)
    
    results.totalRawEntries = rawSnapshot.docs.length
    console.log(`Found ${results.totalRawEntries} raw entries`)

    if (results.totalRawEntries === 0) {
      return results
    }

    // Step 2: Group by content hash and identify duplicates
    console.log('🔍 Analyzing for duplicates...')
    const hashGroups = new Map<string, RawUsageDocument[]>()
    const allRawData: RawUsageDocument[] = []

    rawSnapshot.docs.forEach(doc => {
      const data = doc.data() as RawUsageDocument
      allRawData.push(data)
      
      // Generate content hash if not present
      const contentHash = data.contentHash || generateContentHash(data)
      
      if (!hashGroups.has(contentHash)) {
        hashGroups.set(contentHash, [])
      }
      hashGroups.get(contentHash)!.push(data)
    })

    // Step 3: Identify duplicates and keep earliest import
    console.log('🧹 Identifying duplicates to remove...')
    const toKeep = new Set<string>()
    const toDelete = new Set<string>()

    hashGroups.forEach((entries) => {
      if (entries.length > 1) {
        // Sort by import timestamp, keep the earliest
        entries.sort((a, b) => a.importedAt.toMillis() - b.importedAt.toMillis())
        toKeep.add(entries[0].id)
        
        // Mark the rest for deletion
        for (let i = 1; i < entries.length; i++) {
          toDelete.add(entries[i].id)
        }
        
        results.duplicatesRemoved += entries.length - 1
      } else {
        toKeep.add(entries[0].id)
      }
    })

    results.uniqueEntries = toKeep.size

    console.log(`📈 Deduplication summary:`)
    console.log(`  - Total entries: ${results.totalRawEntries}`)
    console.log(`  - Duplicates to remove: ${results.duplicatesRemoved}`)
    console.log(`  - Unique entries to keep: ${results.uniqueEntries}`)

    // Step 4: Delete duplicate raw entries and rebuild aggregations
    const batch = writeBatch(db)
    const now = Timestamp.now()

    // Delete duplicate raw entries
    console.log('🗑️ Removing duplicate raw entries...')
    toDelete.forEach(id => {
      const docRef = doc(getUserRawUsageCollection(userId), id)
      batch.delete(docRef)
    })

    // Step 5: Clear existing aggregations
    console.log('🧽 Clearing existing aggregations...')
    const aggQuery = query(getUserAggregatedUsageCollection(userId))
    const aggSnapshot = await getDocs(aggQuery)
    
    aggSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref)
    })

    // Step 6: Rebuild aggregations from deduplicated data
    console.log('🏗️ Rebuilding aggregations from clean data...')
    const aggregations = new Map<string, {
      date: string
      minute: string
      model: string
      status: string
      totalRequests: number
      totalCost: number
      entryCount: number
      uniqueHashes: Set<string>
    }>()

    // Process only the entries we're keeping
    allRawData
      .filter(entry => toKeep.has(entry.id))
      .forEach(entry => {
        const contentHash = entry.contentHash || generateContentHash(entry)
        const aggKey = generateAggregationKey(entry.date, entry.model, entry.status)
        
        if (!aggregations.has(aggKey)) {
          const parsedDate = new Date(entry.date)
          const dateStr = parsedDate.toISOString().split('T')[0]
          const hour = parsedDate.getHours().toString().padStart(2, '0')
          const minute = parsedDate.getMinutes().toString().padStart(2, '0')
          const minuteStr = `${dateStr} ${hour}:${minute}`

          aggregations.set(aggKey, {
            date: dateStr,
            minute: minuteStr,
            model: entry.model,
            status: entry.status,
            totalRequests: 0,
            totalCost: 0,
            entryCount: 0,
            uniqueHashes: new Set()
          })
        }

        const agg = aggregations.get(aggKey)!
        agg.totalRequests += entry.requests
        agg.totalCost += entry.totalCost
        agg.entryCount += 1
        agg.uniqueHashes.add(contentHash)
      })

    // Save new aggregations
    aggregations.forEach((agg, key) => {
      const aggDocRef = doc(getUserAggregatedUsageCollection(userId), key.replace(/[|:]/g, '_'))
      
      const aggDoc: AggregatedUsageDocument = {
        id: key.replace(/[|:]/g, '_'),
        userId,
        date: agg.date,
        minute: agg.minute,
        model: agg.model,
        status: agg.status,
        totalRequests: agg.totalRequests,
        totalCost: agg.totalCost,
        costPerRequest: agg.totalCost / agg.totalRequests,
        entryCount: agg.entryCount,
        uniqueHashes: Array.from(agg.uniqueHashes),
        lastUpdated: now,
        createdAt: now
      }

      batch.set(aggDocRef, aggDoc)
    })

    results.aggregationsRebuilt = aggregations.size

    // Step 7: Update remaining raw entries with content hashes
    console.log('🏷️ Adding content hashes to remaining raw entries...')
    allRawData
      .filter(entry => toKeep.has(entry.id) && !entry.contentHash)
      .forEach(entry => {
        const docRef = doc(getUserRawUsageCollection(userId), entry.id)
        const contentHash = generateContentHash(entry)
        batch.update(docRef, { contentHash })
      })

    // Commit all changes
    console.log('💾 Committing all changes...')
    await batch.commit()

    console.log('✅ Deduplication and rebuild completed successfully!')
    console.log(`📊 Final summary:`)
    console.log(`  - Removed ${results.duplicatesRemoved} duplicate entries`)
    console.log(`  - Rebuilt ${results.aggregationsRebuilt} aggregation periods`)

  } catch (error: any) {
    console.error('❌ Error during deduplication:', error)
    results.errors.push(`Deduplication error: ${error.message}`)
  }

  return results
}

// Save raw usage data and update aggregations (APPEND-ONLY with temporal deduplication)
export async function saveUserUsageData(userId: string, usageData: CursorUsage[]): Promise<{
  saved: number
  duplicates: number
  errors: string[]
}> {
  console.log('Saving usage data for user:', userId, 'entries:', usageData.length)
  
  const results = {
    saved: 0,
    duplicates: 0,
    errors: [] as string[]
  }

  if (usageData.length === 0) {
    return results
  }

  try {
    const importId = `import_${Date.now()}`
    const batch = writeBatch(db)
    const now = Timestamp.now()

    // Step 1: Find the latest timestamp in existing data (append-only logic)
    console.log('🔍 Finding latest existing timestamp for append-only import...')
    const latestQuery = query(
      getUserRawUsageCollection(userId),
      orderBy('rawTimestamp', 'desc'),
      limit(1)
    )
    const latestSnapshot = await getDocs(latestQuery)
    
    let latestExistingTimestamp: Date | null = null
    if (!latestSnapshot.empty) {
      const latestDoc = latestSnapshot.docs[0].data() as RawUsageDocument
      latestExistingTimestamp = new Date(latestDoc.date)
      console.log(`Latest existing data timestamp: ${latestExistingTimestamp.toISOString()}`)
    } else {
      console.log('No existing data found - this is the first import')
    }

    // Step 2: Filter incoming data for append-only behavior
    // Accept all data newer than latest, plus overlap window for incomplete minutes
    let overlapData: CursorUsage[] = []
    let newData: CursorUsage[] = []
    
    if (!latestExistingTimestamp) {
      // No existing data, accept all
      newData = usageData
      console.log('No existing data - accepting all entries')
    } else {
      // Create overlap window: 1 minute before latest timestamp
      const overlapWindow = new Date(latestExistingTimestamp.getTime() - (1 * 60 * 1000))
      
      usageData.forEach(usage => {
        const usageDate = new Date(usage.date)
        
        if (usageDate > latestExistingTimestamp) {
          // Definitely new data
          newData.push(usage)
        } else if (usageDate >= overlapWindow) {
          // In overlap window - might be new data for incomplete minute
          overlapData.push(usage)
        } else {
          // Historical data - skip
          results.duplicates++
          console.log(`Skipping historical entry: ${usage.date} (before ${overlapWindow.toISOString()})`)
        }
      })
      
      console.log(`Found ${newData.length} definitely new entries`)
      console.log(`Found ${overlapData.length} entries in overlap window`)
    }

    // Step 3: For overlap data, check if we already have it using content hashes
    let finalNewData = [...newData]
    
    if (overlapData.length > 0) {
      console.log('🔍 Checking overlap data for existing content...')
      const overlapHashes = overlapData.map(usage => generateContentHash(usage))
      const uniqueOverlapHashes = [...new Set(overlapHashes)]
      
      let existingOverlapHashes = new Set<string>()
      
      // Query existing data in overlap window for content hashes
      for (let i = 0; i < uniqueOverlapHashes.length; i += 10) {
        const batch = uniqueOverlapHashes.slice(i, i + 10)
        if (batch.length > 0) {
          const batchQuery = query(
            getUserRawUsageCollection(userId),
            where('contentHash', 'in', batch)
          )
          const snapshot = await getDocs(batchQuery)
          snapshot.docs.forEach(doc => {
            const data = doc.data() as RawUsageDocument
            if (data.contentHash) {
              existingOverlapHashes.add(data.contentHash)
            }
          })
        }
      }
      
      // Filter overlap data to only include truly new content
      overlapData.forEach(usage => {
        const contentHash = generateContentHash(usage)
        if (!existingOverlapHashes.has(contentHash)) {
          finalNewData.push(usage)
          console.log(`Adding overlap entry: ${usage.date} (new content)`)
        } else {
          results.duplicates++
          console.log(`Skipping overlap entry: ${usage.date} (duplicate content)`)
        }
      })
    }

    console.log(`Final result: ${finalNewData.length} entries to save, ${results.duplicates} duplicates skipped`)

    // Step 3: Save only new raw data (append-only)
    console.log('💾 Saving new raw usage data...')
    const newAggregations = new Map<string, {
      date: string
      minute: string
      model: string
      status: string
      totalRequests: number
      totalCost: number
      entryCount: number
      uniqueHashes: Set<string>
    }>()
    
    finalNewData.forEach((usage: CursorUsage, index: number) => {
      try {
        const contentHash = generateContentHash(usage)

        const rawId = generateRawUsageId(importId, index)
        const rawDocRef = doc(getUserRawUsageCollection(userId), rawId)
        
        const rawDoc: RawUsageDocument = {
          ...usage,
          id: rawId,
          userId,
          importId,
          sequence: index,
          rawTimestamp: now,
          importedAt: now,
          contentHash
        }

        batch.set(rawDocRef, rawDoc)
        results.saved++

        // Prepare aggregation data
        const aggKey = generateAggregationKey(usage.date, usage.model, usage.status)
        
        if (!newAggregations.has(aggKey)) {
          const parsedDate = new Date(usage.date)
          const dateStr = parsedDate.toISOString().split('T')[0]
          const hour = parsedDate.getHours().toString().padStart(2, '0')
          const minute = parsedDate.getMinutes().toString().padStart(2, '0')
          const minuteStr = `${dateStr} ${hour}:${minute}`

          newAggregations.set(aggKey, {
            date: dateStr,
            minute: minuteStr,
            model: usage.model,
            status: usage.status,
            totalRequests: 0,
            totalCost: 0,
            entryCount: 0,
            uniqueHashes: new Set()
          })
        }

        const agg = newAggregations.get(aggKey)!
        agg.totalRequests += usage.requests
        agg.totalCost += usage.totalCost
        agg.entryCount += 1
        agg.uniqueHashes.add(contentHash)

      } catch (error) {
        console.error('Error processing raw usage entry:', error)
        results.errors.push(`Error processing raw entry ${index}: ${error}`)
      }
    })

    // Step 4: Update aggregations with new data only
    console.log('📊 Updating aggregations with new data...')
    const existingAggQuery = query(getUserAggregatedUsageCollection(userId))
    const existingAggSnapshot = await getDocs(existingAggQuery)
    
    const existingAggregations = new Map<string, AggregatedUsageDocument>()
    existingAggSnapshot.docs.forEach(doc => {
      const data = doc.data() as AggregatedUsageDocument
      const key = generateAggregationKey(
        `${data.date} ${data.minute.split(' ')[1]}:00`,
        data.model, 
        data.status
      )
      existingAggregations.set(key, data)
    })

    // Merge new aggregations with existing ones
    for (const [key, newAgg] of newAggregations) {
      try {
        const aggDocRef = doc(getUserAggregatedUsageCollection(userId), key.replace(/[|:]/g, '_'))
        
        let finalAgg: AggregatedUsageDocument
        
        if (existingAggregations.has(key)) {
          // Merge with existing (only add truly new data)
          const existing = existingAggregations.get(key)!
          const existingHashSet = new Set(existing.uniqueHashes || [])
          
          // Only add hashes that don't already exist
          const newUniqueHashes = Array.from(newAgg.uniqueHashes).filter(hash => !existingHashSet.has(hash))
          
          if (newUniqueHashes.length > 0) {
            finalAgg = {
              ...existing,
              totalRequests: existing.totalRequests + newAgg.totalRequests,
              totalCost: existing.totalCost + newAgg.totalCost,
              entryCount: existing.entryCount + newAgg.entryCount,
              uniqueHashes: [...(existing.uniqueHashes || []), ...newUniqueHashes],
              lastUpdated: now
            }
            finalAgg.costPerRequest = finalAgg.totalCost / finalAgg.totalRequests
            batch.set(aggDocRef, finalAgg)
          }
        } else {
          // Create new aggregation
          finalAgg = {
            id: key.replace(/[|:]/g, '_'),
            userId,
            ...newAgg,
            costPerRequest: newAgg.totalCost / newAgg.totalRequests,
            uniqueHashes: Array.from(newAgg.uniqueHashes),
            lastUpdated: now,
            createdAt: now
          }
          batch.set(aggDocRef, finalAgg)
        }
      } catch (error) {
        console.error('Error processing aggregation:', error)
        results.errors.push(`Error processing aggregation for ${key}: ${error}`)
      }
    }

    // Commit everything in one batch
    console.log('💾 Committing batch with deduplicated data...')
    await batch.commit()
    console.log('✅ Batch committed successfully')

    console.log(`📊 Import summary:`)
    console.log(`  - New entries saved: ${results.saved}`)
    console.log(`  - Duplicates skipped: ${results.duplicates}`)
    console.log(`  - Errors: ${results.errors.length}`)

  } catch (error: any) {
    console.error('❌ Batch write error:', error)
    results.errors.push(`Batch write error: ${error}`)
  }

  return results
}

// Get aggregated usage data for analytics (default view)
export async function getUserUsageData(userId: string): Promise<CursorUsage[]> {
  console.log('Fetching aggregated usage data for user:', userId)
  
  try {
    const aggQuery = query(
      getUserAggregatedUsageCollection(userId),
      orderBy('createdAt', 'desc')
    )
    
    console.log('Executing aggregated data query...')
    const snapshot = await getDocs(aggQuery)
    console.log('Query completed, aggregated documents found:', snapshot.docs.length)
    
    return snapshot.docs.map(doc => {
      const data = doc.data() as AggregatedUsageDocument
      // Convert back to CursorUsage format for compatibility
      return {
        id: data.id,
        date: `${data.date} ${data.minute.split(' ')[1]}:00`, // Reconstruct date
        model: data.model,
        status: data.status,
        requests: data.totalRequests,
        costPerRequest: data.costPerRequest,
        totalCost: data.totalCost
      }
    })
  } catch (error: any) {
    console.error('Error fetching aggregated usage data:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    throw error
  }
}

// Get raw usage data for detailed analysis
export async function getUserRawUsageData(userId: string): Promise<RawUsageDocument[]> {
  console.log('Fetching raw usage data for user:', userId)
  
  try {
    const rawQuery = query(
      getUserRawUsageCollection(userId),
      orderBy('rawTimestamp', 'desc')
    )
    
    const snapshot = await getDocs(rawQuery)
    console.log('Raw data query completed, documents found:', snapshot.docs.length)
    
    return snapshot.docs.map(doc => doc.data() as RawUsageDocument)
  } catch (error: any) {
    console.error('Error fetching raw usage data:', error)
    throw error
  }
}

// Get usage statistics for a user
export async function getUserUsageStats(userId: string): Promise<{
  totalEntries: number
  totalRequests: number
  totalCost: number
  oldestEntry?: string
  newestEntry?: string
  rawEntries: number
  aggregatedEntries: number
}> {
  try {
    const [usageData, rawData] = await Promise.all([
      getUserUsageData(userId),
      getUserRawUsageData(userId)
    ])
    
    if (usageData.length === 0) {
      return {
        totalEntries: 0,
        totalRequests: 0,
        totalCost: 0,
        rawEntries: rawData.length,
        aggregatedEntries: 0
      }
    }

    const totalRequests = usageData.reduce((sum, usage) => sum + usage.requests, 0)
    const totalCost = usageData.reduce((sum, usage) => sum + usage.totalCost, 0)
    
    // Sort by date to find oldest/newest
    const sortedByDate = [...usageData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    return {
      totalEntries: usageData.length,
      totalRequests,
      totalCost,
      oldestEntry: sortedByDate[0]?.date,
      newestEntry: sortedByDate[sortedByDate.length - 1]?.date,
      rawEntries: rawData.length,
      aggregatedEntries: usageData.length
    }
  } catch (error: any) {
    console.error('Error calculating usage stats:', error)
    throw error
  }
}

// ADMIN: Rebuild aggregations for any user from raw data (preserves all raw data)
export async function adminRebuildUserAggregations(userId: string): Promise<{
  totalRawEntries: number
  aggregationsCleared: number
  aggregationsRebuilt: number
  errors: string[]
}> {
  console.log('🔧 ADMIN: Starting aggregation rebuild for user:', userId)
  
  const results = {
    totalRawEntries: 0,
    aggregationsCleared: 0,
    aggregationsRebuilt: 0,
    errors: [] as string[]
  }

  try {
    // Step 1: Get all raw usage data for the user
    console.log('📊 Fetching all raw usage data...')
    const rawQuery = query(getUserRawUsageCollection(userId), orderBy('rawTimestamp', 'asc'))
    const rawSnapshot = await getDocs(rawQuery)
    
    results.totalRawEntries = rawSnapshot.docs.length
    console.log(`Found ${results.totalRawEntries} raw entries for user ${userId}`)

    if (results.totalRawEntries === 0) {
      console.log('No raw data found for user')
      return results
    }

    // Step 2: Clear existing aggregations
    console.log('🧽 Clearing existing aggregations...')
    const aggQuery = query(getUserAggregatedUsageCollection(userId))
    const aggSnapshot = await getDocs(aggQuery)
    
    results.aggregationsCleared = aggSnapshot.docs.length
    console.log(`Found ${results.aggregationsCleared} existing aggregations to clear`)

    const batch = writeBatch(db)
    const now = Timestamp.now()

    // Delete existing aggregations
    aggSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref)
    })

    // Step 3: Rebuild aggregations from raw data
    console.log('🏗️ Rebuilding aggregations from raw data...')
    const aggregations = new Map<string, {
      date: string
      minute: string
      model: string
      status: string
      totalRequests: number
      totalCost: number
      entryCount: number
      uniqueHashes: Set<string>
    }>()

    // Process all raw entries
    rawSnapshot.docs.forEach(doc => {
      const entry = doc.data() as RawUsageDocument
      
      // Generate content hash if not present
      const contentHash = entry.contentHash || generateContentHash(entry)
      const aggKey = generateAggregationKey(entry.date, entry.model, entry.status)
      
      if (!aggregations.has(aggKey)) {
        const parsedDate = new Date(entry.date)
        const dateStr = parsedDate.toISOString().split('T')[0]
        const hour = parsedDate.getHours().toString().padStart(2, '0')
        const minute = parsedDate.getMinutes().toString().padStart(2, '0')
        const minuteStr = `${dateStr} ${hour}:${minute}`

        aggregations.set(aggKey, {
          date: dateStr,
          minute: minuteStr,
          model: entry.model,
          status: entry.status,
          totalRequests: 0,
          totalCost: 0,
          entryCount: 0,
          uniqueHashes: new Set()
        })
      }

      const agg = aggregations.get(aggKey)!
      agg.totalRequests += entry.requests
      agg.totalCost += entry.totalCost
      agg.entryCount += 1
      agg.uniqueHashes.add(contentHash)
    })

    // Save new aggregations
    aggregations.forEach((agg, key) => {
      const aggDocRef = doc(getUserAggregatedUsageCollection(userId), key.replace(/[|:]/g, '_'))
      
      const aggDoc: AggregatedUsageDocument = {
        id: key.replace(/[|:]/g, '_'),
        userId,
        date: agg.date,
        minute: agg.minute,
        model: agg.model,
        status: agg.status,
        totalRequests: agg.totalRequests,
        totalCost: agg.totalCost,
        costPerRequest: agg.totalCost / agg.totalRequests,
        entryCount: agg.entryCount,
        uniqueHashes: Array.from(agg.uniqueHashes),
        lastUpdated: now,
        createdAt: now
      }

      batch.set(aggDocRef, aggDoc)
    })

    results.aggregationsRebuilt = aggregations.size

    // Step 4: Update raw entries with content hashes if missing
    console.log('🏷️ Adding content hashes to raw entries...')
    rawSnapshot.docs.forEach(doc => {
      const entry = doc.data() as RawUsageDocument
      if (!entry.contentHash) {
        const contentHash = generateContentHash(entry)
        batch.update(doc.ref, { contentHash })
      }
    })

    // Commit all changes
    console.log('💾 Committing all changes...')
    await batch.commit()

    console.log('✅ ADMIN: Aggregation rebuild completed successfully!')
    console.log(`📊 Final summary:`)
    console.log(`  - Raw entries processed: ${results.totalRawEntries}`)
    console.log(`  - Old aggregations cleared: ${results.aggregationsCleared}`)
    console.log(`  - New aggregations created: ${results.aggregationsRebuilt}`)

  } catch (error: any) {
    console.error('❌ Error during admin aggregation rebuild:', error)
    results.errors.push(`Admin rebuild error: ${error.message}`)
  }

  return results
}

// DEBUG: Analyze content hashes for a user to understand deduplication issues
export async function debugContentHashes(userId: string): Promise<{
  totalRawEntries: number
  entriesWithHashes: number
  entriesWithoutHashes: number
  duplicateHashes: { hash: string, count: number, entries: any[] }[]
  sampleHashes: { hash: string, content: string, entry: any }[]
}> {
  console.log('🔍 DEBUG: Analyzing content hashes for user:', userId)
  
  try {
    // Get all raw usage data
    const rawQuery = query(getUserRawUsageCollection(userId), orderBy('rawTimestamp', 'desc'))
    const rawSnapshot = await getDocs(rawQuery)
    
    const results = {
      totalRawEntries: rawSnapshot.docs.length,
      entriesWithHashes: 0,
      entriesWithoutHashes: 0,
      duplicateHashes: [] as { hash: string, count: number, entries: any[] }[],
      sampleHashes: [] as { hash: string, content: string, entry: any }[]
    }

    const hashGroups = new Map<string, any[]>()
    
    rawSnapshot.docs.forEach(doc => {
      const entry = doc.data() as RawUsageDocument
      
      if (entry.contentHash) {
        results.entriesWithHashes++
      } else {
        results.entriesWithoutHashes++
      }
      
      // Generate content hash for analysis
      const contentHash = entry.contentHash || generateContentHash(entry)
      const content = `${entry.date}|${entry.model}|${entry.status}|${entry.requests}|${entry.totalCost.toFixed(6)}`
      
      if (!hashGroups.has(contentHash)) {
        hashGroups.set(contentHash, [])
      }
      hashGroups.get(contentHash)!.push({
        id: entry.id,
        importId: entry.importId,
        date: entry.date,
        model: entry.model,
        status: entry.status,
        requests: entry.requests,
        totalCost: entry.totalCost,
        importedAt: entry.importedAt?.toDate?.() || 'No timestamp'
      })
      
      // Add to sample hashes (first 10)
      if (results.sampleHashes.length < 10) {
        results.sampleHashes.push({
          hash: contentHash,
          content,
          entry: {
            id: entry.id,
            date: entry.date,
            model: entry.model,
            requests: entry.requests,
            totalCost: entry.totalCost
          }
        })
      }
    })

    // Find duplicates
    hashGroups.forEach((entries, hash) => {
      if (entries.length > 1) {
        results.duplicateHashes.push({
          hash,
          count: entries.length,
          entries: entries.sort((a, b) => new Date(a.importedAt).getTime() - new Date(b.importedAt).getTime())
        })
      }
    })

    // Sort duplicates by count (most duplicates first)
    results.duplicateHashes.sort((a, b) => b.count - a.count)

    console.log('🔍 DEBUG Results:')
    console.log(`  - Total raw entries: ${results.totalRawEntries}`)
    console.log(`  - Entries with hashes: ${results.entriesWithHashes}`)
    console.log(`  - Entries without hashes: ${results.entriesWithoutHashes}`)
    console.log(`  - Duplicate hash groups: ${results.duplicateHashes.length}`)
    console.log(`  - Total duplicate entries: ${results.duplicateHashes.reduce((sum, group) => sum + (group.count - 1), 0)}`)

    // Detailed logging for debugging
    console.log('\n📋 SAMPLE CONTENT HASHES:')
    results.sampleHashes.forEach((sample, index) => {
      console.log(`${index + 1}. Hash: ${sample.hash}`)
      console.log(`   Content: ${sample.content}`)
      console.log(`   Entry: ${JSON.stringify(sample.entry, null, 2)}`)
      console.log('   ---')
    })

    if (results.duplicateHashes.length > 0) {
      console.log('\n🔄 DUPLICATE GROUPS (Top 10):')
      results.duplicateHashes.slice(0, 10).forEach((group, index) => {
        console.log(`\n${index + 1}. Hash: ${group.hash} (${group.count} copies)`)
        group.entries.forEach((entry, entryIndex) => {
          console.log(`   Copy ${entryIndex + 1}:`)
          console.log(`     ID: ${entry.id}`)
          console.log(`     Import: ${entry.importId}`)
          console.log(`     Date: ${entry.date}`)
          console.log(`     Model: ${entry.model}`)
          console.log(`     Status: ${entry.status}`)
          console.log(`     Requests: ${entry.requests}`)
          console.log(`     Cost: ${entry.totalCost}`)
          console.log(`     Imported: ${entry.importedAt}`)
        })
      })
    }

    // Check for entries without hashes
    if (results.entriesWithoutHashes > 0) {
      console.log('\n⚠️ ENTRIES WITHOUT CONTENT HASHES:')
      console.log(`Found ${results.entriesWithoutHashes} entries without contentHash field`)
      console.log('These entries will not be detected as duplicates during import!')
    }

    // Analyze hash distribution
    const hashCounts = new Map<string, number>()
    results.duplicateHashes.forEach(group => {
      hashCounts.set(group.hash, group.count)
    })
    
    if (hashCounts.size > 0) {
      console.log('\n📊 HASH DISTRIBUTION:')
      const sortedHashes = Array.from(hashCounts.entries()).sort((a, b) => b[1] - a[1])
      sortedHashes.slice(0, 5).forEach(([hash, count]) => {
        console.log(`  ${hash}: ${count} copies`)
      })
    }

    return results
  } catch (error: any) {
    console.error('❌ Error during debug analysis:', error)
    throw error
  }
}

// DEBUG: Simulate import process to see what would be detected as duplicates
export async function debugImportProcess(userId: string, sampleData: CursorUsage[]): Promise<{
  totalSampleEntries: number
  duplicatesFound: number
  newEntries: number
  duplicateDetails: { hash: string, content: string, existingEntry?: any, sampleEntry: any }[]
  hashComparisons: { sampleHash: string, sampleContent: string, existingHashes: string[] }[]
}> {
  console.log('🔍 DEBUG: Simulating import process for user:', userId)
  console.log('Sample data entries:', sampleData.length)
  
  try {
    const results = {
      totalSampleEntries: sampleData.length,
      duplicatesFound: 0,
      newEntries: 0,
      duplicateDetails: [] as { hash: string, content: string, existingEntry?: any, sampleEntry: any }[],
      hashComparisons: [] as { sampleHash: string, sampleContent: string, existingHashes: string[] }[]
    }

    // Step 1: Generate content hashes for sample data
    const sampleHashes = sampleData.map(usage => generateContentHash(usage))
    const uniqueSampleHashes = [...new Set(sampleHashes)]
    
    console.log(`Generated ${sampleHashes.length} hashes for sample data`)
    console.log(`Unique hashes in sample: ${uniqueSampleHashes.length}`)

    // Step 2: Get existing hashes from database (same logic as saveUserUsageData)
    let existingHashes = new Set<string>()
    
    // Handle the case where we have more than 10 unique hashes
    for (let i = 0; i < uniqueSampleHashes.length; i += 10) {
      const batch = uniqueSampleHashes.slice(i, i + 10)
      if (batch.length > 0) {
        console.log(`Querying batch ${Math.floor(i/10) + 1}: ${batch.length} hashes`)
        const batchQuery = query(
          getUserRawUsageCollection(userId),
          where('contentHash', 'in', batch)
        )
        const snapshot = await getDocs(batchQuery)
        console.log(`Found ${snapshot.docs.length} existing entries for this batch`)
        
        snapshot.docs.forEach(doc => {
          const data = doc.data() as RawUsageDocument
          if (data.contentHash) {
            existingHashes.add(data.contentHash)
          }
        })
      }
    }

    console.log(`Total existing hashes found: ${existingHashes.size}`)

    // Step 3: Analyze each sample entry
    sampleData.forEach((usage, index) => {
      const contentHash = generateContentHash(usage)
      const content = `${usage.date}|${usage.model}|${usage.status}|${usage.requests}|${usage.totalCost.toFixed(6)}`
      
      const hashComparison = {
        sampleHash: contentHash,
        sampleContent: content,
        existingHashes: Array.from(existingHashes)
      }
      results.hashComparisons.push(hashComparison)
      
      if (existingHashes.has(contentHash)) {
        results.duplicatesFound++
        results.duplicateDetails.push({
          hash: contentHash,
          content,
          sampleEntry: {
            index,
            date: usage.date,
            model: usage.model,
            status: usage.status,
            requests: usage.requests,
            totalCost: usage.totalCost
          }
        })
        console.log(`DUPLICATE FOUND: Entry ${index} with hash ${contentHash}`)
      } else {
        results.newEntries++
        console.log(`NEW ENTRY: Entry ${index} with hash ${contentHash}`)
      }
    })

    console.log('\n📊 IMPORT SIMULATION RESULTS:')
    console.log(`  - Sample entries: ${results.totalSampleEntries}`)
    console.log(`  - Would be saved as new: ${results.newEntries}`)
    console.log(`  - Would be skipped as duplicates: ${results.duplicatesFound}`)

    return results
  } catch (error: any) {
    console.error('❌ Error during import simulation:', error)
    throw error
  }
} 