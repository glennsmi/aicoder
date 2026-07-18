interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gunmetal-900 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gunmetal-700 bg-secondary-800 text-white rounded-t-xl">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mr-4 p-2">
              <img src="/logos/jade-guru.svg" alt="AICoder.Guru" className="w-full h-full" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">AICoder.Guru</h2>
              <p className="text-white/80 text-sm">Measure. Motivate. Master AI.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white bg-white/20 rounded-full p-2 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* Introduction */}
          <div>
            <h3 className="text-2xl font-bold text-gunmetal-900 dark:text-white mb-4">About AICoder.Guru</h3>
            <p className="text-gunmetal-700 dark:text-sand-300 mb-4 text-lg leading-relaxed">
              <strong>AICoder.Guru is the comprehensive AI coding analytics platform</strong> that helps development teams track, analyze, and optimize their AI tool usage.
            </p>
            <p className="text-gunmetal-700 dark:text-sand-300 mb-4 leading-relaxed">
              Born from the need for accurate analysis of AI coding costs, AICoder.Guru started as an internal tool and evolved into a full-featured platform. We believe that <strong>visibility drives adoption</strong>—when teams can see the impact of AI coding tools, they use them more effectively.
            </p>
            <p className="text-gunmetal-700 dark:text-sand-300 leading-relaxed">
              Our mission is to help managers and developers make data-driven decisions about AI tool adoption, understand costs, and maximize productivity through better insights.
            </p>
          </div>

          {/* Key Features */}
          <div>
            <h3 className="text-2xl font-bold text-gunmetal-900 dark:text-white mb-4">Key Features</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-sand-100 dark:bg-gunmetal-800 rounded-lg p-6 border border-neutral-200 dark:border-gunmetal-700">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gunmetal-900 dark:text-white">Usage Analytics</h4>
                </div>
                <p className="text-gunmetal-700 dark:text-sand-300 text-sm leading-relaxed">
                  Track token usage, costs, and trends across all your AI coding tools. Visualize data with interactive charts and detailed breakdowns.
                </p>
              </div>

              <div className="bg-sand-100 dark:bg-gunmetal-800 rounded-lg p-6 border border-neutral-200 dark:border-gunmetal-700">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-accent-400 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-gunmetal-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gunmetal-900 dark:text-white">Team Management</h4>
                </div>
                <p className="text-gunmetal-700 dark:text-sand-300 text-sm leading-relaxed">
                  Organize developers into teams, assign managers, and track usage at individual, team, and organization levels.
                </p>
              </div>

              <div className="bg-sand-100 dark:bg-gunmetal-800 rounded-lg p-6 border border-neutral-200 dark:border-gunmetal-700">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-secondary-800 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gunmetal-900 dark:text-white">API Integrations</h4>
                </div>
                <p className="text-gunmetal-700 dark:text-sand-300 text-sm leading-relaxed">
                  Connect directly to Claude, OpenAI, GitHub Copilot, and more. Automatic sync keeps your data up-to-date without manual exports.
                </p>
              </div>

              <div className="bg-sand-100 dark:bg-gunmetal-800 rounded-lg p-6 border border-neutral-200 dark:border-gunmetal-700">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gunmetal-900 dark:text-white">Cost Optimization</h4>
                </div>
                <p className="text-gunmetal-700 dark:text-sand-300 text-sm leading-relaxed">
                  Identify cost trends, optimize model usage, and get recommendations for reducing expenses while maintaining productivity.
                </p>
              </div>
            </div>
          </div>

          {/* Supported Platforms */}
          <div>
            <h3 className="text-2xl font-bold text-gunmetal-900 dark:text-white mb-4">Supported Platforms</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-sand-100 dark:bg-gunmetal-800 rounded-lg p-4 text-center border border-neutral-200 dark:border-gunmetal-700">
                <p className="font-semibold text-gunmetal-900 dark:text-white">Anthropic Claude</p>
                <p className="text-xs text-gunmetal-600 dark:text-sand-300 mt-1">API Integration</p>
              </div>
              <div className="bg-sand-100 dark:bg-gunmetal-800 rounded-lg p-4 text-center border border-neutral-200 dark:border-gunmetal-700">
                <p className="font-semibold text-gunmetal-900 dark:text-white">Claude Code</p>
                <p className="text-xs text-gunmetal-600 dark:text-sand-300 mt-1">Analytics API</p>
              </div>
              <div className="bg-sand-100 dark:bg-gunmetal-800 rounded-lg p-4 text-center border border-neutral-200 dark:border-gunmetal-700">
                <p className="font-semibold text-gunmetal-900 dark:text-white">OpenAI</p>
                <p className="text-xs text-gunmetal-600 dark:text-sand-300 mt-1">API Integration</p>
              </div>
              <div className="bg-sand-100 dark:bg-gunmetal-800 rounded-lg p-4 text-center border border-neutral-200 dark:border-gunmetal-700">
                <p className="font-semibold text-gunmetal-900 dark:text-white">GitHub Copilot</p>
                <p className="text-xs text-gunmetal-600 dark:text-sand-300 mt-1">Enterprise API</p>
              </div>
              <div className="bg-sand-100 dark:bg-gunmetal-800 rounded-lg p-4 text-center border border-neutral-200 dark:border-gunmetal-700">
                <p className="font-semibold text-gunmetal-900 dark:text-white">Cursor</p>
                <p className="text-xs text-gunmetal-600 dark:text-sand-300 mt-1">CSV Import</p>
              </div>
              <div className="bg-sand-100 dark:bg-gunmetal-800 rounded-lg p-4 text-center border border-neutral-200 dark:border-gunmetal-700">
                <p className="font-semibold text-gunmetal-900 dark:text-white">Google Gemini</p>
                <p className="text-xs text-gunmetal-600 dark:text-sand-300 mt-1">Coming Soon</p>
              </div>
              <div className="bg-sand-100 dark:bg-gunmetal-800 rounded-lg p-4 text-center border border-neutral-200 dark:border-gunmetal-700">
                <p className="font-semibold text-gunmetal-900 dark:text-white">Codeium</p>
                <p className="text-xs text-gunmetal-600 dark:text-sand-300 mt-1">Coming Soon</p>
              </div>
              <div className="bg-sand-100 dark:bg-gunmetal-800 rounded-lg p-4 text-center border border-neutral-200 dark:border-gunmetal-700">
                <p className="font-semibold text-gunmetal-900 dark:text-white">Tabnine</p>
                <p className="text-xs text-gunmetal-600 dark:text-sand-300 mt-1">Coming Soon</p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-gradient-to-r from-primary-500 to-secondary-800 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to Master AI Coding?</h3>
            <p className="text-white/90 mb-6 max-w-2xl mx-auto leading-relaxed">
              Start tracking your team's AI usage today. Free tier available for individuals, with team plans starting at just $10/month.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="https://aicoder.guru"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 bg-white text-gunmetal-900 font-semibold rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
              >
                Visit AICoder.Guru
              </a>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-white/20 text-white font-semibold rounded-xl hover:bg-white/30 transition-colors backdrop-blur-sm border border-white/20"
              >
                Get Started
              </button>
            </div>
          </div>

          {/* Version Info */}
          <div className="text-center text-sm text-gunmetal-600 dark:text-sand-300">
            <p>AICoder.Guru v2.0 • Built with ❤️ for developers</p>
            <p className="mt-1">© 2025 AICoder.Guru. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
