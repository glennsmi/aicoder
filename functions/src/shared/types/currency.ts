export interface CurrencyRate {
  id: string
  code: string
  name: string
  symbol: string
  rate: number // Rate to USD (1 USD = rate * currency)
  lastUpdated: string
  isActive: boolean
}

export interface SupportedCurrency {
  code: string
  name: string
  symbol: string
  flag?: string
}

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', flag: '🇩🇰' },
  // Additional currencies
  { code: 'ARS', name: 'Argentine Peso', symbol: '$', flag: '🇦🇷' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BD', flag: '🇧🇭' },
  { code: 'BWP', name: 'Botswana Pula', symbol: 'P', flag: '🇧🇼' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
  { code: 'BND', name: 'Bruneian Dollar', symbol: 'B$', flag: '🇧🇳' },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', flag: '🇧🇬' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$', flag: '🇨🇱' },
  { code: 'CNY', name: 'Chinese Yuan Renminbi', symbol: '¥', flag: '🇨🇳' },
  { code: 'COP', name: 'Colombian Peso', symbol: '$', flag: '🇨🇴' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', flag: '🇨🇿' },
  { code: 'AED', name: 'Emirati Dirham', symbol: 'د.إ', flag: '🇦🇪' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', flag: '🇭🇺' },
  { code: 'ISK', name: 'Icelandic Krona', symbol: 'kr', flag: '🇮🇸' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩' },
  { code: 'IRR', name: 'Iranian Rial', symbol: '﷼', flag: '🇮🇷' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', flag: '🇮🇱' },
  { code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸', flag: '🇰🇿' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD', flag: '🇰🇼' },
  { code: 'LYD', name: 'Libyan Dinar', symbol: 'LD', flag: '🇱🇾' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾' },
  { code: 'MUR', name: 'Mauritian Rupee', symbol: '₨', flag: '🇲🇺' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', flag: '🇲🇽' },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: '₨', flag: '🇳🇵' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿' },
  { code: 'OMR', name: 'Omani Rial', symbol: '﷼', flag: '🇴🇲' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', flag: '🇵🇰' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', flag: '🇵🇱' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: '﷼', flag: '🇶🇦' },
  { code: 'RON', name: 'Romanian New Leu', symbol: 'lei', flag: '🇷🇴' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺' },
  { code: 'SAR', name: 'Saudi Arabian Riyal', symbol: '﷼', flag: '🇸🇦' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: '₨', flag: '🇱🇰' },
  { code: 'TWD', name: 'Taiwan New Dollar', symbol: 'NT$', flag: '🇹🇼' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭' },
  { code: 'TTD', name: 'Trinidadian Dollar', symbol: 'TT$', flag: '🇹🇹' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷' },
]

export interface UserCurrencyPreference {
  userId: string
  primaryCurrency: string
  secondaryCurrency?: string
  lastUpdated: string
}

// Fallback currency rates (rates to USD, updated December 2024)
// These will be used when Firestore is unavailable
export const FALLBACK_CURRENCY_RATES: Record<string, CurrencyRate> = {
  'USD': { id: 'USD', code: 'USD', name: 'US Dollar', symbol: '$', rate: 1.0, lastUpdated: '2024-12-19', isActive: true },
  'GBP': { id: 'GBP', code: 'GBP', name: 'British Pound', symbol: '£', rate: 0.79, lastUpdated: '2024-12-19', isActive: true },
  'EUR': { id: 'EUR', code: 'EUR', name: 'Euro', symbol: '€', rate: 0.95, lastUpdated: '2024-12-19', isActive: true },
  'CAD': { id: 'CAD', code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', rate: 1.43, lastUpdated: '2024-12-19', isActive: true },
  'AUD': { id: 'AUD', code: 'AUD', name: 'Australian Dollar', symbol: 'A$', rate: 1.58, lastUpdated: '2024-12-19', isActive: true },
  'JPY': { id: 'JPY', code: 'JPY', name: 'Japanese Yen', symbol: '¥', rate: 154.2, lastUpdated: '2024-12-19', isActive: true },
  'CHF': { id: 'CHF', code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', rate: 0.89, lastUpdated: '2024-12-19', isActive: true },
  'SEK': { id: 'SEK', code: 'SEK', name: 'Swedish Krona', symbol: 'kr', rate: 11.05, lastUpdated: '2024-12-19', isActive: true },
  'NOK': { id: 'NOK', code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', rate: 11.35, lastUpdated: '2024-12-19', isActive: true },
  'DKK': { id: 'DKK', code: 'DKK', name: 'Danish Krone', symbol: 'kr', rate: 7.08, lastUpdated: '2024-12-19', isActive: true },
  'ARS': { id: 'ARS', code: 'ARS', name: 'Argentine Peso', symbol: '$', rate: 1025.0, lastUpdated: '2024-12-19', isActive: true },
  'BHD': { id: 'BHD', code: 'BHD', name: 'Bahraini Dinar', symbol: 'BD', rate: 0.376, lastUpdated: '2024-12-19', isActive: true },
  'BWP': { id: 'BWP', code: 'BWP', name: 'Botswana Pula', symbol: 'P', rate: 13.65, lastUpdated: '2024-12-19', isActive: true },
  'BRL': { id: 'BRL', code: 'BRL', name: 'Brazilian Real', symbol: 'R$', rate: 6.12, lastUpdated: '2024-12-19', isActive: true },
  'BND': { id: 'BND', code: 'BND', name: 'Bruneian Dollar', symbol: 'B$', rate: 1.35, lastUpdated: '2024-12-19', isActive: true },
  'BGN': { id: 'BGN', code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', rate: 1.86, lastUpdated: '2024-12-19', isActive: true },
  'CLP': { id: 'CLP', code: 'CLP', name: 'Chilean Peso', symbol: '$', rate: 975.0, lastUpdated: '2024-12-19', isActive: true },
  'CNY': { id: 'CNY', code: 'CNY', name: 'Chinese Yuan Renminbi', symbol: '¥', rate: 7.28, lastUpdated: '2024-12-19', isActive: true },
  'COP': { id: 'COP', code: 'COP', name: 'Colombian Peso', symbol: '$', rate: 4385.0, lastUpdated: '2024-12-19', isActive: true },
  'CZK': { id: 'CZK', code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', rate: 24.15, lastUpdated: '2024-12-19', isActive: true },
  'AED': { id: 'AED', code: 'AED', name: 'Emirati Dirham', symbol: 'د.إ', rate: 3.67, lastUpdated: '2024-12-19', isActive: true },
  'HKD': { id: 'HKD', code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', rate: 7.78, lastUpdated: '2024-12-19', isActive: true },
  'HUF': { id: 'HUF', code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', rate: 395.0, lastUpdated: '2024-12-19', isActive: true },
  'ISK': { id: 'ISK', code: 'ISK', name: 'Icelandic Krona', symbol: 'kr', rate: 139.2, lastUpdated: '2024-12-19', isActive: true },
  'INR': { id: 'INR', code: 'INR', name: 'Indian Rupee', symbol: '₹', rate: 84.75, lastUpdated: '2024-12-19', isActive: true },
  'IDR': { id: 'IDR', code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', rate: 16125.0, lastUpdated: '2024-12-19', isActive: true },
  'IRR': { id: 'IRR', code: 'IRR', name: 'Iranian Rial', symbol: '﷼', rate: 42050.0, lastUpdated: '2024-12-19', isActive: true },
  'ILS': { id: 'ILS', code: 'ILS', name: 'Israeli Shekel', symbol: '₪', rate: 3.68, lastUpdated: '2024-12-19', isActive: true },
  'KZT': { id: 'KZT', code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸', rate: 515.0, lastUpdated: '2024-12-19', isActive: true },
  'KWD': { id: 'KWD', code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD', rate: 0.307, lastUpdated: '2024-12-19', isActive: true },
  'LYD': { id: 'LYD', code: 'LYD', name: 'Libyan Dinar', symbol: 'LD', rate: 4.85, lastUpdated: '2024-12-19', isActive: true },
  'MYR': { id: 'MYR', code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', rate: 4.48, lastUpdated: '2024-12-19', isActive: true },
  'MUR': { id: 'MUR', code: 'MUR', name: 'Mauritian Rupee', symbol: '₨', rate: 46.85, lastUpdated: '2024-12-19', isActive: true },
  'MXN': { id: 'MXN', code: 'MXN', name: 'Mexican Peso', symbol: '$', rate: 20.15, lastUpdated: '2024-12-19', isActive: true },
  'NPR': { id: 'NPR', code: 'NPR', name: 'Nepalese Rupee', symbol: '₨', rate: 135.6, lastUpdated: '2024-12-19', isActive: true },
  'NZD': { id: 'NZD', code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', rate: 1.75, lastUpdated: '2024-12-19', isActive: true },
  'OMR': { id: 'OMR', code: 'OMR', name: 'Omani Rial', symbol: '﷼', rate: 0.385, lastUpdated: '2024-12-19', isActive: true },
  'PKR': { id: 'PKR', code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', rate: 278.5, lastUpdated: '2024-12-19', isActive: true },
  'PHP': { id: 'PHP', code: 'PHP', name: 'Philippine Peso', symbol: '₱', rate: 58.45, lastUpdated: '2024-12-19', isActive: true },
  'PLN': { id: 'PLN', code: 'PLN', name: 'Polish Zloty', symbol: 'zł', rate: 4.12, lastUpdated: '2024-12-19', isActive: true },
  'QAR': { id: 'QAR', code: 'QAR', name: 'Qatari Riyal', symbol: '﷼', rate: 3.64, lastUpdated: '2024-12-19', isActive: true },
  'RON': { id: 'RON', code: 'RON', name: 'Romanian New Leu', symbol: 'lei', rate: 4.72, lastUpdated: '2024-12-19', isActive: true },
  'RUB': { id: 'RUB', code: 'RUB', name: 'Russian Ruble', symbol: '₽', rate: 98.5, lastUpdated: '2024-12-19', isActive: true },
  'SAR': { id: 'SAR', code: 'SAR', name: 'Saudi Arabian Riyal', symbol: '﷼', rate: 3.75, lastUpdated: '2024-12-19', isActive: true },
  'SGD': { id: 'SGD', code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', rate: 1.35, lastUpdated: '2024-12-19', isActive: true },
  'ZAR': { id: 'ZAR', code: 'ZAR', name: 'South African Rand', symbol: 'R', rate: 18.25, lastUpdated: '2024-12-19', isActive: true },
  'KRW': { id: 'KRW', code: 'KRW', name: 'South Korean Won', symbol: '₩', rate: 1435.0, lastUpdated: '2024-12-19', isActive: true },
  'LKR': { id: 'LKR', code: 'LKR', name: 'Sri Lankan Rupee', symbol: '₨', rate: 295.0, lastUpdated: '2024-12-19', isActive: true },
  'TWD': { id: 'TWD', code: 'TWD', name: 'Taiwan New Dollar', symbol: 'NT$', rate: 32.65, lastUpdated: '2024-12-19', isActive: true },
  'THB': { id: 'THB', code: 'THB', name: 'Thai Baht', symbol: '฿', rate: 34.85, lastUpdated: '2024-12-19', isActive: true },
  'TTD': { id: 'TTD', code: 'TTD', name: 'Trinidadian Dollar', symbol: 'TT$', rate: 6.78, lastUpdated: '2024-12-19', isActive: true },
  'TRY': { id: 'TRY', code: 'TRY', name: 'Turkish Lira', symbol: '₺', rate: 34.85, lastUpdated: '2024-12-19', isActive: true },
} 