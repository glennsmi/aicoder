import { useState } from 'react'

interface FAQItem {
  question: string
  answer: string
}

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const faqs: FAQItem[] = [
    {
      question: "What is AICoder.Guru?",
      answer: "AICoder.Guru is an analytics platform that helps engineering teams track and optimize their usage of AI coding assistants like Cursor, GitHub Copilot, Codeium, and more. We provide real-time visibility into costs, usage patterns, and team adoption to help you measure, motivate, and master AI coding tools."
    },
    {
      question: "Which AI coding tools do you support?",
      answer: "We currently support Cursor, GitHub Copilot, Codeium, Claude Code, OpenAI API, and Tabnine. You can manually upload CSV data from any tool, or use our API integrations for automatic syncing. We're constantly adding support for new platforms based on user demand."
    },
    {
      question: "How does the free Novice tier work?",
      answer: "The Novice tier is completely free forever for individual developers. You can manually upload CSV files of your usage data, track a single user, and access basic analytics with 90-day data retention. It's perfect for solo developers who want to understand their own AI tool usage without any cost."
    },
    {
      question: "What's the difference between the pricing tiers?",
      answer: "Each tier builds on the previous one: Novice (Free) is for individuals with manual uploads. Apprentice (£2.99/mo) adds API sync and advanced analytics. Sensei (£29/mo) supports up to 10 team members with team analytics. Master (£49/mo) extends to 30 users with custom dashboards. Grandmaster (Custom) offers unlimited users and enterprise features like SSO and dedicated support."
    },
    {
      question: "Can I try the paid tiers before committing?",
      answer: "Yes! All paid tiers (Apprentice, Sensei, and Master) offer a free trial period. You can explore the full features without providing payment information upfront. Start your trial, and if you love it, continue with a subscription."
    },
    {
      question: "How do you calculate costs and token usage?",
      answer: "We pull data directly from your AI tool providers via API integrations or manual CSV uploads. We track tokens by type (input, output, cached), calculate costs based on each provider's pricing, and break it down by user, team, and model. All calculations are transparent and match your provider's billing."
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. We use enterprise-grade security including encrypted data storage (Firebase/Google Cloud), encrypted data transmission (HTTPS/TLS), role-based access control, and regular security audits. We never sell your data, and you retain full ownership. See our Privacy Policy and Security documentation for details."
    },
    {
      question: "Can I export my data?",
      answer: "Yes! Sensei tier and above can export reports in PDF, CSV, and Excel formats. You can export usage data, cost breakdowns, team analytics, and custom reports. Your data is always yours, and you can download it anytime."
    },
    {
      question: "How does team management work?",
      answer: "On Sensei tier and above, you can invite team members by email, assign roles (Admin, Team Manager, Member), create sub-teams, and set permissions. Admins can view organization-wide analytics, while Team Managers see their team's data, and Members see only their own usage."
    },
    {
      question: "What happens if I exceed my user limit?",
      answer: "If you're on Sensei (10 users) or Master (30 users) and need to add more team members, we'll prompt you to upgrade to the next tier. You won't lose access, but you'll need to upgrade to invite additional users. Grandmaster tier has no user limits."
    },
    {
      question: "Do you offer discounts for annual billing?",
      answer: "Yes! Annual subscriptions receive a 20% discount compared to monthly billing. For example, Sensei is £29/month or £290/year (save £58). Choose annual billing at checkout to save."
    },
    {
      question: "Can I switch between tiers?",
      answer: "Absolutely! You can upgrade or downgrade at any time. Upgrades take effect immediately, and you'll be prorated for the remaining billing period. Downgrades take effect at the end of your current billing cycle to ensure you get full value."
    },
    {
      question: "What analytics and insights do you provide?",
      answer: "We provide comprehensive analytics including: total tokens used (input/output/cached), cost breakdowns by user, team, and model, usage trends over time, top users and teams (leaderboards), model performance comparisons, adoption rates, and drillable interactive charts. You can filter by date range, user, team, or AI provider."
    },
    {
      question: "How does API integration work?",
      answer: "For supported platforms, you provide API credentials (stored encrypted), and we automatically sync your usage data daily. You can also trigger manual syncs anytime. We never access your code or prompts—only usage metadata like token counts, costs, and timestamps."
    },
    {
      question: "What if my AI tool isn't supported yet?",
      answer: "You can manually upload CSV files with your usage data. Our system accepts standard formats with columns like date, user, model, tokens, and cost. We're actively adding new integrations—request yours at support@aicoder.guru, and we'll prioritize based on demand."
    },
    {
      question: "How long do you retain data?",
      answer: "Novice tier: 90 days. Apprentice tier: 1 year. Sensei tier and above: Unlimited retention. You can always export your data before it expires, and upgrading retroactively extends retention for historical data."
    },
    {
      question: "Do you support SSO or SAML?",
      answer: "(Coming soon) On the Grandmaster (Enterprise) tier. We support Google SSO, Microsoft Azure AD, Okta, and custom SAML providers. This ensures secure, centralized authentication for large organizations."
    },
    {
      question: "What kind of support do you offer?",
      answer: "Novice tier: Community support (documentation, guides). Apprentice tier: Priority email support. Sensei/Master tiers: Priority email with faster response times. Grandmaster tier: Dedicated account manager, priority support, and custom SLA guarantees."
    },
    {
      question: "Can I cancel anytime?",
      answer: "Yes, you can cancel your subscription at any time with no penalties. You'll retain access until the end of your current billing period. Your data will be available for 30 days after cancellation for export or account recovery."
    },
    {
      question: "Do you offer refunds?",
      answer: "We offer a 14-day money-back guarantee on all paid plans. If you're not satisfied, contact us within 14 days of your first payment, and we'll issue a full refund. Subsequent renewals are non-refundable as per our Terms of Service."
    },
    {
      question: "How do you handle privacy and GDPR compliance?",
      answer: "We're fully GDPR and CCPA compliant. You have the right to access, correct, delete, or export your data at any time. We use cookies and analytics (Google Analytics, PostHog, Facebook Pixel, LinkedIn) disclosed in our Cookie Policy. See our Privacy Policy for complete details."
    },
    {
      question: "What's your uptime and reliability?",
      answer: "We target 99.9% uptime, hosted on Google Cloud/Firebase infrastructure. We perform scheduled maintenance with advance notice and have automated backups and disaster recovery. Grandmaster tier includes SLA guarantees with uptime commitments."
    },
    {
      question: "Can I get a demo or onboarding help?",
      answer: "Yes! Master tier and above includes priority onboarding. Grandmaster tier gets a dedicated account manager and personalized onboarding sessions. For all tiers, we provide comprehensive documentation, video guides, and email support."
    },
    {
      question: "How does billing work?",
      answer: "We bill monthly in advance via Stripe (credit/debit card). You'll receive an invoice by email each billing cycle. Annual subscribers are billed once per year. All prices are in GBP (£). Enterprise/Grandmaster tier can arrange custom billing terms and invoicing."
    },
    {
      question: "Still have questions?",
      answer: "We're here to help! Contact us at support@aicoder.guru for general inquiries, sales@aicoder.guru for pricing and demos, or visit our documentation. We typically respond within 24 hours (faster for paid tiers)."
    }
  ]

  return (
    <div className="min-h-screen bg-sand-300 dark:bg-secondary-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-32 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 dark:text-white mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-neutral-700 dark:text-sand-300">
            Everything you need to know about AICoder.Guru
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-sand-100 dark:bg-secondary-800 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-sand-200 dark:hover:bg-secondary-700 transition-colors"
              >
                <span className="text-lg font-semibold text-neutral-900 dark:text-white pr-8">
                  {faq.question}
                </span>
                <svg
                  className={`w-6 h-6 text-primary-500 flex-shrink-0 transition-transform duration-200 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-4 text-neutral-700 dark:text-sand-300 leading-relaxed">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-16 text-center bg-primary-50 dark:bg-primary-900/20 rounded-xl p-8 border border-primary-200 dark:border-primary-800">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
            Can't find what you're looking for?
          </h2>
          <p className="text-neutral-700 dark:text-sand-300 mb-6">
            Our team is here to help! Reach out and we'll get back to you within 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:support@aicoder.guru"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary-500 text-secondary-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Support
            </a>
            <a
              href="mailto:sales@aicoder.guru?subject=Start%20Free%20Trial%20-%20AICoder.Guru"
              className="inline-flex items-center justify-center px-6 py-3 bg-sand-100 dark:bg-secondary-700 border-2 border-neutral-200 dark:border-neutral-600 text-neutral-900 dark:text-white font-semibold rounded-lg hover:border-primary-500 dark:hover:border-primary-500 transition-colors"
            >
              Start Free Trial
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

