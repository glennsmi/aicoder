export default function Pricing() {
  const plans = [
    {
      name: "Free",
      price: "£0",
      period: "forever",
      description: "Perfect for solo developers tracking their own usage",
      features: [
        "Manual CSV upload",
        "Single user",
        "90-day data retention",
        "Basic usage charts",
        "Community support",
      ],
      cta: "Start Free",
      highlighted: false,
    },
    {
      name: "Individual Pro",
      price: "£2.99",
      period: "per month",
      description: "For individual developers who want more features",
      features: [
        "Everything in Free",
        "API connection sync",
        "1-year data retention",
        "Advanced analytics",
        "Priority support",
      ],
      cta: "Start Free Trial",
      highlighted: false,
    },
    {
      name: "Small Team",
      price: "£29",
      period: "per month",
      description: "Perfect for small development teams",
      features: [
        "Everything in Individual Pro",
        "Up to 10 users",
        "Team analytics & breakdowns",
        "Role-based access control",
        "Unlimited data retention",
        "Export reports (PDF/CSV/Excel)",
      ],
      cta: "Start Free Trial",
      highlighted: false,
    },
    {
      name: "Team",
      price: "£49",
      period: "per month",
      description: "For growing teams and managers",
      features: [
        "Everything in Small Team",
        "Up to 30 users",
        "Advanced team insights",
        "Custom dashboards",
        "Priority email support",
        "API rate limits increased",
      ],
      cta: "Start Free Trial",
      highlighted: true,
      badge: "Most Popular",
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "pricing",
      description: "For large organizations with specific needs",
      features: [
        "Everything in Team",
        "Unlimited users",
        "Custom integrations",
        "Dedicated account manager",
        "SSO & SAML",
        "Custom contracts",
        "SLA guarantee",
        "Advanced security features",
      ],
      cta: "Contact Sales",
      highlighted: false,
    },
  ]

  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-secondary-900">
      <div className="container mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gunmetal-900 dark:text-white">Simple, Transparent</span>
            <br />
            <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
              Pricing
            </span>
          </h2>
          <p className="text-xl text-gunmetal-600 dark:text-gunmetal-300 max-w-2xl mx-auto">
            Start free, upgrade when you're ready. No hidden fees, cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-2xl p-6 border-2 transition-all duration-300 ${
                plan.highlighted
                  ? 'border-primary-500 shadow-xl lg:scale-105 bg-white dark:bg-secondary-800'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 bg-white dark:bg-secondary-900'
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                  <span className="px-4 py-1 bg-primary-500 text-secondary-900 text-sm font-semibold rounded-full">
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan Name */}
              <h3 className="text-2xl font-bold text-gunmetal-900 dark:text-white mb-2">
                {plan.name}
              </h3>

              {/* Price */}
              <div className="mb-4">
                <span className="text-4xl font-bold text-gunmetal-900 dark:text-white">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-gunmetal-600 dark:text-gunmetal-400 ml-2">
                    {plan.period}
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-gunmetal-600 dark:text-gunmetal-400 mb-6">
                {plan.description}
              </p>

              {/* CTA Button */}
              <a
                href="#signup"
                className={`block w-full text-center px-6 py-3 rounded-lg font-semibold transition-all duration-200 mb-8 ${
                  plan.highlighted
                    ? 'bg-primary-500 text-secondary-900 hover:bg-primary-600 shadow-md'
                    : 'bg-gray-100 dark:bg-secondary-800 text-gunmetal-900 dark:text-white hover:bg-primary-500 hover:text-secondary-900'
                }`}
              >
                {plan.cta}
              </a>

              {/* Features List */}
              <ul className="space-y-3">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5"
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
                    <span className="text-gunmetal-700 dark:text-gunmetal-300">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* FAQ Link */}
        <div className="mt-16 text-center">
          <p className="text-gunmetal-600 dark:text-gunmetal-400">
            Questions about pricing?{' '}
            <a href="#faq" className="text-primary-500 hover:text-primary-600 font-semibold">
              Check our FAQ
            </a>
            {' '}or{' '}
            <a href="mailto:support@aicoder.guru" className="text-primary-500 hover:text-primary-600 font-semibold">
              contact us
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}

