export default function Pricing() {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-sand-300 dark:bg-secondary-900">
      <div className="container mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-neutral-900 dark:text-white">Simple, Transparent</span>
            <br />
            <span className="bg-gradient-to-r from-primary-500 to-primary-500 bg-clip-text text-transparent">
              Pricing
            </span>
          </h2>
          <p className="text-xl text-neutral-700 dark:text-sand-300 max-w-2xl mx-auto">
            Start free, upgrade when you're ready. No hidden fees, cancel anytime.
          </p>
        </div>

        {/* Stripe Pricing Table */}
        <div className="max-w-6xl mx-auto" 
          dangerouslySetInnerHTML={{
            __html: `<stripe-pricing-table 
              pricing-table-id="prctbl_1SIXDRL6TuXGPgHwofLggk70"
              publishable-key="pk_live_51SIW2HL6TuXGPgHweNfizoiPnr9B71LQT6NW6DW2kvBRrNCaQId6c446qbsgNUt6kN0ayeDzwyjmH4Z4D66H7gCS00gW8CnEv1">
            </stripe-pricing-table>`
          }}
        />

        {/* FAQ Link */}
        <div className="mt-16 text-center">
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
      </div>
    </section>
  )
}
