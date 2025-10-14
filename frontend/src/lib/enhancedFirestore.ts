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
import { EnhancedCursorUsage } from '@shared'

export interface EnhancedRawUsageDocument extends EnhancedCursorUsage {
  id: string
  userId: string
  importId: string
  sequence: number
  rawTimestamp: Timestamp
  importedAt: Timestamp
  contentHash: string
  parsedDate: Date
}

export interface EnhancedAggregatedUsageDocument {
  id: string
  userId: string
  date: string // YYYY-MM-DD
  minute: string // YYYY-MM-DD HH:mm
  model: string
  status: string // success/failure derived from success field
  totalRequests: number
  totalCost: number
  costPerRequest: number
  entryCount: number
  uniqueHashes: string[]
  // Enhanced token fields
  totalInputTokens: number
  totalOutputTokens: number
  totalCacheWriteTokens: number
  totalCacheReadTokens: number
  totalTokens: number
  avgTokensPerRequest: number
  lastUpdated: Timestamp
  createdAt: Timestamp
}

// Parse enhanced date format "May 31, 09:53 AM" to Date
export function parseEnhancedDateTime(dateStr: string): Date {
  try {
    // Handle format like "May 31, 09:53 AM"
    const currentYear = new Date().getFullYear()
    const parsed = new Date(`${dateStr}, ${currentYear}`)
    
    if (isNaN(parsed.getTime())) {
      // Fallback: try with current year explicit
      const withYear = `${dateStr} ${currentYear}`
      const parsed2 = new Date(withYear)
      if (isNaN(parsed2.getTime())) {
        console.warn('Could not parse enhanced date:', dateStr)
        return new Date()
      }
      return parsed2
    }
    
    return parsed
  } catch (error) {
    console.warn('Error parsing enhanced date:', dateStr, error)
    return new Date()
  }
}

// Generate content-based hash for enhanced data
function generateEnhancedContentHash(usage: EnhancedCursorUsage): string {
  const content = `${usage.date}|${usage.model}|${usage.success}|${usage.requests}|${usage.tokenUsage.input}|${usage.tokenUsage.output}|${usage.tokenUsage.cacheWrite}|${usage.tokenUsage.cacheRead}|${usage.totalCost.toFixed(6)}`
  
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

// Get user's enhanced raw usage collection reference
export function getUserEnhancedRawUsageCollection(userId: string) {
  return collection(db, 'users', userId, 'enhancedRawUsage')
}

// Get user's enhanced aggregated usage collection reference
export function getUserEnhancedAggregatedUsageCollection(userId: string) {
  return collection(db, 'users', userId, 'enhancedAggregatedUsage')
}

// Generate aggregation key for enhanced data
function generateEnhancedAggregationKey(date: string, model: string, success: string): string {
  const parsedDate = parseEnhancedDateTime(date)
  const dateStr = parsedDate.toISOString().split('T')[0] // YYYY-MM-DD
  const hour = parsedDate.getHours().toString().padStart(2, '0')
  const minute = parsedDate.getMinutes().toString().padStart(2, '0')
  const minuteStr = `${dateStr} ${hour}:${minute}`
  const status = success.toLowerCase() === 'yes' ? 'success' : 'failure'
  
  return `${dateStr}|${minuteStr}|${model}|${status}`
}

// Generate unique ID for enhanced raw usage entry
export function generateEnhancedRawUsageId(importId: string, sequence: number): string {
  return `enhanced_${importId}_${sequence.toString().padStart(6, '0')}`
}

// Save enhanced raw usage data and update aggregations
export async function saveEnhancedUserUsageData(userId: string, usageData: EnhancedCursorUsage[]): Promise<{
  saved: number
  duplicates: number
  errors: string[]
}> {
  console.log('Saving enhanced usage data for user:', userId, 'entries:', usageData.length)
  
  const results = {
    saved: 0,
    duplicates: 0,
    errors: [] as string[]
  }

  if (usageData.length === 0) {
    return results
  }

  try {
    const importId = `enhanced_import_${Date.now()}`
    const batch = writeBatch(db)
    const now = Timestamp.now()

    // Step 1: Find the latest timestamp in existing data (append-only logic)
    console.log('🔍 Finding latest existing enhanced timestamp for append-only import...')
    const latestQuery = query(
      getUserEnhancedRawUsageCollection(userId),
      orderBy('rawTimestamp', 'desc'),
      limit(1)
    )
    const latestSnapshot = await getDocs(latestQuery)
    
    let latestExistingTimestamp: Date | null = null
    if (!latestSnapshot.empty) {
      const latestDoc = latestSnapshot.docs[0].data() as EnhancedRawUsageDocument
      latestExistingTimestamp = parseEnhancedDateTime(latestDoc.date)
      console.log(`Latest existing enhanced data timestamp: ${latestExistingTimestamp.toISOString()}`)
    } else {
      console.log('No existing enhanced data found - this is the first import')
    }

    // Step 2: Filter incoming data for append-only behavior
    let overlapData: EnhancedCursorUsage[] = []
    let newData: EnhancedCursorUsage[] = []
    
    if (!latestExistingTimestamp) {
      newData = usageData
      console.log('No existing enhanced data - accepting all entries')
    } else {
      const overlapWindow = new Date(latestExistingTimestamp.getTime() - (1 * 60 * 1000))
      
      usageData.forEach(usage => {
        const usageDate = parseEnhancedDateTime(usage.date)
        
        if (usageDate > latestExistingTimestamp) {
          newData.push(usage)
        } else if (usageDate >= overlapWindow) {
          overlapData.push(usage)
        } else {
          results.duplicates++
          console.log(`Skipping historical enhanced entry: ${usage.date}`)
        }
      })
      
      console.log(`Found ${newData.length} definitely new enhanced entries`)
      console.log(`Found ${overlapData.length} enhanced entries in overlap window`)
    }

    // Step 3: For overlap data, check if we already have it using content hashes
    let finalNewData = [...newData]
    
    if (overlapData.length > 0) {
      console.log('🔍 Checking enhanced overlap data for existing content...')
      const overlapHashes = overlapData.map(usage => generateEnhancedContentHash(usage))
      const uniqueOverlapHashes = [...new Set(overlapHashes)]
      
      let existingOverlapHashes = new Set<string>()
      
      for (let i = 0; i < uniqueOverlapHashes.length; i += 10) {
        const batch = uniqueOverlapHashes.slice(i, i + 10)
        if (batch.length > 0) {
          const batchQuery = query(
            getUserEnhancedRawUsageCollection(userId),
            where('contentHash', 'in', batch)
          )
          const snapshot = await getDocs(batchQuery)
          snapshot.docs.forEach(doc => {
            const data = doc.data() as EnhancedRawUsageDocument
            if (data.contentHash) {
              existingOverlapHashes.add(data.contentHash)
            }
          })
        }
      }
      
      overlapData.forEach(usage => {
        const contentHash = generateEnhancedContentHash(usage)
        if (!existingOverlapHashes.has(contentHash)) {
          finalNewData.push(usage)
          console.log(`Adding enhanced overlap entry: ${usage.date} (new content)`)
        } else {
          results.duplicates++
          console.log(`Skipping enhanced overlap entry: ${usage.date} (duplicate content)`)
        }
      })
    }

    console.log(`Final enhanced result: ${finalNewData.length} entries to save, ${results.duplicates} duplicates skipped`)

    // Step 4: Save only new raw data (append-only)
    console.log('💾 Saving new enhanced raw usage data...')
    const newAggregations = new Map<string, {
      date: string
      minute: string
      model: string
      status: string
      totalRequests: number
      totalCost: number
      entryCount: number
      uniqueHashes: Set<string>
      totalInputTokens: number
      totalOutputTokens: number
      totalCacheWriteTokens: number
      totalCacheReadTokens: number
    }>()
    
    finalNewData.forEach((usage: EnhancedCursorUsage, index: number) => {
      try {
        const contentHash = generateEnhancedContentHash(usage)
        const parsedDate = parseEnhancedDateTime(usage.date)

        const rawId = generateEnhancedRawUsageId(importId, index)
        const rawDocRef = doc(getUserEnhancedRawUsageCollection(userId), rawId)
        
        const rawDoc: EnhancedRawUsageDocument = {
          ...usage,
          id: rawId,
          userId,
          importId,
          sequence: index,
          rawTimestamp: now,
          importedAt: now,
          contentHash,
          parsedDate
        }

        batch.set(rawDocRef, rawDoc)
        results.saved++

        // Prepare aggregation data
        const aggKey = generateEnhancedAggregationKey(usage.date, usage.model, usage.success)
        
        if (!newAggregations.has(aggKey)) {
          const dateStr = parsedDate.toISOString().split('T')[0]
          const hour = parsedDate.getHours().toString().padStart(2, '0')
          const minute = parsedDate.getMinutes().toString().padStart(2, '0')
          const minuteStr = `${dateStr} ${hour}:${minute}`

          newAggregations.set(aggKey, {
            date: dateStr,
            minute: minuteStr,
            model: usage.model,
            status: usage.success.toLowerCase() === 'yes' ? 'success' : 'failure',
            totalRequests: 0,
            totalCost: 0,
            entryCount: 0,
            uniqueHashes: new Set(),
            totalInputTokens: 0,
            totalOutputTokens: 0,
            totalCacheWriteTokens: 0,
            totalCacheReadTokens: 0,
          })
        }

        const agg = newAggregations.get(aggKey)!
        agg.totalRequests += usage.requests
        agg.totalCost += usage.totalCost
        agg.entryCount += 1
        agg.uniqueHashes.add(contentHash)
        agg.totalInputTokens += usage.tokenUsage.input
        agg.totalOutputTokens += usage.tokenUsage.output
        agg.totalCacheWriteTokens += usage.tokenUsage.cacheWrite
        agg.totalCacheReadTokens += usage.tokenUsage.cacheRead

      } catch (error) {
        console.error('Error processing enhanced raw usage entry:', error)
        results.errors.push(`Error processing enhanced raw entry ${index}: ${error}`)
      }
    })

    // Step 5: Update aggregations with new data only
    console.log('📊 Updating enhanced aggregations with new data...')
    const existingAggQuery = query(getUserEnhancedAggregatedUsageCollection(userId))
    const existingAggSnapshot = await getDocs(existingAggQuery)
    
    const existingAggregations = new Map<string, EnhancedAggregatedUsageDocument>()
    existingAggSnapshot.docs.forEach(doc => {
      const data = doc.data() as EnhancedAggregatedUsageDocument
      const key = generateEnhancedAggregationKey(
        `${data.date} ${data.minute.split(' ')[1]}:00`,
        data.model, 
        data.status === 'success' ? 'Yes' : 'No'
      )
      existingAggregations.set(key, data)
    })

    // Merge new aggregations with existing ones
    for (const [key, newAgg] of newAggregations) {
      try {
        const aggDocRef = doc(getUserEnhancedAggregatedUsageCollection(userId), key.replace(/[|:]/g, '_'))
        
        let finalAgg: EnhancedAggregatedUsageDocument
        
        if (existingAggregations.has(key)) {
          // Merge with existing
          const existing = existingAggregations.get(key)!
          const existingHashSet = new Set(existing.uniqueHashes || [])
          
          const newUniqueHashes = Array.from(newAgg.uniqueHashes).filter(hash => !existingHashSet.has(hash))
          
          if (newUniqueHashes.length > 0) {
            const totalRequests = existing.totalRequests + newAgg.totalRequests
            const totalCost = existing.totalCost + newAgg.totalCost
            const totalTokens = (existing.totalInputTokens + existing.totalOutputTokens + existing.totalCacheWriteTokens + existing.totalCacheReadTokens) + 
                               (newAgg.totalInputTokens + newAgg.totalOutputTokens + newAgg.totalCacheWriteTokens + newAgg.totalCacheReadTokens)
            
            finalAgg = {
              ...existing,
              totalRequests,
              totalCost,
              costPerRequest: totalCost / totalRequests,
              entryCount: existing.entryCount + newAgg.entryCount,
              uniqueHashes: [...(existing.uniqueHashes || []), ...newUniqueHashes],
              totalInputTokens: existing.totalInputTokens + newAgg.totalInputTokens,
              totalOutputTokens: existing.totalOutputTokens + newAgg.totalOutputTokens,
              totalCacheWriteTokens: existing.totalCacheWriteTokens + newAgg.totalCacheWriteTokens,
              totalCacheReadTokens: existing.totalCacheReadTokens + newAgg.totalCacheReadTokens,
              totalTokens,
              avgTokensPerRequest: totalTokens / totalRequests,
              lastUpdated: now
            }
            batch.set(aggDocRef, finalAgg)
          }
        } else {
          // Create new aggregation
          const totalTokens = newAgg.totalInputTokens + newAgg.totalOutputTokens + newAgg.totalCacheWriteTokens + newAgg.totalCacheReadTokens
          
          finalAgg = {
            id: key.replace(/[|:]/g, '_'),
            userId,
            date: newAgg.date,
            minute: newAgg.minute,
            model: newAgg.model,
            status: newAgg.status,
            totalRequests: newAgg.totalRequests,
            totalCost: newAgg.totalCost,
            costPerRequest: newAgg.totalCost / newAgg.totalRequests,
            entryCount: newAgg.entryCount,
            uniqueHashes: Array.from(newAgg.uniqueHashes),
            totalInputTokens: newAgg.totalInputTokens,
            totalOutputTokens: newAgg.totalOutputTokens,
            totalCacheWriteTokens: newAgg.totalCacheWriteTokens,
            totalCacheReadTokens: newAgg.totalCacheReadTokens,
            totalTokens,
            avgTokensPerRequest: totalTokens / newAgg.totalRequests,
            lastUpdated: now,
            createdAt: now
          }
          batch.set(aggDocRef, finalAgg)
        }

      } catch (error) {
        console.error('Error processing enhanced aggregation:', error)
        results.errors.push(`Error processing enhanced aggregation: ${error}`)
      }
    }

    console.log('💾 Committing enhanced data batch...')
    await batch.commit()

    console.log('✅ Enhanced usage data saved successfully!')
    console.log(`📊 Summary: ${results.saved} saved, ${results.duplicates} duplicates, ${results.errors.length} errors`)

  } catch (error: any) {
    console.error('❌ Error saving enhanced usage data:', error)
    results.errors.push(`Enhanced save error: ${error.message}`)
  }

  return results
}

// Get enhanced aggregated usage data for analytics (default view)
export async function getEnhancedUserUsageData(userId: string): Promise<EnhancedCursorUsage[]> {
  console.log('Fetching enhanced aggregated usage data for user:', userId)
  
  try {
    const aggQuery = query(
      getUserEnhancedAggregatedUsageCollection(userId),
      orderBy('createdAt', 'desc')
    )
    
    console.log('Executing enhanced aggregated data query...')
    const snapshot = await getDocs(aggQuery)
    console.log('Query completed, enhanced aggregated documents found:', snapshot.docs.length)
    
    return snapshot.docs.map(doc => {
      const data = doc.data() as EnhancedAggregatedUsageDocument
      // Convert back to EnhancedCursorUsage format for compatibility
      return {
        id: data.id,
        date: `${data.date} ${data.minute.split(' ')[1]}:00`,
        user: "You",
        billingType: "Usage-based",
        success: data.status === 'success' ? 'Yes' : 'No',
        model: data.model,
        requests: data.totalRequests,
        tokenUsage: {
          input: data.totalInputTokens,
          output: data.totalOutputTokens,
          cacheWrite: data.totalCacheWriteTokens,
          cacheRead: data.totalCacheReadTokens,
        },
        totalCost: data.totalCost,
        costPerRequest: data.costPerRequest,
        parsedDate: new Date(`${data.date} ${data.minute.split(' ')[1]}:00`)
      }
    })
  } catch (error: any) {
    console.error('Error fetching enhanced aggregated usage data:', error)
    throw error
  }
}

// Get enhanced usage statistics
export async function getEnhancedUserUsageStats(userId: string): Promise<{
  totalEntries: number
  totalRequests: number
  totalCost: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCacheWriteTokens: number
  totalCacheReadTokens: number
  totalTokens: number
  oldestEntry?: string
  newestEntry?: string
  rawEntries: number
  aggregatedEntries: number
}> {
  console.log('Fetching enhanced usage stats for user:', userId)
  
  try {
    // Get raw data stats
    const rawQuery = query(getUserEnhancedRawUsageCollection(userId), orderBy('rawTimestamp', 'desc'))
    const rawSnapshot = await getDocs(rawQuery)
    
    // Get aggregated data stats
    const aggQuery = query(getUserEnhancedAggregatedUsageCollection(userId))
    const aggSnapshot = await getDocs(aggQuery)
    
    let totalRequests = 0
    let totalCost = 0
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let totalCacheWriteTokens = 0
    let totalCacheReadTokens = 0
    let oldestEntry: string | undefined
    let newestEntry: string | undefined
    
    // Calculate totals from aggregated data
    aggSnapshot.docs.forEach(doc => {
      const data = doc.data() as EnhancedAggregatedUsageDocument
      totalRequests += data.totalRequests
      totalCost += data.totalCost
      totalInputTokens += data.totalInputTokens
      totalOutputTokens += data.totalOutputTokens
      totalCacheWriteTokens += data.totalCacheWriteTokens
      totalCacheReadTokens += data.totalCacheReadTokens
      
      // Track date range
      const entryDate = `${data.date} ${data.minute.split(' ')[1]}:00`
      if (!oldestEntry || entryDate < oldestEntry) {
        oldestEntry = entryDate
      }
      if (!newestEntry || entryDate > newestEntry) {
        newestEntry = entryDate
      }
    })
    
    const totalTokens = totalInputTokens + totalOutputTokens + totalCacheWriteTokens + totalCacheReadTokens
    
    return {
      totalEntries: aggSnapshot.docs.length,
      totalRequests,
      totalCost,
      totalInputTokens,
      totalOutputTokens,
      totalCacheWriteTokens,
      totalCacheReadTokens,
      totalTokens,
      oldestEntry,
      newestEntry,
      rawEntries: rawSnapshot.docs.length,
      aggregatedEntries: aggSnapshot.docs.length
    }
  } catch (error: any) {
    console.error('Error fetching enhanced usage stats:', error)
    throw error
  }
} 