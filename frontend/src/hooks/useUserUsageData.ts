import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { CursorUsage } from '@shared'
import { 
  getUserUsageData, 
  saveUserUsageData, 
  getUserUsageStats,
  deduplicateAndRebuildAggregations
} from '../lib/firestore'

interface UseUserUsageDataReturn {
  usageData: CursorUsage[]
  loading: boolean
  error: string | null
  stats: {
    totalEntries: number
    totalRequests: number
    totalCost: number
    oldestEntry?: string
    newestEntry?: string
    rawEntries: number
    aggregatedEntries: number
  } | null
  saveUsageData: (newData: CursorUsage[]) => Promise<{
    saved: number
    duplicates: number
    errors: string[]
  } | null>
  deduplicateData: () => Promise<{
    totalRawEntries: number
    duplicatesRemoved: number
    uniqueEntries: number
    aggregationsRebuilt: number
    errors: string[]
  } | null>
  refreshData: () => Promise<void>
  clearError: () => void
}

export function useUserUsageData(): UseUserUsageDataReturn {
  const { currentUser, loading: authLoading } = useAuth()
  const [usageData, setUsageData] = useState<CursorUsage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<{
    totalEntries: number
    totalRequests: number
    totalCost: number
    oldestEntry?: string
    newestEntry?: string
    rawEntries: number
    aggregatedEntries: number
  } | null>(null)

  // Load user data when user logs in
  const loadUserData = async () => {
    if (!currentUser) {
      console.log('No current user, clearing data')
      setUsageData([])
      setStats(null)
      setError(null)
      return
    }

    // Don't load if auth is still loading
    if (authLoading) {
      console.log('Auth still loading, skipping data load')
      return
    }

    console.log('Loading data for user:', currentUser.uid)
    setLoading(true)
    setError(null)

    try {
      const [userData, userStats] = await Promise.all([
        getUserUsageData(currentUser.uid),
        getUserUsageStats(currentUser.uid)
      ])
      
      console.log('Loaded usage data:', userData.length, 'entries')
      setUsageData(userData)
      setStats(userStats)
    } catch (err: any) {
      console.error('Error loading user usage data:', err)
      
      // Provide more specific error messages
      if (err.code === 'permission-denied') {
        setError('You do not have permission to access this data. Please try signing in again.')
      } else if (err.code === 'unauthenticated') {
        setError('Authentication required. Please sign in to access your data.')
      } else {
        setError(`Failed to load your usage data: ${err.message || 'Unknown error'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  // Save new usage data
  const saveUsageData = async (newData: CursorUsage[]) => {
    if (!currentUser) {
      setError('You must be logged in to save data')
      return null
    }

    console.log('Saving', newData.length, 'usage entries for user:', currentUser.uid)
    setLoading(true)
    setError(null)

    try {
      const result = await saveUserUsageData(currentUser.uid, newData)
      console.log('Save result:', result)
      
      if (result.errors.length > 0) {
        setError(`Some entries failed to save: ${result.errors.join(', ')}`)
      }

      // Refresh the data after saving
      await loadUserData()
      
      return result
    } catch (err: any) {
      console.error('Error saving usage data:', err)
      
      if (err.code === 'permission-denied') {
        setError('You do not have permission to save data. Please try signing in again.')
      } else if (err.code === 'unauthenticated') {
        setError('Authentication required. Please sign in to save your data.')
      } else {
        setError(`Failed to save usage data: ${err.message || 'Unknown error'}`)
      }
      return null
    } finally {
      setLoading(false)
    }
  }

  // NEW: Deduplicate data and rebuild aggregations
  const deduplicateData = async () => {
    if (!currentUser) {
      setError('You must be logged in to deduplicate data')
      return null
    }

    console.log('🔄 Starting deduplication for user:', currentUser.uid)
    setLoading(true)
    setError(null)

    try {
      const result = await deduplicateAndRebuildAggregations(currentUser.uid)
      console.log('Deduplication result:', result)
      
      if (result.errors.length > 0) {
        setError(`Some errors occurred during deduplication: ${result.errors.join(', ')}`)
      }

      // Refresh the data after deduplication
      await loadUserData()
      
      return result
    } catch (err: any) {
      console.error('Error during deduplication:', err)
      
      if (err.code === 'permission-denied') {
        setError('You do not have permission to modify data. Please try signing in again.')
      } else if (err.code === 'unauthenticated') {
        setError('Authentication required. Please sign in to deduplicate your data.')
      } else {
        setError(`Failed to deduplicate data: ${err.message || 'Unknown error'}`)
      }
      return null
    } finally {
      setLoading(false)
    }
  }

  // Refresh data
  const refreshData = async () => {
    await loadUserData()
  }

  // Clear error
  const clearError = () => {
    setError(null)
  }

  // Load data when user changes, but not when auth is still loading
  useEffect(() => {
    if (!authLoading) {
      loadUserData()
    }
  }, [currentUser, authLoading])

  return {
    usageData,
    loading,
    error,
    stats,
    saveUsageData,
    deduplicateData,
    refreshData,
    clearError
  }
} 