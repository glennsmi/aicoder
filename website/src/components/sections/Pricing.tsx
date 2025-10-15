export default function Pricing() {
  const plans = [
    {
      name: "Novice",
      price: "£0",
      period: "forever",
      features: [
        "Manual CSV upload",
        "Single user",
        "90-day retention"
      ]
    },
    {
      name: "Apprentice",
      price: "£2.99",
      period: "/month",
      features: [
        "API integration",
        "Single user",
        "1-year retention"
      ]
    },
    {
      name: "Sensei",
      price: "£29",
      period: "/month",
      badge: "Most Popular",
      features: [
        "Up to 10 users",
        "Team analytics",
        "Unlimited retention"
      ]
    },
    {
      name: "Master",
      price: "£49",
      period: "/month",
      features: [
        "Up to 30 users",
        "Custom dashboards",
        "Priority support"
      ]
    },
    {
      name: "Grandmaster",
      price: "Custom",
      period: "pricing",
      features: [
        "Unlimited users",
        "SSO & SAML",
        "Dedicated support"
      ]
    }
  ]

  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-sand-300 dark:bg-secondary-900">
      <div className="container mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-neutral-900 dark:text-white">Simple, Transparent</span>
            <br />
            <span className="bg-gradient-to-r from-primary-500 to-primary-500 bg-clip-text text-transparent">
              Pricing
            </span>
          </h2>
          <p className="text-xl text-neutral-700 dark:text-sand-300 max-w-2xl mx-auto">
            From free individual plans to enterprise teams
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-sand-100 dark:bg-secondary-800 rounded-xl p-6 border-2 transition-all duration-300 ${
                plan.badge
                  ? 'border-primary-500 shadow-xl'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-500'
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-0 right-0 flex justify-center">
                  <span className="px-3 py-1 bg-accent-400 text-secondary-900 text-xs font-semibold rounded-full">
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan Name */}
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-3">
                {plan.name}
              </h3>

              {/* Price */}
              <div className="mb-4">
                <div className="text-3xl font-bold text-primary-500">
                  {plan.price}
                </div>
                <div className="text-sm text-neutral-700 dark:text-neutral-500">
                  {plan.period}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-4">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-accent-500 dark:text-accent-400 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-xs text-neutral-700 dark:text-sand-300">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <a
            href="/pricing"
            className="inline-flex items-center px-8 py-4 bg-primary-500 text-secondary-900 text-lg font-semibold rounded-lg hover:bg-primary-600 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            View Full Pricing & Compare Plans
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
          <p className="mt-4 text-sm text-neutral-700 dark:text-sand-300">
            See full feature comparison and subscribe instantly
          </p>
        </div>
      </div>
    </section>
  )
}
