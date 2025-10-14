import { CursorUsageSummary } from '@shared'

interface CursorCostsSummaryProps {
  summary: CursorUsageSummary
}

export default function CursorCostsSummary({ summary }: CursorCostsSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(amount)
  }

  const formatCurrencyGBP = (amount: number) => {
    // Approximate USD to GBP conversion (you might want to use a real exchange rate API)
    const gbpAmount = amount * 0.74
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(gbpAmount)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Cost per Request Card - Primary Green */}
      <div className="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 rounded-xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 bg-primary-500 rounded-lg shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
        </div>
        <div className="text-sm font-medium text-primary-800 mb-1">Cost per Request</div>
        <div className="text-2xl font-bold text-text-primary">
          {formatCurrency(summary.costPerRequest)}
        </div>
      </div>

      {/* Total Requests Card - Support Cat1 Blue */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1" style={{borderColor: '#0097D7'}}>
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 rounded-lg shadow-sm" style={{backgroundColor: '#0097D7'}}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
        <div className="text-sm font-medium text-blue-800 mb-1">Requests</div>
        <div className="text-2xl font-bold text-text-primary">
          {summary.totalRequests.toFixed(1)}
        </div>
      </div>

      {/* Total USD Card - Secondary Midnight Green */}
      <div className="bg-gradient-to-br from-secondary-50 to-secondary-100 border border-secondary-200 rounded-xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 bg-secondary-800 rounded-lg shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
        </div>
        <div className="text-sm font-medium text-secondary-800 mb-1">Total $</div>
        <div className="text-2xl font-bold text-text-primary">
          {formatCurrency(summary.totalCost)}
        </div>
      </div>

      {/* Total GBP Card - Tertiary Orange */}
      <div className="bg-gradient-to-br from-tertiary-50 to-tertiary-100 border border-tertiary-200 rounded-xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 bg-tertiary-500 rounded-lg shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
        </div>
        <div className="text-sm font-medium text-tertiary-800 mb-1">Total £</div>
        <div className="text-2xl font-bold text-text-primary">
          {formatCurrencyGBP(summary.totalCost)}
        </div>
      </div>
    </div>
  )
} 