export default function Hero() {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-white via-primary-50/30 to-white dark:from-secondary-900 dark:via-secondary-800/50 dark:to-secondary-900">
      <div className="container mx-auto max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Copy */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 dark:bg-primary-900/30 rounded-full mb-6">
              <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                Trusted by 1,000+ Development Teams
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              <span className="text-neutral-900 dark:text-white">
                Monitor AI Coding
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary-500 to-primary-500 bg-clip-text text-transparent">
                Across Your Team
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-neutral-700 dark:text-sand-300 mb-8 leading-relaxed">
              Simple, real-time visibility into your team's AI coding tool usage. 
              Track adoption, optimize costs, and drive productivity with one unified dashboard.
            </p>

            {/* Key Benefits */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-secondary-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-neutral-700 dark:text-sand-300 font-medium">
                  5-minute setup
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-secondary-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-neutral-700 dark:text-sand-300 font-medium">
                  No credit card required
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-secondary-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-neutral-700 dark:text-sand-300 font-medium">
                  Team analytics included
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-secondary-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-neutral-700 dark:text-sand-300 font-medium">
                  Multi-platform support
                </span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#signup"
                className="inline-flex items-center justify-center px-8 py-4 bg-primary-500 text-secondary-900 text-lg font-semibold rounded-lg hover:bg-primary-600 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                Start Free Trial
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <a
                href="#demo"
                className="inline-flex items-center justify-center px-8 py-4 bg-sand-100 dark:bg-secondary-800 border-2 border-gray-300 dark:border-gray-600 text-neutral-900 dark:text-white text-lg font-semibold rounded-lg hover:border-primary-500 dark:hover:border-primary-500 transition-all duration-200"
              >
                Watch Demo
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </a>
            </div>

            {/* Social Proof */}
            <p className="mt-8 text-sm text-neutral-500 dark:text-neutral-500">
              Used by engineering teams at startups, scale-ups, and enterprises worldwide
            </p>
          </div>

          {/* Right Column - Visual */}
          <div className="relative">
            {/* Dashboard Preview */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 bg-sand-100 dark:bg-secondary-800">
              {/* Mock Dashboard */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Team Usage Overview</h3>
                  <div className="text-sm text-neutral-500 dark:text-neutral-500">Last 30 days</div>
                </div>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4">
                    <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">87%</div>
                    <div className="text-sm text-neutral-700 dark:text-neutral-500">Adoption Rate</div>
                  </div>
                  <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4">
                    <div className="text-2xl font-bold text-primary-600 dark:text-primary-500">32</div>
                    <div className="text-sm text-neutral-700 dark:text-neutral-500">Active Users</div>
                  </div>
                  <div className="bg-secondary-50 dark:bg-secondary-700 rounded-lg p-4">
                    <div className="text-2xl font-bold text-secondary-700 dark:text-white">£2,341</div>
                    <div className="text-sm text-neutral-700 dark:text-neutral-500">Total Cost</div>
                  </div>
                  <div className="bg-accent-100 dark:bg-accent-900/30 rounded-lg p-4">
                    <div className="text-2xl font-bold text-accent-600 dark:text-accent-400">+23%</div>
                    <div className="text-sm text-neutral-700 dark:text-neutral-500">vs Last Month</div>
                  </div>
                </div>

                {/* Chart Placeholder */}
                <div className="bg-gray-100 dark:bg-secondary-700 rounded-lg h-48 flex items-center justify-center">
                  <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Floating Badge */}
            <div className="absolute -top-4 -right-4 bg-primary-500 text-white px-4 py-2 rounded-lg shadow-lg transform rotate-3">
              <div className="text-sm font-semibold">Real-time Updates</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

