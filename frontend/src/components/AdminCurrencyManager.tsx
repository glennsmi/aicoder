import { useState, useEffect } from 'react'
import { db } from '../config/firebaseApp'
import { collection, getDocs, doc, setDoc } from 'firebase/firestore'
import { CurrencyRate, SUPPORTED_CURRENCIES } from '@shared'
import { useAuth } from '../contexts/AuthContext'

const ADMIN_EMAILS = ['glenn@aicoder.guru'] // Replace with actual admin emails

// Mapping from currency names to codes
const CURRENCY_NAME_TO_CODE: Record<string, string> = {
  'US Dollar': 'USD',
  'Euro': 'EUR',
  'British Pound': 'GBP',
  'Australian Dollar': 'AUD',
  'Canadian Dollar': 'CAD',
  'Swiss Franc': 'CHF',
  'Japanese Yen': 'JPY',
  'Swedish Krona': 'SEK',
  'Norwegian Krone': 'NOK',
  'Danish Krone': 'DKK',
  // Additional currencies
  'Argentine Peso': 'ARS',
  'Bahraini Dinar': 'BHD',
  'Botswana Pula': 'BWP',
  'Brazilian Real': 'BRL',
  'Bruneian Dollar': 'BND',
  'Bulgarian Lev': 'BGN',
  'Chilean Peso': 'CLP',
  'Chinese Yuan Renminbi': 'CNY',
  'Colombian Peso': 'COP',
  'Czech Koruna': 'CZK',
  'Emirati Dirham': 'AED',
  'Hong Kong Dollar': 'HKD',
  'Hungarian Forint': 'HUF',
  'Icelandic Krona': 'ISK',
  'Indian Rupee': 'INR',
  'Indonesian Rupiah': 'IDR',
  'Iranian Rial': 'IRR',
  'Israeli Shekel': 'ILS',
  'Kazakhstani Tenge': 'KZT',
  'Kuwaiti Dinar': 'KWD',
  'Libyan Dinar': 'LYD',
  'Malaysian Ringgit': 'MYR',
  'Mauritian Rupee': 'MUR',
  'Mexican Peso': 'MXN',
  'Nepalese Rupee': 'NPR',
  'New Zealand Dollar': 'NZD',
  'Omani Rial': 'OMR',
  'Pakistani Rupee': 'PKR',
  'Philippine Peso': 'PHP',
  'Polish Zloty': 'PLN',
  'Qatari Riyal': 'QAR',
  'Romanian New Leu': 'RON',
  'Russian Ruble': 'RUB',
  'Saudi Arabian Riyal': 'SAR',
  'Singapore Dollar': 'SGD',
  'South African Rand': 'ZAR',
  'South Korean Won': 'KRW',
  'Sri Lankan Rupee': 'LKR',
  'Taiwan New Dollar': 'TWD',
  'Thai Baht': 'THB',
  'Trinidadian Dollar': 'TTD',
  'Turkish Lira': 'TRY',
  // Alternative names that might appear in data
  'Swiss Francs': 'CHF',
  'Yen': 'JPY',
  'Krona': 'SEK',
  'Krone': 'NOK',
  'Yuan': 'CNY',
  'Chinese Yuan': 'CNY',
  'Won': 'KRW',
  'Rupee': 'INR'
}

// Default rates data from user
const DEFAULT_RATES_DATA = `Argentine Peso	1131.004260	0.000884
Australian Dollar	1.539880	0.649401
Bahraini Dinar	0.376000	2.659574
Botswana Pula	13.495197	0.074100
Brazilian Real	5.656207	0.176797
British Pound	0.740165	1.351051
Bruneian Dollar	1.284791	0.778337
Bulgarian Lev	1.720511	0.581223
Canadian Dollar	1.373657	0.727984
Chilean Peso	939.967828	0.001064
Chinese Yuan Renminbi	7.179801	0.139280
Colombian Peso	4159.864828	0.000240
Czech Koruna	21.855516	0.045755
Danish Krone	6.564278	0.152340
Emirati Dirham	3.672500	0.272294
Euro	0.879683	1.136773
Hong Kong Dollar	7.832737	0.127669
Hungarian Forint	355.355157	0.002814
Icelandic Krona	127.641537	0.007834
Indian Rupee	85.156494	0.011743
Indonesian Rupiah	16237.462917	0.000062
Iranian Rial	42002.597895	0.000024
Israeli Shekel	3.600340	0.277752
Japanese Yen	142.565794	0.007014
Kazakhstani Tenge	511.383445	0.001955
Kuwaiti Dinar	0.307400	3.253096
Libyan Dinar	5.463244	0.183041
Malaysian Ringgit	4.230609	0.236373
Mauritian Rupee	45.510192	0.021973
Mexican Peso	19.238735	0.051978
Nepalese Rupee	136.314259	0.007336
New Zealand Dollar	1.670523	0.598615
Norwegian Krone	10.110676	0.098905
Omani Rial	0.384899	2.598087
Pakistani Rupee	281.844055	0.003548
Philippine Peso	55.365448	0.018062
Polish Zloty	3.745015	0.267022
Qatari Riyal	3.640000	0.274725
Romanian New Leu	4.448742	0.224783
Russian Ruble	79.560188	0.012569
Saudi Arabian Riyal	3.750000	0.266667
Singapore Dollar	1.284791	0.778337
South African Rand	17.836954	0.056063
South Korean Won	1365.607531	0.000732
Sri Lankan Rupee	299.406297	0.003340
Swedish Krona	9.532958	0.104899
Swiss Franc	0.821150	1.217804
Taiwan New Dollar	29.994936	0.033339
Thai Baht	32.531951	0.030739
Trinidadian Dollar	6.806006	0.146929
Turkish Lira	39.025647	0.025624`

export default function AdminCurrencyManager() {
  const { currentUser } = useAuth()
  const [currencyRates, setCurrencyRates] = useState<CurrencyRate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bulkRatesText, setBulkRatesText] = useState('')
  const [parseResult, setParseResult] = useState<string | null>(null)
  const [editingRates, setEditingRates] = useState<Record<string, string>>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<Record<string, boolean>>({})

  // Check if user is admin
  const isAdmin = currentUser && ADMIN_EMAILS.includes(currentUser.email || '')

  // Load currency rates
  useEffect(() => {
    if (!isAdmin) return

    const loadRates = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'currencyRates'))
        const rates: CurrencyRate[] = []
        snapshot.forEach((doc) => {
          rates.push(doc.data() as CurrencyRate)
        })
        setCurrencyRates(rates)
      } catch (err) {
        console.error('Error loading currency rates:', err)
        setError('Failed to load currency rates')
      } finally {
        setLoading(false)
      }
    }

    loadRates()
  }, [isAdmin])

  // Initialize default rates
  const initializeDefaultRates = async () => {
    setSaving('default')
    try {
      const defaultRates = [
        { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1.0 },
        { code: 'GBP', name: 'British Pound', symbol: '£', rate: 0.74 },
        { code: 'EUR', name: 'Euro', symbol: '€', rate: 0.85 },
        { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', rate: 1.25 },
        { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', rate: 1.35 },
        { code: 'JPY', name: 'Japanese Yen', symbol: '¥', rate: 110 },
        { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', rate: 0.82 },
        { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', rate: 8.5 },
        { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', rate: 8.3 },
        { code: 'DKK', name: 'Danish Krone', symbol: 'kr', rate: 6.2 },
      ]

      for (const rate of defaultRates) {
        const currencyRate: CurrencyRate = {
          id: rate.code,
          code: rate.code,
          name: rate.name,
          symbol: rate.symbol,
          rate: rate.rate,
          lastUpdated: new Date().toISOString(),
          isActive: true
        }
        
        await setDoc(doc(db, 'currencyRates', rate.code), currencyRate)
      }

      // Reload rates
      const snapshot = await getDocs(collection(db, 'currencyRates'))
      const rates: CurrencyRate[] = []
      snapshot.forEach((doc) => {
        rates.push(doc.data() as CurrencyRate)
      })
      setCurrencyRates(rates)
      
    } catch (err) {
      console.error('Error initializing rates:', err)
      setError('Failed to initialize rates')
    } finally {
      setSaving(null)
    }
  }

  // Initialize comprehensive rates from the provided data
  const initializeComprehensiveRates = async () => {
    setSaving('comprehensive')
    try {
      // Add USD rate first
      const usdRate: CurrencyRate = {
        id: 'USD',
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        rate: 1.0,
        lastUpdated: new Date().toISOString(),
        isActive: true
      }
      await setDoc(doc(db, 'currencyRates', 'USD'), usdRate)

      // Parse and save all other rates
      const parsedRates = parseBulkRates(DEFAULT_RATES_DATA)
      
      for (const { code, rate } of parsedRates) {
        const existingRate = currencyRates.find(r => r.code === code)
        const supportedCurrency = SUPPORTED_CURRENCIES.find(c => c.code === code)
        
        if (!supportedCurrency) continue

        const currencyRate: CurrencyRate = {
          id: code,
          code,
          name: supportedCurrency.name,
          symbol: supportedCurrency.symbol,
          rate,
          lastUpdated: new Date().toISOString(),
          isActive: existingRate?.isActive ?? true
        }
        
        await setDoc(doc(db, 'currencyRates', code), currencyRate)
      }

      // Reload rates
      const snapshot = await getDocs(collection(db, 'currencyRates'))
      const rates: CurrencyRate[] = []
      snapshot.forEach((doc) => {
        rates.push(doc.data() as CurrencyRate)
      })
      setCurrencyRates(rates)
      
      setParseResult(`✅ Successfully initialized ${parsedRates.length + 1} currency rates (including USD)!`)
      
    } catch (err) {
      console.error('Error initializing comprehensive rates:', err)
      setError('Failed to initialize comprehensive rates')
    } finally {
      setSaving(null)
    }
  }

  // Update a currency rate with explicit save
  const saveRate = async (code: string) => {
    const newRateStr = editingRates[code]
    if (!newRateStr) return

    const newRate = parseFloat(newRateStr)
    if (isNaN(newRate) || newRate <= 0) {
      setError(`Invalid rate for ${code}. Please enter a positive number.`)
      return
    }

    setSaving(code)
    try {
      const existingRate = currencyRates.find(r => r.code === code)
      const supportedCurrency = SUPPORTED_CURRENCIES.find(c => c.code === code)
      
      if (!supportedCurrency) {
        setError(`Unsupported currency: ${code}`)
        return
      }

      const updatedRate: CurrencyRate = {
        id: code,
        code,
        name: supportedCurrency.name,
        symbol: supportedCurrency.symbol,
        rate: newRate,
        lastUpdated: new Date().toISOString(),
        isActive: existingRate?.isActive ?? true
      }

      await setDoc(doc(db, 'currencyRates', code), updatedRate)
      
      // Update local state
      setCurrencyRates(prev => {
        const filtered = prev.filter(r => r.code !== code)
        return [...filtered, updatedRate]
      })
      
      // Clear editing and unsaved states
      setEditingRates(prev => {
        const newState = { ...prev }
        delete newState[code]
        return newState
      })
      
      setHasUnsavedChanges(prev => {
        const newState = { ...prev }
        delete newState[code]
        return newState
      })
      
    } catch (err) {
      console.error('Error updating rate:', err)
      setError(`Failed to update ${code} rate`)
    } finally {
      setSaving(null)
    }
  }

  // Cancel editing for a currency
  const cancelEdit = (code: string) => {
    setEditingRates(prev => {
      const newState = { ...prev }
      delete newState[code]
      return newState
    })
    
    setHasUnsavedChanges(prev => {
      const newState = { ...prev }
      delete newState[code]
      return newState
    })
  }

  // Toggle currency active status
  const toggleActive = async (code: string) => {
    setSaving(code)
    try {
      const existingRate = currencyRates.find(r => r.code === code)
      if (!existingRate) return

      const updatedRate: CurrencyRate = {
        ...existingRate,
        isActive: !existingRate.isActive,
        lastUpdated: new Date().toISOString()
      }

      await setDoc(doc(db, 'currencyRates', code), updatedRate)
      
      // Update local state
      setCurrencyRates(prev => 
        prev.map(r => r.code === code ? updatedRate : r)
      )
      
    } catch (err) {
      console.error('Error toggling rate:', err)
      setError(`Failed to toggle ${code} status`)
    } finally {
      setSaving(null)
    }
  }

  // Parse bulk rates from text format
  const parseBulkRates = (text: string) => {
    try {
      const lines = text.trim().split('\n')
      const parsedRates: { code: string, rate: number, name: string }[] = []
      const skippedCurrencies: string[] = []

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        
        // Skip header line or empty lines
        if (line.includes('UTC') || line.includes('Top ') || !line) {
          continue
        }

        // Split by tab
        const parts = line.split('\t')
        if (parts.length < 2) continue

        const currencyName = parts[0].trim()
        let rateStr = parts[1].trim()
        
        // Handle USD special case (remove "USD" suffix)
        if (rateStr.includes('USD')) {
          rateStr = rateStr.replace('USD', '').trim()
        }

        const rate = parseFloat(rateStr)
        if (isNaN(rate)) continue

        // Map currency name to code
        const code = CURRENCY_NAME_TO_CODE[currencyName]
        if (!code) {
          skippedCurrencies.push(currencyName)
          continue
        }

        // Check if we support this currency
        const supportedCurrency = SUPPORTED_CURRENCIES.find(c => c.code === code)
        if (!supportedCurrency) {
          skippedCurrencies.push(`${currencyName} (${code})`)
          continue
        }

        parsedRates.push({
          code,
          rate,
          name: supportedCurrency.name
        })
      }

      let resultMessage = `✅ Parsed ${parsedRates.length} currency rates:\n`
      parsedRates.forEach(r => {
        resultMessage += `• ${r.name} (${r.code}): ${r.rate}\n`
      })

      if (skippedCurrencies.length > 0) {
        resultMessage += `\n⚠️ Skipped ${skippedCurrencies.length} unsupported currencies:\n`
        skippedCurrencies.forEach(c => {
          resultMessage += `• ${c}\n`
        })
      }

      setParseResult(resultMessage)
      return parsedRates

    } catch (err) {
      setError('Failed to parse currency rates. Please check the format.')
      return []
    }
  }

  // Apply bulk rates update
  const applyBulkRates = async () => {
    const parsedRates = parseBulkRates(bulkRatesText)
    if (parsedRates.length === 0) return

    setSaving('bulk')
    try {
      for (const { code, rate } of parsedRates) {
        const existingRate = currencyRates.find(r => r.code === code)
        const supportedCurrency = SUPPORTED_CURRENCIES.find(c => c.code === code)
        
        if (!supportedCurrency) continue

        const currencyRate: CurrencyRate = {
          id: code,
          code,
          name: supportedCurrency.name,
          symbol: supportedCurrency.symbol,
          rate,
          lastUpdated: new Date().toISOString(),
          isActive: existingRate?.isActive ?? true
        }
        
        await setDoc(doc(db, 'currencyRates', code), currencyRate)
      }

      // Reload rates
      const snapshot = await getDocs(collection(db, 'currencyRates'))
      const rates: CurrencyRate[] = []
      snapshot.forEach((doc) => {
        rates.push(doc.data() as CurrencyRate)
      })
      setCurrencyRates(rates)
      
      setBulkRatesText('')
      setParseResult(`✅ Successfully updated ${parsedRates.length} currency rates!`)
      
    } catch (err) {
      console.error('Error applying bulk rates:', err)
      setError('Failed to apply bulk rates')
    } finally {
      setSaving(null)
    }
  }

  if (!isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-700">Access denied. Admin privileges required.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
        <p>Loading currency rates...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gunmetal-900">Currency Rate Management</h2>
        <div className="flex gap-3">
          <button
            onClick={initializeDefaultRates}
            disabled={saving === 'default'}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm"
          >
            {saving === 'default' ? 'Initializing...' : 'Initialize Basic Rates'}
          </button>
          <button
            onClick={initializeComprehensiveRates}
            disabled={saving === 'comprehensive'}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 text-sm flex items-center"
          >
            {saving === 'comprehensive' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b border-white mr-2"></div>
                Initializing All...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                Initialize All Currencies
              </>
            )}
          </button>
        </div>
      </div>

      {/* Initialization Info */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-medium text-blue-900 mb-2">Initialization Options</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="bg-white rounded p-3 border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-1">Basic Rates (10 currencies)</h4>
            <p className="text-blue-700 text-xs">
              Initializes major currencies: USD, GBP, EUR, CAD, AUD, JPY, CHF, SEK, NOK, DKK
            </p>
          </div>
          <div className="bg-white rounded p-3 border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-1">All Currencies ({SUPPORTED_CURRENCIES.length} currencies)</h4>
            <p className="text-blue-700 text-xs">
              Initializes all supported currencies with current exchange rates from global markets
            </p>
          </div>
        </div>
        <div className="mt-3 text-xs text-blue-600">
          💡 <strong>Tip:</strong> Use "All Currencies" for complete global coverage, or "Basic Rates" for common currencies only.
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 text-xs ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Bulk Import Section */}
      <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-medium text-blue-900 mb-3">Bulk Import Currency Rates</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-blue-800 mb-2">
              Paste currency rates data from this page <a href="https://www.x-rates.com/table/?from=USD&amount=1" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">https://www.xe.com/currencytables/?from=USD</a>:
            </label>
            <textarea
              value={bulkRatesText}
              onChange={(e) => {
                setBulkRatesText(e.target.value)
                setParseResult(null)
              }}
              placeholder="Paste currency rates in format:
US Dollar	1.00 USD	inv. 1.00 USD
Euro	0.879683	1.136773
British Pound	0.740165	1.351051
..."
              className="w-full h-32 px-3 py-2 border border-blue-300 rounded-lg text-sm font-mono resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => {
                parseBulkRates(bulkRatesText)
                // Just preview, don't apply yet
              }}
              disabled={!bulkRatesText.trim() || saving === 'bulk'}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm"
            >
              Preview Rates
            </button>
            
            <button
              onClick={applyBulkRates}
              disabled={!bulkRatesText.trim() || saving === 'bulk'}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 text-sm"
            >
              {saving === 'bulk' ? 'Applying...' : 'Apply Rates'}
            </button>
            
            <button
              onClick={() => {
                setBulkRatesText('')
                setParseResult(null)
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
            >
              Clear
            </button>
          </div>

          {parseResult && (
            <div className="bg-white border border-blue-300 rounded-lg p-3">
              <h4 className="font-medium text-blue-900 mb-2">Parse Result:</h4>
              <pre className="text-xs text-blue-800 whitespace-pre-wrap">{parseResult}</pre>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {SUPPORTED_CURRENCIES.map((currency) => {
          const rate = currencyRates.find(r => r.code === currency.code)
          const isEditing = editingRates[currency.code] !== undefined
          const hasChanges = hasUnsavedChanges[currency.code]
          const currentValue = editingRates[currency.code] ?? rate?.rate?.toString() ?? ''
          
          return (
            <div key={currency.code} className={`bg-gray-50 rounded-lg p-4 border-2 ${
              hasChanges ? 'border-orange-300 bg-orange-50' : 'border-transparent'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{currency.flag}</span>
                  <div>
                    <h3 className="font-medium text-gunmetal-900">
                      {currency.name} ({currency.code})
                    </h3>
                    <p className="text-sm text-gunmetal-600">
                      Symbol: {currency.symbol}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium">Rate:</label>
                    <input
                      type="text"
                      value={currentValue}
                      onChange={(e) => {
                        const newValue = e.target.value
                        setEditingRates(prev => ({
                          ...prev,
                          [currency.code]: newValue
                        }))
                        
                        // Mark as having unsaved changes if different from saved rate
                        const isDifferent = newValue !== (rate?.rate?.toString() ?? '')
                        setHasUnsavedChanges(prev => ({
                          ...prev,
                          [currency.code]: isDifferent && newValue.trim() !== ''
                        }))
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          saveRate(currency.code)
                        }
                        if (e.key === 'Escape') {
                          cancelEdit(currency.code)
                        }
                      }}
                      disabled={saving === currency.code}
                      placeholder="0.0000"
                      className={`w-32 px-2 py-1 border rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                        hasChanges ? 'border-orange-400 bg-orange-50' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  
                  {/* Save/Cancel buttons when editing */}
                  {isEditing && hasChanges && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => saveRate(currency.code)}
                        disabled={saving === currency.code}
                        className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-50 flex items-center"
                      >
                        {saving === currency.code ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-1"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Save
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => cancelEdit(currency.code)}
                        disabled={saving === currency.code}
                        className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  
                  <button
                    onClick={() => toggleActive(currency.code)}
                    disabled={saving === currency.code}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      rate?.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {rate?.isActive ? 'Active' : 'Inactive'}
                  </button>
                  
                  {rate?.lastUpdated && (
                    <span className="text-xs text-gunmetal-500">
                      Updated: {new Date(rate.lastUpdated).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              
              {hasChanges && (
                <div className="mt-2 text-xs text-orange-600 font-medium">
                  ⚠️ Unsaved changes - Click Save to commit to database
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Instructions:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Exchange rates are relative to USD (1 USD = rate × currency)</li>
          <li>• For example: If 1 USD = 0.74 GBP, enter 0.74 for GBP rate</li>
          <li>• Changes take effect immediately for all users</li>
          <li>• Inactive currencies won't appear in user currency selection</li>
        </ul>
      </div>
    </div>
  )
} 