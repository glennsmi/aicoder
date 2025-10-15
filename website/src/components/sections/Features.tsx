export default function Features() {
  const features = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: "Model Breakdown Analytics",
      description: "See exactly which AI models your team uses (GPT-5, Claude, Gemini, etc.). Track usage patterns and costs by model to optimize for performance.",
      color: "primary"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      ),
      title: "Token Usage by Type",
      description: "Detailed breakdown of input, output, and cached tokens. Understand exactly where tokens are spent and identify optimization opportunities.",
      color: "accent"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: "User & Team Leaderboards",
      description: "League tables showing top users by activity and cost. Drill down by user or team to see individual patterns and encourage healthy adoption.",
      color: "secondary"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      ),
      title: "Drillable Interactive Charts",
      description: "Click through charts to explore deeper insights. Filter by date range, user, team, or model. Export filtered data for custom analysis.",
      color: "primary"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      ),
      title: "Historical Data Storage",
      description: "All usage data stored over time. Track trends, compare periods, and see how AI adoption and costs evolve across your organization.",
      color: "accent"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: "API Provider Integrations",
      description: "Direct API integrations with Cursor, GitHub Copilot, and more. Automatic data sync from your AI tool providers for seamless monitoring.",
      color: "secondary"
    },
  ]

  const colorClasses = {
    primary: {
      bg: "bg-primary-500",
      text: "text-primary-600 dark:text-primary-400",
      iconBg: "bg-primary-100 dark:bg-primary-900/30"
    },
    accent: {
      bg: "bg-primary-500",
      text: "text-primary-600 dark:text-primary-500",
      iconBg: "bg-primary-100 dark:bg-primary-900/30"
    },
    secondary: {
      bg: "bg-secondary-600",
      text: "text-secondary-600 dark:text-white",
      iconBg: "bg-secondary-100 dark:bg-secondary-700"
    }
  }

  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-secondary-950">
      <div className="container mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-neutral-900 dark:text-white">Everything You Need to</span>
            <br />
            <span className="bg-gradient-to-r from-primary-500 to-primary-500 bg-clip-text text-transparent">
              Monitor AI Adoption
            </span>
          </h2>
          <p className="text-xl text-neutral-700 dark:text-sand-300 max-w-3xl mx-auto">
            Built specifically for engineering managers who want visibility into their team's AI coding tool usage
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const colors = colorClasses[feature.color as keyof typeof colorClasses]
            return (
              <div
                key={index}
                className="bg-sand-300 dark:bg-secondary-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-lg transition-all duration-300 group"
              >
                <div className={`w-12 h-12 ${colors.iconBg} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <div className={colors.text}>
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-neutral-700 dark:text-neutral-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <a
            href="#signup"
            className="inline-flex items-center px-8 py-4 bg-primary-500 text-secondary-900 text-lg font-semibold rounded-lg hover:bg-primary-600 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Start Tracking Your Team's Usage
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-500">
            Free forever for individual developers • Team plans start at £49/month
          </p>
        </div>
      </div>
    </section>
  )
}

