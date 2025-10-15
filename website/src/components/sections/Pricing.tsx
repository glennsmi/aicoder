export default function Pricing() {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-sand-300 dark:bg-secondary-900">
      <div className="container mx-auto max-w-5xl text-center">
        {/* Section Header */}
        <h2 className="text-4xl md:text-5xl font-bold mb-4">
          <span className="text-neutral-900 dark:text-white">Simple, Transparent</span>
          <br />
          <span className="bg-gradient-to-r from-primary-500 to-primary-500 bg-clip-text text-transparent">
            Pricing
          </span>
        </h2>
        <p className="text-xl text-neutral-700 dark:text-sand-300 max-w-2xl mx-auto mb-12">
          From free individual plans to enterprise teams. Start free, upgrade when you're ready.
        </p>

        {/* Quick Tiers Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
          <div className="bg-sand-100 dark:bg-secondary-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
            <div className="text-2xl font-bold text-primary-500 mb-2">£0</div>
            <div className="text-sm font-semibold text-neutral-900 dark:text-white">Novice</div>
          </div>
          <div className="bg-sand-100 dark:bg-secondary-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
            <div className="text-2xl font-bold text-primary-500 mb-2">£2.99</div>
            <div className="text-sm font-semibold text-neutral-900 dark:text-white">Apprentice</div>
          </div>
          <div className="bg-sand-100 dark:bg-secondary-800 rounded-lg p-6 border-2 border-primary-500 relative">
            <div className="absolute -top-3 left-0 right-0 flex justify-center">
              <span className="px-3 py-1 bg-accent-400 text-secondary-900 text-xs font-semibold rounded-full">Popular</span>
            </div>
            <div className="text-2xl font-bold text-primary-500 mb-2">£29</div>
            <div className="text-sm font-semibold text-neutral-900 dark:text-white">Sensei</div>
          </div>
          <div className="bg-sand-100 dark:bg-secondary-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
            <div className="text-2xl font-bold text-primary-500 mb-2">£49</div>
            <div className="text-sm font-semibold text-neutral-900 dark:text-white">Master</div>
          </div>
          <div className="bg-sand-100 dark:bg-secondary-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
            <div className="text-2xl font-bold text-primary-500 mb-2">Custom</div>
            <div className="text-sm font-semibold text-neutral-900 dark:text-white">Grandmaster</div>
          </div>
        </div>

        {/* CTA */}
        <a
          href="/pricing"
          className="inline-flex items-center px-8 py-4 bg-primary-500 text-secondary-900 text-lg font-semibold rounded-lg hover:bg-primary-600 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          View Full Pricing & Subscribe
          <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
        <p className="mt-4 text-sm text-neutral-700 dark:text-sand-300">
          Free forever for individuals • Team plans from £29/month
        </p>
      </div>
    </section>
  )
}
