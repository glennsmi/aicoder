export default function PricingPage() {
  return (
    <div className="min-h-screen bg-sand-300 dark:bg-secondary-900">
      {/* Hero Section */}
      <section className="pt-32 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-neutral-900 dark:text-white">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-neutral-700 dark:text-sand-300 leading-relaxed mb-8">
            Start free, upgrade when you're ready. No hidden fees, cancel anytime.
          </p>
          
          {/* Get Started Free CTA */}
          <a
            href={import.meta.env.VITE_APP_URL || 'http://localhost:5173'}
            className="inline-flex items-center px-8 py-4 bg-accent-400 text-secondary-900 text-lg font-semibold rounded-lg hover:bg-accent-500 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Get Started for Free
          </a>
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
            No credit card required • Takes 5 minutes to set up
          </p>
        </div>
      </section>

      {/* Stripe Pricing Table */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div 
            dangerouslySetInnerHTML={{
              __html: `<stripe-pricing-table 
                pricing-table-id="prctbl_1SIXDRL6TuXGPgHwofLggk70"
                publishable-key="pk_live_51SIW2HL6TuXGPgHweNfizoiPnr9B71LQT6NW6DW2kvBRrNCaQId6c446qbsgNUt6kN0ayeDzwyjmH4Z4D66H7gCS00gW8CnEv1">
              </stripe-pricing-table>`
            }}
          />
        </div>
      </section>

      {/* FAQ Link */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl text-center">
          <p className="text-neutral-700 dark:text-sand-300">
            Questions about pricing?{' '}
            <a href="/faq" className="text-primary-500 hover:text-primary-600 font-semibold">
              Check our FAQ
            </a>
            {' '}or{' '}
            <a href="mailto:sales@aicoder.guru" className="text-primary-500 hover:text-primary-600 font-semibold">
              contact us
            </a>
          </p>
        </div>
      </section>

      {/* Plan Comparison */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-sand-100 dark:bg-secondary-950">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center text-neutral-900 dark:text-white mb-12">
            Why Teams Choose AICoder.Guru
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
                Quick Setup
              </h3>
              <p className="text-neutral-700 dark:text-sand-300">
                Get started in minutes with CSV upload or API integration. No complex configuration required.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent-100 dark:bg-accent-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
                Secure & Private
              </h3>
              <p className="text-neutral-700 dark:text-sand-300">
                Your data is encrypted and never shared. We only track usage metadata, never your code.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-secondary-100 dark:bg-secondary-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-secondary-600 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
                Cancel Anytime
              </h3>
              <p className="text-neutral-700 dark:text-sand-300">
                No long-term contracts. Upgrade, downgrade, or cancel your subscription at any time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4">
            Still have questions?
          </h2>
          <p className="text-xl text-neutral-700 dark:text-sand-300 mb-8">
            Check out our detailed features or talk to our team
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/features"
              className="inline-flex items-center justify-center px-8 py-4 bg-primary-500 text-secondary-900 text-lg font-semibold rounded-lg hover:bg-primary-600 transition-all duration-200 shadow-lg"
            >
              Explore Features
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <a
              href="mailto:sales@aicoder.guru?subject=Pricing%20Inquiry"
              className="inline-flex items-center justify-center px-8 py-4 bg-sand-100 dark:bg-secondary-800 border-2 border-neutral-200 dark:border-neutral-600 text-neutral-900 dark:text-white text-lg font-semibold rounded-lg hover:border-primary-500 dark:hover:border-primary-500 transition-all duration-200"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

