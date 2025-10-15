import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '../config/firebaseApp'
import { useOrganization } from '../contexts/OrganizationContext'

// interface UsageData {
//   userId: string
//   date: string
//   model: string
//   inputTokens: number
//   outputTokens: number
//   totalTokens: number
//   cost: number
//   requests: number
// }

interface UserStats {
  userId: string
  email: string
  displayName: string
  totalCost: number
  totalTokens: number
  totalRequests: number
  lastActivity: Date | null
}

interface TeamStats {
  teamId: string
  teamName: string
  totalCost: number
  totalTokens: number
  memberCount: number
}

interface ModelStats {
  model: string
  totalCost: number
  totalTokens: number
  totalRequests: number
  percentage: number
}

interface OrgAnalytics {
  totalCost: number
  totalTokens: number
  totalRequests: number
  activeUsers: number
  userStats: UserStats[]
  teamStats: TeamStats[]
  modelStats: ModelStats[]
  dailyUsage: { date: string; cost: number; tokens: number }[]
  loading: boolean
  error: string | null
}

export function useOrgAnalytics(dateRange?: { start: Date; end: Date }) {
  const { organization, members, teams } = useOrganization()
  const [analytics, setAnalytics] = useState<OrgAnalytics>({
    totalCost: 0,
    totalTokens: 0,
    totalRequests: 0,
    activeUsers: 0,
    userStats: [],
    teamStats: [],
    modelStats: [],
    dailyUsage: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!organization) {
      setAnalytics(prev => ({ ...prev, loading: false }))
      return
    }

    async function fetchAnalytics() {
      try {
        setAnalytics(prev => ({ ...prev, loading: true, error: null }))

        // Query usage data for all organization members
        const usagePromises = members.map(async (member) => {
          const usageRef = collection(db, 'users', member.userId, 'enhanced_cursor_usage')
          let usageQuery = query(usageRef, orderBy('date', 'desc'))

          if (dateRange) {
            usageQuery = query(
              usageRef,
              where('date', '>=', Timestamp.fromDate(dateRange.start)),
              where('date', '<=', Timestamp.fromDate(dateRange.end)),
              orderBy('date', 'desc')
            )
          }

          const snapshot = await getDocs(usageQuery)
          return {
            member,
            usage: snapshot.docs.map(doc => ({
              ...doc.data(),
              id: doc.id,
            })) as any[],
          }
        })

        const memberUsageData = await Promise.all(usagePromises)

        // Calculate user statistics
        const userStatsMap = new Map<string, UserStats>()
        const dailyUsageMap = new Map<string, { cost: number; tokens: number }>()
        const modelStatsMap = new Map<string, { cost: number; tokens: number; requests: number }>()

        let totalCost = 0
        let totalTokens = 0
        let totalRequests = 0
        const activeUserIds = new Set<string>()

        memberUsageData.forEach(({ member, usage }) => {
          let userCost = 0
          let userTokens = 0
          let userRequests = 0
          let lastActivity: Date | null = null

          usage.forEach((record: any) => {
            const cost = record.cost || 0
            const tokens = record.totalTokens || 0
            const requests = record.requests || 1

            userCost += cost
            userTokens += tokens
            userRequests += requests

            totalCost += cost
            totalTokens += tokens
            totalRequests += requests

            // Track daily usage
            const dateStr = record.date?.toDate?.()?.toISOString?.().split('T')[0] || 'unknown'
            const dailyData = dailyUsageMap.get(dateStr) || { cost: 0, tokens: 0 }
            dailyData.cost += cost
            dailyData.tokens += tokens
            dailyUsageMap.set(dateStr, dailyData)

            // Track model usage
            const model = record.model || 'unknown'
            const modelData = modelStatsMap.get(model) || { cost: 0, tokens: 0, requests: 0 }
            modelData.cost += cost
            modelData.tokens += tokens
            modelData.requests += requests
            modelStatsMap.set(model, modelData)

            // Track last activity
            const recordDate = record.date?.toDate?.()
            if (recordDate && (!lastActivity || recordDate > lastActivity)) {
              lastActivity = recordDate
            }
          })

          if (usage.length > 0) {
            activeUserIds.add(member.userId)
          }

          userStatsMap.set(member.userId, {
            userId: member.userId,
            email: member.email,
            displayName: member.displayName || 'Unknown',
            totalCost: userCost,
            totalTokens: userTokens,
            totalRequests: userRequests,
            lastActivity,
          })
        })

        // Calculate team statistics
        const teamStatsArray: TeamStats[] = teams.map(team => {
          const teamMembers = members.filter(m => m.teamId === team.id)
          let teamCost = 0
          let teamTokens = 0

          teamMembers.forEach(member => {
            const userStats = userStatsMap.get(member.userId)
            if (userStats) {
              teamCost += userStats.totalCost
              teamTokens += userStats.totalTokens
            }
          })

          return {
            teamId: team.id,
            teamName: team.name,
            totalCost: teamCost,
            totalTokens: teamTokens,
            memberCount: teamMembers.length,
          }
        })

        // Convert model stats to array with percentages
        const modelStatsArray: ModelStats[] = Array.from(modelStatsMap.entries()).map(([model, stats]) => ({
          model,
          totalCost: stats.cost,
          totalTokens: stats.tokens,
          totalRequests: stats.requests,
          percentage: totalCost > 0 ? (stats.cost / totalCost) * 100 : 0,
        })).sort((a, b) => b.totalCost - a.totalCost)

        // Convert daily usage to array and sort
        const dailyUsageArray = Array.from(dailyUsageMap.entries())
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => a.date.localeCompare(b.date))

        // Convert user stats to array and sort by cost
        const userStatsArray = Array.from(userStatsMap.values())
          .sort((a, b) => b.totalCost - a.totalCost)

        setAnalytics({
          totalCost,
          totalTokens,
          totalRequests,
          activeUsers: activeUserIds.size,
          userStats: userStatsArray,
          teamStats: teamStatsArray,
          modelStats: modelStatsArray,
          dailyUsage: dailyUsageArray,
          loading: false,
          error: null,
        })
      } catch (err: any) {
        console.error('Error fetching org analytics:', err)
        setAnalytics(prev => ({
          ...prev,
          loading: false,
          error: err.message || 'Failed to fetch analytics',
        }))
      }
    }

    fetchAnalytics()
  }, [organization, members, teams, dateRange])

  return analytics
}

