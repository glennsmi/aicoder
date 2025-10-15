export default function Features() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-sand-100 dark:bg-secondary-950">
      <div className="container mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-neutral-900 dark:text-white">Powerful Analytics</span>
            <br />
            <span className="bg-gradient-to-r from-primary-500 to-primary-500 bg-clip-text text-transparent">
              Built for Teams
            </span>
          </h2>
          <p className="text-xl text-neutral-700 dark:text-sand-300 max-w-3xl mx-auto">
            Track every aspect of your team's AI coding tool usage
          </p>
        </div>

        {/* Feature 1: Model Breakdown */}
        <div className="mb-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4">
                Model Breakdown Analytics
              </h3>
              <p className="text-lg text-neutral-700 dark:text-sand-300 mb-6 leading-relaxed">
                See exactly which AI models your team uses - Claude 4.5 Sonnet, GPT-5, Gemini, and more. Track usage patterns, costs per model, and identify which models deliver the best value for your team.
              </p>
              <ul className="space-y-3 mb-6">
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
                  <span className="text-neutral-700 dark:text-sand-300">Cost breakdown in USD and GBP</span>
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

        {/* Feature 2: Token Breakdown */}
        <div className="mb-12">
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
              <h3 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4">
                Detailed Token Analysis
              </h3>
              <p className="text-lg text-neutral-700 dark:text-sand-300 mb-6 leading-relaxed">
                Understand exactly where your tokens are being spent with comprehensive breakdowns including cache writes, cache reads, and cache hits for maximum cost optimization.
              </p>
              <ul className="space-y-3 mb-6">
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

        {/* CTA */}
        <div className="text-center mt-16">
          <a
            href="/features"
            className="inline-flex items-center px-8 py-4 bg-primary-500 text-secondary-900 text-lg font-semibold rounded-lg hover:bg-primary-600 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            See More Features in Detail
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-500">
            Interactive charts, team leaderboards, historical data, and more
          </p>
        </div>
      </div>
    </section>
  )
}
