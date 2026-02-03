import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useOrganization } from '../contexts/OrganizationContext'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebaseApp'

// Define all possible tiers based on the Stripe integration plan
type UserTier = 'free_individual' | 'paid_individual' | 'team' | 'enterprise'
type OrganizationTier = 'free' | 'team' | 'enterprise'

interface TierOverrideSelectorProps {
  className?: string
}

export default function TierOverrideSelector({ className = '' }: TierOverrideSelectorProps) {
  const { user } = useAuth()
  const { organization, refreshOrganization } = useOrganization()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  const userTiers: { value: UserTier; label: string; description: string }[] = [
    { value: 'free_individual', label: 'Free Individual', description: 'Basic features, CSV upload only' },
    { value: 'paid_individual', label: 'Paid Individual', description: 'Enhanced features for solo developers' },
    { value: 'team', label: 'Team', description: 'Team features, API integrations' },
    { value: 'enterprise', label: 'Enterprise', description: 'All features, unlimited users' }
  ]

  const orgTiers: { value: OrganizationTier; label: string; description: string }[] = [
    { value: 'free', label: 'Free', description: 'Basic organization features' },
    { value: 'team', label: 'Team', description: 'Team management, API integrations' },
    { value: 'enterprise', label: 'Enterprise', description: 'All features, unlimited users' }
  ]

  const handleUserTierChange = async (newTier: UserTier) => {
    if (!user) return

    try {
      setLoading(true)
      setError('')

      await updateDoc(doc(db, 'users', user.id), {
        tier: newTier,
        updatedAt: serverTimestamp()
      })

      // The user data will be refreshed automatically by the AuthContext listener
      console.log(`✅ User tier updated to: ${newTier}`)
    } catch (err) {
      console.error('❌ Failed to update user tier:', err)
      setError('Failed to update user tier')
    } finally {
      setLoading(false)
    }
  }

  const handleOrgTierChange = async (newTier: OrganizationTier) => {
    if (!organization) return

    try {
      setLoading(true)
      setError('')

      await updateDoc(doc(db, 'organizations', organization.id), {
        tier: newTier,
        updatedAt: serverTimestamp()
      })

      await refreshOrganization()
      console.log(`✅ Organization tier updated to: ${newTier}`)
    } catch (err) {
      console.error('❌ Failed to update organization tier:', err)
      setError('Failed to update organization tier')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
          Development Mode - Tier Override
        </h3>
      </div>

      <div className="space-y-4">
        {/* User Tier Override */}
        <div>
          <label className="block text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">
            User Tier (Current: {user?.tier || 'free_individual'})
          </label>
          <div className="grid grid-cols-2 gap-2">
            {userTiers.map((tier) => (
              <button
                key={tier.value}
                onClick={() => handleUserTierChange(tier.value)}
                disabled={loading || user?.tier === tier.value}
                className={`px-3 py-2 text-xs rounded-md border transition-colors ${
                  user?.tier === tier.value
                    ? 'bg-yellow-200 dark:bg-yellow-800 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200'
                    : 'bg-white dark:bg-gray-800 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                title={tier.description}
              >
                {tier.label}
              </button>
            ))}
          </div>
        </div>

        {/* Organization Tier Override */}
        {organization && (
          <div>
            <label className="block text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">
              Organization Tier (Current: {organization.tier})
            </label>
            <div className="grid grid-cols-3 gap-2">
              {orgTiers.map((tier) => (
                <button
                  key={tier.value}
                  onClick={() => handleOrgTierChange(tier.value)}
                  disabled={loading || organization.tier === tier.value}
                  className={`px-3 py-2 text-xs rounded-md border transition-colors ${
                    organization.tier === tier.value
                      ? 'bg-yellow-200 dark:bg-yellow-800 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200'
                      : 'bg-white dark:bg-gray-800 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  title={tier.description}
                >
                  {tier.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
            {error}
          </div>
        )}

        <div className="text-xs text-yellow-600 dark:text-yellow-400">
          💡 This tool allows you to test different tier features during development. 
          Changes are saved to Firestore and will persist until manually changed.
        </div>
      </div>
    </div>
  )
}
