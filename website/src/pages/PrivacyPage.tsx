export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-sand-300 dark:bg-secondary-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-32 max-w-4xl">
        <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-8">Privacy Policy</h1>
        
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="text-neutral-700 dark:text-sand-300 mb-6">
            <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">1. Introduction</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              AICoder.Guru ("we," "our," or "us") respects your privacy and is committed to protecting your personal data. This privacy policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li>Account information (name, email address, password)</li>
              <li>Organization and team details</li>
              <li>Billing and payment information</li>
              <li>AI coding tool usage data you choose to sync</li>
              <li>Communications with our support team</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">2.2 Automatically Collected Information</h3>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li>Usage data and analytics (via Google Analytics, PostHog)</li>
              <li>Device and browser information</li>
              <li>IP address and location data</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">3. How We Use Your Information</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">We use collected information to:</p>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process your transactions and manage your account</li>
              <li>Send you technical notices, updates, and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Analyze usage patterns and optimize user experience</li>
              <li>Detect, prevent, and address technical issues and security threats</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">4. Analytics and Tracking</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">We use the following third-party analytics services:</p>
            
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">Google Analytics</h3>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              We use Google Analytics to understand how users interact with our website. Google Analytics collects information anonymously and reports website trends without identifying individual visitors.
            </p>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">PostHog</h3>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              PostHog helps us analyze product usage and user behavior to improve our services. This includes session recordings, heatmaps, and feature usage analytics.
            </p>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">Facebook Pixel</h3>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              We use Facebook Pixel to measure the effectiveness of our advertising campaigns and to provide personalized content.
            </p>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">LinkedIn Insight Tag</h3>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              LinkedIn Insight Tag helps us track conversions, retarget website visitors, and gain insights about our LinkedIn ad campaigns.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">5. Data Sharing and Disclosure</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">We may share your information with:</p>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li><strong>Service Providers:</strong> Firebase (Google), Stripe for payment processing</li>
              <li><strong>Analytics Partners:</strong> Google Analytics, PostHog, Facebook, LinkedIn</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, sale, or acquisition</li>
            </ul>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              <strong>We never sell your personal data to third parties.</strong>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">6. Data Security</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              We implement appropriate technical and organizational measures to protect your personal data, including:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and updates</li>
              <li>Access controls and authentication measures</li>
              <li>Secure cloud infrastructure (Firebase/Google Cloud)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">7. Your Rights</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
              <li>Export your data</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              To exercise these rights, contact us at <a href="mailto:privacy@aicoder.guru" className="text-primary-500 hover:text-primary-600">privacy@aicoder.guru</a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">8. Data Retention</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              We retain your personal data only for as long as necessary to provide our services and comply with legal obligations. Account data is deleted within 30 days of account closure unless required for legal compliance.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">9. International Data Transfers</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data in accordance with applicable data protection laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">10. Children's Privacy</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              Our services are not directed to individuals under 16. We do not knowingly collect personal data from children.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">11. Changes to This Policy</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              We may update this privacy policy from time to time. We will notify you of significant changes by email or through our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">12. Contact Us</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              If you have questions about this privacy policy, please contact us:
            </p>
            <ul className="list-none text-neutral-700 dark:text-sand-300 space-y-2">
              <li>Email: <a href="mailto:privacy@aicoder.guru" className="text-primary-500 hover:text-primary-600">privacy@aicoder.guru</a></li>
              <li>Address: AICoder.Guru, United Kingdom</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

