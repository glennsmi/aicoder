export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-sand-300 dark:bg-secondary-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-32 max-w-4xl">
        <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-8">Cookie Policy</h1>
        
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="text-neutral-700 dark:text-sand-300 mb-6">
            <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">1. What Are Cookies?</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              Cookies are small text files stored on your device when you visit our website. They help us provide a better user experience and analyze how our site is used.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">2. How We Use Cookies</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              We use cookies and similar tracking technologies for the following purposes:
            </p>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">2.1 Essential Cookies</h3>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              These cookies are necessary for the website to function properly:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li><strong>Authentication:</strong> Remember your login state</li>
              <li><strong>Security:</strong> Protect against cross-site request forgery</li>
              <li><strong>Preferences:</strong> Remember your theme choice (light/dark mode)</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">2.2 Analytics Cookies</h3>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              We use analytics services to understand how users interact with our website:
            </p>
            
            <h4 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">Google Analytics</h4>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li><strong>Purpose:</strong> Track website usage, page views, and user behavior</li>
              <li><strong>Cookies:</strong> _ga, _gid, _gat</li>
              <li><strong>Duration:</strong> Up to 2 years</li>
              <li><strong>Opt-out:</strong> <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-600">Google Analytics Opt-out Browser Add-on</a></li>
            </ul>

            <h4 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">PostHog</h4>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li><strong>Purpose:</strong> Product analytics, session recordings, feature usage</li>
              <li><strong>Cookies:</strong> ph_* (various PostHog tracking cookies)</li>
              <li><strong>Duration:</strong> Up to 1 year</li>
              <li><strong>Privacy:</strong> Self-hosted option available for enhanced privacy</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">2.3 Marketing Cookies</h3>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              We use marketing pixels to measure ad effectiveness and retarget visitors:
            </p>

            <h4 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">Facebook Pixel</h4>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li><strong>Purpose:</strong> Measure ad performance, create custom audiences</li>
              <li><strong>Cookies:</strong> _fbp, fr</li>
              <li><strong>Duration:</strong> Up to 90 days</li>
              <li><strong>Privacy:</strong> <a href="https://www.facebook.com/privacy/explanation" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-600">Facebook Privacy Policy</a></li>
            </ul>

            <h4 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">LinkedIn Insight Tag</h4>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li><strong>Purpose:</strong> Track conversions, retarget visitors, analyze campaigns</li>
              <li><strong>Cookies:</strong> li_*, UserMatchHistory, AnalyticsSyncHistory</li>
              <li><strong>Duration:</strong> Up to 180 days</li>
              <li><strong>Privacy:</strong> <a href="https://www.linkedin.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-600">LinkedIn Privacy Policy</a></li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">3. Third-Party Cookies</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              Some cookies are set by third-party services we use:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li><strong>Firebase/Google Cloud:</strong> Authentication and hosting</li>
              <li><strong>Stripe:</strong> Payment processing (if you subscribe to paid plans)</li>
              <li><strong>Google Fonts:</strong> Web fonts (no cookies, but may log IP addresses)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">4. Managing Cookies</h2>
            
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">Browser Settings</h3>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              Most browsers allow you to control cookies through settings:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-600">Chrome</a></li>
              <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-600">Firefox</a></li>
              <li><a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-600">Safari</a></li>
              <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-600">Edge</a></li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">Opt-Out Options</h3>
            <ul className="list-disc pl-6 text-neutral-700 dark:text-sand-300 mb-4 space-y-2">
              <li><strong>Google Analytics:</strong> Install the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-600">opt-out browser add-on</a></li>
              <li><strong>Facebook:</strong> Adjust your <a href="https://www.facebook.com/settings?tab=ads" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-600">ad preferences</a></li>
              <li><strong>LinkedIn:</strong> Manage <a href="https://www.linkedin.com/psettings/guest-controls" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-600">ad settings</a></li>
              <li><strong>Industry Opt-Out:</strong> <a href="http://optout.aboutads.info/" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-600">Digital Advertising Alliance</a></li>
            </ul>

            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              <strong>Note:</strong> Blocking all cookies may affect website functionality. Essential cookies are required for the site to work properly.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">5. Do Not Track</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              Some browsers have a "Do Not Track" (DNT) feature. Currently, there is no industry standard for responding to DNT signals. We do not currently respond to DNT signals, but we respect your privacy choices through other opt-out mechanisms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">6. Cookie Table Summary</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-neutral-300 dark:border-neutral-700 mb-4">
                <thead className="bg-neutral-100 dark:bg-neutral-800">
                  <tr>
                    <th className="border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-left">Cookie/Service</th>
                    <th className="border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-left">Purpose</th>
                    <th className="border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-left">Type</th>
                    <th className="border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-left">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-neutral-700 dark:text-sand-300">
                  <tr>
                    <td className="border border-neutral-300 dark:border-neutral-700 px-4 py-2">theme</td>
                    <td className="border border-neutral-300 dark:border-neutral-700 px-4 py-2">Store theme preference</td>
                    <td className="border border-neutral-300 dark:border-neutral-700 px-4 py-2">Essential</td>
                    <td className="border border-neutral-300 dark:border-neutral-700 px-4 py-2">Persistent</td>
                  </tr>
                  <tr>
                    <td className="border border-neutral-300 dark:border-neutral-700 px-4 py-2">Google Analytics</td>
                    <td className="border border-neutral-300 dark:border-neutral-700 px-4 py-2">Website analytics</td>
                    <td className="border border-neutral-300 dark:border-neutral-700 px-4 py-2">Analytics</td>
                    <td className="border border-neutral-300 dark:border-neutral-700 px-4 py-2">2 years</td>
                  </tr>
                  <tr>
                    <td className="border border-neutral-300 dark:border-neutral-700 px-4 py-2">PostHog</td>
                    <td className="border border-neutral-300 dark:border-neutral-700 px-4 py-2">Product analytics</td>
                    <td className="border border-neutral-300 dark:border-neutral-700 px-4 py-2">Analytics</td>
                    <td className="border border-neutral-300 dark:border-neutral-700 px-4 py-2">1 year</td>
                  </tr>
                  <tr>
                    <td className="border border-neutral-300 dark:border-neutral-700 px-4 py-2">Facebook Pixel</td>
                    <td className="border border-neutral-300 dark:border-neutral-700 px-4 py-2">Ad tracking</td>
                    <td className="border border-neutral-300 dark:border-neutral-700 px-4 py-2">Marketing</td>
                    <td className="border border-neutral-300 dark:border-neutral-700 px-4 py-2">90 days</td>
                  </tr>
                  <tr>
                    <td className="border border-neutral-300 dark:border-neutral-700 px-4 py-2">LinkedIn Insight</td>
                    <td className="border border-neutral-300 dark:border-neutral-700 px-4 py-2">Ad tracking</td>
                    <td className="border border-neutral-300 dark:border-neutral-700 px-4 py-2">Marketing</td>
                    <td className="border border-neutral-300 dark:border-neutral-700 px-4 py-2">180 days</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">7. Updates to This Policy</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              We may update this Cookie Policy from time to time. We will notify you of significant changes by posting a notice on our website.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">8. Contact Us</h2>
            <p className="text-neutral-700 dark:text-sand-300 mb-4">
              If you have questions about our use of cookies, contact us:
            </p>
            <ul className="list-none text-neutral-700 dark:text-sand-300 space-y-2">
              <li>Email: <a href="mailto:privacy@aicoder.guru" className="text-primary-500 hover:text-primary-600">privacy@aicoder.guru</a></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

