import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../config/firebaseApp'
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { CurrencyRate, SupportedCurrency, SUPPORTED_CURRENCIES, FALLBACK_CURRENCY_RATES } from '@shared'

interface CurrencyHook {
  userCurrency: string
  currencySymbol: string
  currencyRates: Record<string, CurrencyRate>
  convertFromUSD: (usdAmount: number, targetCurrency?: string) => number
  formatCurrency: (amount: number, currency?: string, options?: Intl.NumberFormatOptions) => string
  updateUserCurrency: (currency: string) => Promise<void>
  loading: boolean
  error: string | null
}

export function useCurrency(): CurrencyHook {
  const { currentUser } = useAuth()
  const [userCurrency, setUserCurrency] = useState<string>('GBP')
  const [currencyRates, setCurrencyRates] = useState<Record<string, CurrencyRate>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get currency info
  const getCurrencyInfo = (code: string): SupportedCurrency => {
    return SUPPORTED_CURRENCIES.find(c => c.code === code) || SUPPORTED_CURRENCIES[0]
  }

  const currencySymbol = getCurrencyInfo(userCurrency).symbol

  // Load user's currency preference from user document
  useEffect(() => {
    if (!currentUser) {
      console.log('🔄 No current user, setting currency to GBP')
      setUserCurrency('GBP')
      setLoading(false)
      return
    }

    console.log('🔄 Setting up currency listener for user:', currentUser.uid)

    // Set up real-time listener for user document
    const unsubscribe = onSnapshot(
      doc(db, 'users', currentUser.uid),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data()
          const preferences = data.preferences
          const currency = preferences?.primaryCurrency || 'GBP'
          console.log('💰 User document exists, currency:', currency, 'preferences:', preferences)
          setUserCurrency(currency)
        } else {
          console.log('📄 User document does not exist, defaulting to GBP')
          setUserCurrency('GBP')
        }
        setLoading(false)
      },
      (err) => {
        console.error('❌ Error loading user currency:', err)
        setError('Failed to load currency preference')
        setUserCurrency('GBP')
        setLoading(false)
      }
    )

    return unsubscribe
  }, [currentUser])

  // Load currency rates
  useEffect(() => {
    const loadCurrencyRates = async () => {
      try {
        setLoading(true)
        
        // Try to load from Firestore first
        const ratesQuery = await import('firebase/firestore').then(({ collection, getDocs }) => 
          getDocs(collection(db, 'currencyRates'))
        )
        
        if (!ratesQuery.empty) {
          const rates: Record<string, CurrencyRate> = {}
          ratesQuery.docs.forEach(doc => {
            rates[doc.id] = doc.data() as CurrencyRate
          })
          setCurrencyRates(rates)
        } else {
          // Fallback to hardcoded rates
          console.log('No currency rates found in Firestore, using fallback rates')
          setCurrencyRates(FALLBACK_CURRENCY_RATES)
        }
      } catch (err) {
        console.error('Error loading currency rates:', err)
        setError('Failed to load currency rates, using fallback')
        setCurrencyRates(FALLBACK_CURRENCY_RATES)
      } finally {
        setLoading(false)
      }
    }

    loadCurrencyRates()
  }, [])

  // Convert from USD to target currency
  const convertFromUSD = (usdAmount: number, targetCurrency?: string): number => {
    const currency = targetCurrency || userCurrency
    
    if (currency === 'USD') {
      return usdAmount
    }

    const rate = currencyRates[currency]
    if (!rate) {
      console.warn(`No exchange rate found for ${currency}, using USD`)
      return usdAmount
    }

    return usdAmount * rate.rate
  }

  // Format currency with symbol
  const formatCurrency = (amount: number, currency?: string, options?: Intl.NumberFormatOptions): string => {
    const targetCurrency = currency || userCurrency
    
    const defaultOptions: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: targetCurrency,
      currencyDisplay: 'symbol',
    };

    return new Intl.NumberFormat('en-US', { ...defaultOptions, ...options }).format(amount);
  }

  // Update user's currency preference in user document
  const updateUserCurrency = async (currency: string): Promise<void> => {
    if (!currentUser) throw new Error('User not authenticated')

    try {
      setLoading(true)
      
      // Use setDoc with merge: true to create document if it doesn't exist
      await setDoc(doc(db, 'users', currentUser.uid), {
        preferences: {
          primaryCurrency: currency,
          lastUpdated: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      }, { merge: true })
      
      setUserCurrency(currency)
    } catch (err) {
      console.error('Error updating currency preference:', err)
      throw new Error('Failed to update currency preference')
    } finally {
      setLoading(false)
    }
  }

  return {
    userCurrency,
    currencySymbol,
    currencyRates,
    convertFromUSD,
    formatCurrency,
    updateUserCurrency,
    loading,
    error
  }
} 