export default function Features() {
  const features = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: "Team Usage Analytics",
      description: "See who's using AI coding tools, how often, and for what. Track adoption across your entire team with individual and aggregate breakdowns.",
      color: "primary"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: "Multi-Platform Support",
      description: "Automatic sync with Cursor, GitHub Copilot, Codeium, and Tabnine. One dashboard for all your team's AI coding tools.",
      color: "accent"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Cost Monitoring",
      description: "Track AI coding costs in real-time. Set budgets, get alerts, and understand where your money is going with detailed breakdowns.",
      color: "secondary"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: "Team Management",
      description: "Organize developers into teams. Assign managers, set permissions, and get team-level insights to drive productivity.",
      color: "primary"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "5-Minute Setup",
      description: "No complex integrations or lengthy onboarding. Connect your tools, invite your team, and start tracking usage in minutes.",
      color: "accent"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: "Export & Reports",
      description: "Generate PDF, CSV, and Excel reports for leadership. Schedule automated reports or export on-demand whenever you need them.",
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
      bg: "bg-accent-500",
      text: "text-accent-600 dark:text-accent-500",
      iconBg: "bg-accent-100 dark:bg-accent-900/30"
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
            <span className="text-gunmetal-900 dark:text-white">Everything You Need to</span>
            <br />
            <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
              Monitor AI Adoption
            </span>
          </h2>
          <p className="text-xl text-gunmetal-600 dark:text-gunmetal-300 max-w-3xl mx-auto">
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
                className="bg-white dark:bg-secondary-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-lg transition-all duration-300 group"
              >
                <div className={`w-12 h-12 ${colors.iconBg} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <div className={colors.text}>
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gunmetal-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gunmetal-600 dark:text-gunmetal-400 leading-relaxed">
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
          <p className="mt-4 text-sm text-gunmetal-500 dark:text-gunmetal-400">
            Free forever for individual developers • Team plans start at £49/month
          </p>
        </div>
      </div>
    </section>
  )
}

