export default function TermsPage() {
  return (
    <div className="min-h-screen bg-sand-300 dark:bg-secondary-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-32 max-w-4xl">
        <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-8">Terms of Service</h1>
        
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="text-neutral-700 dark:text-sand-300 mb-6">
            <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              By accessing and using AICoder.Guru ("Service"), you accept and agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">2. Description of Service</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              AICoder.Guru provides analytics and monitoring tools for AI coding assistants. The Service allows you to:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li>Track AI coding tool usage across your team</li>
              <li>Monitor costs and optimize spending</li>
              <li>Analyze productivity and adoption metrics</li>
              <li>Generate reports and insights</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">3. Account Registration</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              To use certain features, you must register for an account. You agree to:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li>Provide accurate, current information</li>
              <li>Maintain the security of your password</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Be responsible for all activities under your account</li>
              <li>Not share your account credentials</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">4. Subscription Plans and Billing</h2>
            
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">4.1 Pricing Tiers</h3>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li><strong>Free:</strong> £0/month - Individual use with limited features</li>
              <li><strong>Individual Pro:</strong> £2.99/month - Enhanced features for individuals</li>
              <li><strong>Small Team:</strong> £29/month - Up to 10 users</li>
              <li><strong>Team:</strong> £49/month - Up to 30 users</li>
              <li><strong>Enterprise:</strong> Custom pricing - Unlimited users</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">4.2 Payment Terms</h3>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li>Subscriptions are billed monthly in advance</li>
              <li>All fees are non-refundable except as required by law</li>
              <li>We may change pricing with 30 days notice</li>
              <li>Failed payments may result in service suspension</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">5. Acceptable Use</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">You agree NOT to:</p>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Upload malicious code or viruses</li>
              <li>Attempt to gain unauthorized access</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Use the Service for competitive analysis</li>
              <li>Resell or redistribute the Service</li>
              <li>Scrape or harvest data without permission</li>
            </ul>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              See our <a href="/acceptable-use" className="text-primary-500 hover:text-primary-600">Acceptable Use Policy</a> for full details.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">6. Intellectual Property</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              The Service and all content, features, and functionality are owned by AICoder.Guru and protected by copyright, trademark, and other intellectual property laws.
            </p>
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">Your Data</h3>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              You retain all rights to the data you upload. By using the Service, you grant us a license to use, store, and process your data solely to provide the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">7. Privacy and Data Protection</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              Our collection and use of personal information is described in our <a href="/privacy" className="text-primary-500 hover:text-primary-600">Privacy Policy</a>. By using the Service, you consent to such collection and use.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">8. Service Availability</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              We strive for 99.9% uptime but do not guarantee uninterrupted access. We may:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li>Perform scheduled maintenance with notice</li>
              <li>Make emergency updates without notice</li>
              <li>Modify or discontinue features</li>
              <li>Suspend accounts for Terms violations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">9. Termination</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              Either party may terminate this agreement at any time. You may cancel your subscription through your account settings. We may terminate or suspend your account for:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li>Violation of these Terms</li>
              <li>Non-payment of fees</li>
              <li>Illegal or harmful activity</li>
              <li>Extended account inactivity</li>
            </ul>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              Upon termination, your right to use the Service ceases immediately. We will retain your data for 30 days to allow for account recovery.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">10. Disclaimers</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">11. Limitation of Liability</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, AICODER.GURU SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, DATA LOSS, OR BUSINESS INTERRUPTION.
            </p>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">12. Indemnification</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              You agree to indemnify and hold harmless AICoder.Guru from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">13. Governing Law</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              These Terms are governed by the laws of England and Wales. Any disputes shall be resolved in the courts of England and Wales.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">14. Changes to Terms</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              We reserve the right to modify these Terms at any time. We will notify users of material changes by email or through the Service. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">15. Contact Information</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              For questions about these Terms, contact us:
            </p>
            <ul className="list-none text-neutral-700 dark:text-sand-300 space-y-2">
              <li>Email: <a href="mailto:legal@aicoder.guru" className="text-primary-500 hover:text-primary-600">legal@aicoder.guru</a></li>
              <li>Support: <a href="mailto:support@aicoder.guru" className="text-primary-500 hover:text-primary-600">support@aicoder.guru</a></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

