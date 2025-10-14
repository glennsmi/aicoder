import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { EnhancedCursorUsage } from '@shared'
import { 
  getEnhancedUserUsageData, 
  saveEnhancedUserUsageData, 
  getEnhancedUserUsageStats
} from '../lib/enhancedFirestore'

interface UseEnhancedUserUsageDataReturn {
  usageData: EnhancedCursorUsage[]
  loading: boolean
  error: string | null
  stats: {
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
  } | null
  saveUsageData: (newData: EnhancedCursorUsage[]) => Promise<{
    saved: number
    duplicates: number
    errors: string[]
  } | null>
  refreshData: () => Promise<void>
  clearError: () => void
}

export function useEnhancedUserUsageData(): UseEnhancedUserUsageDataReturn {
  const { currentUser } = useAuth()
  const [usageData, setUsageData] = useState<EnhancedCursorUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<UseEnhancedUserUsageDataReturn['stats']>(null)

  const refreshData = async () => {
    if (!currentUser?.uid) return

    try {
      setLoading(true)
      setError(null)

      // Fetch usage data and stats in parallel
      const [data, statsData] = await Promise.all([
        getEnhancedUserUsageData(currentUser.uid),
        getEnhancedUserUsageStats(currentUser.uid)
      ])

      setUsageData(data)
      setStats(statsData)
    } catch (err: any) {
      console.error('Error refreshing enhanced usage data:', err)
      setError(err.message || 'Failed to fetch enhanced usage data')
    } finally {
      setLoading(false)
    }
  }

  const saveUsageData = async (newData: EnhancedCursorUsage[]) => {
    if (!currentUser?.uid) {
      setError('User not authenticated')
      return null
    }

    try {
      setError(null)
      const result = await saveEnhancedUserUsageData(currentUser.uid, newData)
      
      // Refresh data after saving
      await refreshData()
      
      return result
    } catch (err: any) {
      console.error('Error saving enhanced usage data:', err)
      setError(err.message || 'Failed to save enhanced usage data')
      return null
    }
  }

  const clearError = () => {
    setError(null)
  }

  // Load data when user changes
  useEffect(() => {
    if (currentUser?.uid) {
      refreshData()
    } else {
      setUsageData([])
      setStats(null)
      setLoading(false)
    }
  }, [currentUser?.uid])

  return {
    usageData,
    loading,
    error,
    stats,
    saveUsageData,
    refreshData,
    clearError
  }
} 