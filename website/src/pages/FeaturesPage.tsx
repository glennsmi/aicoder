export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-sand-300 dark:bg-secondary-900">
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-sand-300 via-primary-50/30 to-sand-300 dark:from-secondary-900 dark:via-secondary-800/50 dark:to-secondary-900">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-neutral-900 dark:text-white">
            Powerful Analytics for Your AI Coding Tools
          </h1>
          <p className="text-xl text-neutral-700 dark:text-sand-300 leading-relaxed">
            Everything you need to track, analyze, and optimize your team's AI coding tool usage
          </p>
        </div>
      </section>

      {/* Model Breakdown Analytics */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4">
                Model Breakdown Analytics
              </h2>
              <p className="text-lg text-neutral-700 dark:text-sand-300 mb-6 leading-relaxed">
                See exactly which AI models your team uses - Claude 4.6 Opus, GPT-5.2, Gemini 3.0, and more. Track usage patterns, costs per model, and identify which models deliver the best value.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-accent-500 dark:text-accent-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-neutral-700 dark:text-sand-300">Input, output, and total token counts per model</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-accent-500 dark:text-accent-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-neutral-700 dark:text-sand-300">Cost breakdown in USD, EUR, GBP or your local currency.</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-accent-500 dark:text-accent-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-neutral-700 dark:text-sand-300">Cost efficiency metrics per million tokens</span>
                </li>
              </ul>
            </div>
            <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-2xl p-2 border border-neutral-200 dark:border-neutral-700">
              <img 
                src="/images/model-breakdown.png" 
                alt="Model Breakdown Analytics Table" 
                className="rounded-lg w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Token Breakdown */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-sand-100 dark:bg-secondary-950">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 bg-white dark:bg-secondary-800 rounded-xl shadow-2xl p-2 border border-neutral-200 dark:border-neutral-700">
              <img 
                src="/images/token-breakdown.png" 
                alt="Token Usage Breakdown" 
                className="rounded-lg w-full"
              />
            </div>
            <div className="order-1 md:order-2">
              <div className="w-12 h-12 bg-accent-100 dark:bg-accent-900/30 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4">
                Detailed Token Analysis
              </h2>
              <p className="text-lg text-neutral-700 dark:text-sand-300 mb-6 leading-relaxed">
                Understand exactly where your tokens are being spent with comprehensive breakdowns including cache writes, cache reads, and cache hits for maximum cost optimization.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-accent-500 dark:text-accent-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-neutral-700 dark:text-sand-300">Input tokens with and without cache writes</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-accent-500 dark:text-accent-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-neutral-700 dark:text-sand-300">Output token tracking</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-accent-500 dark:text-accent-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-neutral-700 dark:text-sand-300">Cache efficiency monitoring (write/read ratios)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Charts */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4">
                Drillable Interactive Charts
              </h2>
              <p className="text-lg text-neutral-700 dark:text-sand-300 mb-6 leading-relaxed">
                Visualize usage patterns over time with interactive charts. Filter by date range, switch between tokens and costs, and view data daily, hourly, or in real-time.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-accent-500 dark:text-accent-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-neutral-700 dark:text-sand-300">Stacked bar charts showing model distribution</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-accent-500 dark:text-accent-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-neutral-700 dark:text-sand-300">Custom date range selection</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-accent-500 dark:text-accent-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-neutral-700 dark:text-sand-300">Toggle between tokens, costs, and daily/hourly views</span>
                </li>
              </ul>
            </div>
            <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-2xl p-2 border border-neutral-200 dark:border-neutral-700">
              <img 
                src="/images/costs-chart.png" 
                alt="Interactive Drillable Charts" 
                className="rounded-lg w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Usage Summary */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-sand-100 dark:bg-secondary-950">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 bg-white dark:bg-secondary-800 rounded-xl shadow-2xl p-2 border border-neutral-200 dark:border-neutral-700">
              <img 
                src="/images/usage-summary.png" 
                alt="Usage Summary Dashboard" 
                className="rounded-lg w-full"
              />
            </div>
            <div className="order-1 md:order-2">
              <div className="w-12 h-12 bg-secondary-100 dark:bg-secondary-700 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-secondary-600 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4">
                Comprehensive Usage Summary
              </h2>
              <p className="text-lg text-neutral-700 dark:text-sand-300 mb-6 leading-relaxed">
                Get a bird's-eye view of your entire AI coding tool usage with summary cards showing total tokens, costs in multiple currencies, models used, and active days.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-accent-500 dark:text-accent-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-neutral-700 dark:text-sand-300">Total tokens across all models and time periods</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-accent-500 dark:text-accent-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-neutral-700 dark:text-sand-300">Multi-currency cost display (USD & GBP)</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-accent-500 dark:text-accent-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-neutral-700 dark:text-sand-300">Track number of AI models and active usage days</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-center text-neutral-900 dark:text-white mb-12">
            And Much More...
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-sand-100 dark:bg-secondary-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700">
              <div className="w-12 h-12 bg-accent-100 dark:bg-accent-900/30 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
                Team & User Leaderboards
              </h3>
              <p className="text-neutral-700 dark:text-neutral-500">
                League tables showing top users and teams by activity, cost, and adoption. Encourage healthy competition and identify power users.
              </p>
            </div>

            <div className="bg-sand-100 dark:bg-secondary-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
                Historical Data Storage
              </h3>
              <p className="text-neutral-700 dark:text-neutral-500">
                All usage data stored over time. Track trends, compare periods, and see how AI adoption evolves across your organization.
              </p>
            </div>

            <div className="bg-sand-100 dark:bg-secondary-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700">
              <div className="w-12 h-12 bg-secondary-100 dark:bg-secondary-700 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-secondary-600 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
                API Integrations
              </h3>
              <p className="text-neutral-700 dark:text-neutral-500">
                Direct API integrations with Cursor, GitHub Copilot, Codeium, and more. Automatic data sync for seamless monitoring.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-500 to-primary-600">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold text-secondary-900 mb-6">
            Ready to Master AI Coding Tools?
          </h2>
          <p className="text-xl text-secondary-900/80 mb-8">
            Start tracking your team's usage today. Free forever for individual developers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/#pricing"
              className="inline-flex items-center justify-center px-8 py-4 bg-secondary-900 text-white text-lg font-semibold rounded-lg hover:bg-secondary-800 transition-all duration-200 shadow-lg"
            >
              View Pricing
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <a
              href="/faq"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-secondary-900 text-lg font-semibold rounded-lg hover:bg-sand-100 transition-all duration-200"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

