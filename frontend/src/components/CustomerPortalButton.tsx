import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../config/firebaseApp'
import { useAuth } from '../contexts/AuthContext'

interface CustomerPortalButtonProps {
  className?: string
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  label?: string
}

export default function CustomerPortalButton({
  className = '',
  variant = 'primary',
  size = 'md',
  disabled = false,
  label,
}: CustomerPortalButtonProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (!user) {
      alert('You must be logged in to manage your subscription')
      return
    }

    // Check if user has a paid subscription
    const hasPaidTier = user.tier && (user.tier === 'paid_individual' || user.tier === 'team' || user.tier === 'enterprise')

    if (!hasPaidTier) {
      alert('You need an active subscription to manage billing')
      return
    }

    try {
      setLoading(true)

      // Create billing portal session
      const createPortalSession = httpsCallable(functions, 'createBillingPortalSession')
      const result = await createPortalSession({
        returnUrl: window.location.origin
      })

      const data = result.data as any

      if (data.success && data.url) {
        // Redirect to Stripe billing portal
        window.location.href = data.url
      } else {
        throw new Error('Failed to create billing portal session')
      }

    } catch (error: any) {
      console.error('Failed to open customer portal:', error)
      alert(`Failed to open customer portal: ${error.message || 'Please try again.'}`)
      setLoading(false)
    }
  }

  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center gap-2 font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-5 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base'
    }

    const variantClasses = {
      primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 shadow-sm',
      secondary: 'bg-secondary-500 text-white hover:bg-secondary-600 focus:ring-secondary-500 shadow-sm',
      outline: 'border border-neutral-200 dark:border-secondary-600 text-gunmetal-700 dark:text-gray-300 hover:bg-neutral-50 dark:hover:bg-secondary-800 focus:ring-secondary-400',
    }

    const disabledClasses = disabled || loading
      ? 'opacity-50 cursor-not-allowed'
      : 'cursor-pointer'

    return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${disabledClasses} ${className}`
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={getButtonClasses()}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Opening...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {label || 'Manage Subscription'}
        </>
      )}
    </button>
  )
}
