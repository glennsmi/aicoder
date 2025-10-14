interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-secondary-800 text-white rounded-t-xl">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mr-4">
              <img src="/logos/fueld-logo-symbol.svg" alt="Fueld" className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">The Fueld Platform</h2>
              <p className="text-white/80 text-sm">Next-generation nutritional research</p>
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
            <h3 className="text-2xl font-bold text-gunmetal-900 mb-4">Introduction</h3>
            <p className="text-gunmetal-700 mb-4 text-lg leading-relaxed">
              <strong>Fueld is a unified platform for next-generation nutritional research.</strong>
            </p>
            <p className="text-gunmetal-700 mb-4 leading-relaxed">
              At its core are two seamlessly integrated tools: the <strong>Fueld App</strong>, a powerful AI-driven mobile experience for effortless meal 
              logging by participants, and the <strong>Fueld Portal</strong>, an advanced web platform that gives researchers unprecedented insight into 
              dietary behavior.
            </p>
            <p className="text-gunmetal-700 mb-4 leading-relaxed">
              Participants simply capture a photo of their meals with the Fueld App. The app automatically analyses the contents, breaks 
              down macronutrients, and logs dietary patterns—all with minimal effort. Meanwhile, researchers and clinicians access this rich 
              data through the portal, where they can manage participants, analyse trends, track targets, and generate powerful AI-
              supported nutritional reports.
            </p>
            <p className="text-gunmetal-700 leading-relaxed">
              Together, these tools create a complete, elegant workflow for nutritional data collection and analysis—from <strong>meal to insight</strong>.
            </p>
          </div>

          {/* The Fueld App */}
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold text-gunmetal-900 mb-4">The Fueld App</h3>
              <p className="text-gunmetal-700 mb-4 leading-relaxed">
                The Fueld App transforms food tracking with the power of AI. Instead of typing in ingredients or scanning barcodes, 
                participants simply <strong>take a photo of each meal</strong>. The app's advanced AI models analyse the image to:
              </p>
              <ul className="text-gunmetal-700 space-y-2 mb-4">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Identify individual ingredients
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Estimate portion sizes and weights
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Accurately calculate nutritional values to each component
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Automatically log the meal into the participant's food diary
                </li>
              </ul>
              <p className="text-gunmetal-700 leading-relaxed">
                While nutritional estimates may not be perfect, the simplicity of the process means users are far more likely to 
                <strong> consistently capture their meals</strong>. This results in high-quality datasets that combine <strong>ease of use with practical 
                accuracy</strong>—the foundation for powerful dietary analysis.
              </p>
            </div>
            <div className="flex items-center justify-center">
              <div className="bg-primary-50 rounded-2xl p-8 border border-primary-200">
                <div className="flex space-x-4">
                  <div className="w-32 h-56 bg-gunmetal-900 rounded-2xl flex items-center justify-center">
                    <span className="text-white text-xs">📱 App Interface</span>
                  </div>
                  <div className="w-32 h-56 bg-secondary-800 rounded-2xl flex items-center justify-center">
                    <span className="text-white text-xs">🍽️ Meal Analysis</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* The Fueld Portal */}
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="order-2 md:order-1">
              <div className="bg-secondary-50 rounded-2xl p-8 border border-secondary-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-24 bg-secondary-800 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs">📊 Analytics</span>
                  </div>
                  <div className="h-24 bg-gunmetal-900 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs">👥 Participants</span>
                  </div>
                  <div className="h-24 bg-primary-500 rounded-lg flex items-center justify-center">
                    <span className="text-gunmetal-900 text-xs">📈 Reports</span>
                  </div>
                  <div className="h-24 bg-orange-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs">🎯 Targets</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h3 className="text-2xl font-bold text-gunmetal-900 mb-4">The Fueld Portal</h3>
              <p className="text-gunmetal-700 mb-4 leading-relaxed">
                The Fueld Professional Portal is a powerful, web-based platform built specifically for clinicians, dietitians, and 
                researchers to manage studies and unlock rich dietary insights.
              </p>
              <p className="text-gunmetal-700 mb-4 leading-relaxed">
                Fully integrated with the Fueld App, the portal offers complete control over the research experience from 
                participant onboarding to advanced nutritional analysis. Professionals can customise the experience with their own 
                branding, invite participants to join studies, and access live, meaningful data collected through the app.
              </p>
              <div className="mb-4">
                <h4 className="font-semibold text-gunmetal-900 mb-2">Key features include:</h4>
                <ul className="text-gunmetal-700 space-y-2">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-secondary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Participant and team management
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-secondary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Custom branding and study setup
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-secondary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Streamlined participant invitations with built-in data sharing consent
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-secondary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Real-time nutritional dashboards and trend analysis
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-secondary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    AI-assisted reports and tailored feedback for each participant
                  </li>
                </ul>
              </div>
              <p className="text-gunmetal-700 leading-relaxed">
                From high-level macronutrient summaries to deep, meal-by-meal pattern recognition, the portal turns raw data into 
                meaningful insights—empowering professionals to conduct high-quality nutritional research at scale.
              </p>
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-gradient-to-r from-primary-500 to-secondary-800 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to Transform Nutritional Research?</h3>
            <p className="text-white/90 mb-6 max-w-2xl mx-auto leading-relaxed">
              Join the future of dietary analysis with AI-powered meal tracking and professional research tools.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="https://go.fueld.ai/4kkKxYj"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 bg-white text-gunmetal-900 font-semibold rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
              >
                Learn More About Fueld
              </a>
              <a 
                href="https://go.fueld.ai/3YZ7Qyn"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 bg-white/20 text-white font-semibold rounded-xl hover:bg-white/30 transition-colors backdrop-blur-sm border border-white/20"
              >
                Download the App
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 