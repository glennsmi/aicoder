export default function AcceptableUsePage() {
  return (
    <div className="min-h-screen bg-sand-300 dark:bg-secondary-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-32 max-w-4xl">
        <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-8">Acceptable Use Policy</h1>
        
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="text-neutral-700 dark:text-sand-300 mb-6">
            <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">1. Introduction</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              This Acceptable Use Policy governs your use of AICoder.Guru services. By using our services, you agree to comply with this policy. Violations may result in suspension or termination of your account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">2. Prohibited Activities</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">You may NOT use our services to:</p>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">2.1 Illegal Activities</h3>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li>Violate any applicable laws or regulations</li>
              <li>Engage in fraudulent activities</li>
              <li>Infringe on intellectual property rights</li>
              <li>Distribute malware, viruses, or harmful code</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">2.2 Security Violations</h3>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li>Attempt unauthorized access to systems or accounts</li>
              <li>Bypass security or authentication measures</li>
              <li>Probe, scan, or test vulnerabilities</li>
              <li>Interfere with service availability or performance</li>
              <li>Launch denial-of-service attacks</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">2.3 Misuse of Service</h3>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li>Share account credentials with unauthorized users</li>
              <li>Resell, redistribute, or white-label the service</li>
              <li>Use the service for competitive intelligence</li>
              <li>Scrape or harvest data without permission</li>
              <li>Reverse engineer or decompile the software</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">2.4 Abuse and Harassment</h3>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li>Send spam or unsolicited communications</li>
              <li>Harass, threaten, or abuse other users</li>
              <li>Impersonate others or create fake accounts</li>
              <li>Engage in discriminatory behavior</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">2.5 Data Misuse</h3>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li>Upload personal data without proper consent</li>
              <li>Violate data protection regulations (GDPR, CCPA, etc.)</li>
              <li>Store sensitive data inappropriately</li>
              <li>Share confidential information without authorization</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">3. Permitted Uses</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">You MAY use our services to:</p>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li>Monitor your team's AI coding tool usage</li>
              <li>Generate analytics and reports</li>
              <li>Track costs and optimize spending</li>
              <li>Manage team access and permissions</li>
              <li>Export your own data for backup or analysis</li>
              <li>Integrate with supported AI coding platforms</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">4. Content Standards</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              Any content you upload or create must:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li>Be accurate and not misleading</li>
              <li>Comply with applicable laws</li>
              <li>Respect intellectual property rights</li>
              <li>Not contain malicious code</li>
              <li>Not include illegal or harmful content</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">5. Rate Limits and Fair Use</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              To ensure service quality for all users, we implement rate limits:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li>API calls are subject to reasonable rate limits</li>
              <li>Excessive usage may be throttled or restricted</li>
              <li>Bulk operations should be performed during off-peak hours</li>
              <li>Contact us if you need higher limits for legitimate use cases</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">6. Reporting Violations</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              If you become aware of any violation of this policy, please report it immediately:
            </p>
            <ul className="list-none text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li>Security issues: <a href="mailto:security@aicoder.guru" className="text-primary-500 hover:text-primary-600">security@aicoder.guru</a></li>
              <li>Abuse reports: <a href="mailto:abuse@aicoder.guru" className="text-primary-500 hover:text-primary-600">abuse@aicoder.guru</a></li>
              <li>General support: <a href="mailto:support@aicoder.guru" className="text-primary-500 hover:text-primary-600">support@aicoder.guru</a></li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">7. Enforcement</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              We reserve the right to:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li>Investigate suspected violations</li>
              <li>Remove or disable access to violating content</li>
              <li>Suspend or terminate accounts</li>
              <li>Report illegal activities to law enforcement</li>
              <li>Take legal action against violators</li>
            </ul>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              Enforcement actions are at our sole discretion and may be taken without prior notice.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">8. Consequences of Violations</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              Depending on the severity and frequency of violations, we may:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li><strong>First offense:</strong> Warning and requirement to cease activity</li>
              <li><strong>Repeated violations:</strong> Temporary suspension (7-30 days)</li>
              <li><strong>Serious violations:</strong> Immediate account termination</li>
              <li><strong>Illegal activity:</strong> Report to authorities, potential legal action</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">9. Changes to This Policy</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              We may update this Acceptable Use Policy at any time. Significant changes will be communicated via email or through the service. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">10. Questions</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              If you have questions about what constitutes acceptable use, contact us:
            </p>
            <ul className="list-none text-neutral-700 dark:text-sand-300 space-y-2">
              <li>Email: <a href="mailto:legal@aicoder.guru" className="text-primary-500 hover:text-primary-600">legal@aicoder.guru</a></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

