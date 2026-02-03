import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../config/firebaseApp'
import { useAuth } from '../contexts/AuthContext'

export default function CreateStripeCustomerButton() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleCreateCustomer = async () => {
    if (!user) {
      setStatus('error')
      setMessage('You must be logged in')
      return
    }

    try {
      setLoading(true)
      setStatus('idle')
      setMessage('')

      const createCustomer = httpsCallable(functions, 'createStripeCustomer')

      const result = await createCustomer({
        userId: user.id,
        email: user.email
      })

      const data = result.data as any

      if (data.success) {
        setStatus('success')
        setMessage(`Stripe customer created: ${data.customerId}`)
        console.log('Stripe customer created:', data)

        // Reload the page after a short delay to reflect the changes
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setStatus('error')
        setMessage(data.message || 'Failed to create customer')
      }
    } catch (error: any) {
      console.error('Error creating Stripe customer:', error)
      setStatus('error')
      setMessage(error.message || 'Failed to create Stripe customer')
    } finally {
      setLoading(false)
    }
  }

  // Don't show if user already has a Stripe customer
  if (user?.stripeCustomerId) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-400">
              Stripe Customer Linked
            </p>
            <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
              Customer ID: {user.stripeCustomerId}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-400">
            No Stripe Customer Found
          </h3>
          <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-1">
            This account doesn't have a linked Stripe customer. Create one to enable billing portal access and subscription management.
          </p>

          {status === 'success' && (
            <div className="mt-3 p-2 bg-green-100 dark:bg-green-900/30 rounded text-xs text-green-800 dark:text-green-400">
              ✓ {message}
            </div>
          )}

          {status === 'error' && (
            <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-800 dark:text-red-400">
              ✗ {message}
            </div>
          )}

          <button
            onClick={handleCreateCustomer}
            disabled={loading}
            className="mt-3 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Stripe Customer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
