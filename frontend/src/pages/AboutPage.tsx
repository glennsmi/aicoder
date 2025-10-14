import { useAuth } from '../contexts/AuthContext'

interface AboutPageProps {
  onBackToMain: () => void
}

export default function AboutPage({ onBackToMain }: AboutPageProps) {
  const { currentUser } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gunmetal">
      {/* Header */}
      <div className="bg-secondary-800 p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {/* Fueld Logo Symbol */}
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                <img src="/logos/fueld-logo-symbol.svg" alt="Fueld" className="w-10 h-10" />
              </div>
              <div className="text-left">
                <h1 className="text-3xl font-bold text-white">About Cursor Costs by Fueld AI</h1>
                <p className="text-sm text-white/70 mt-1">
                  AI-powered platform for <a href="https://go.fueld.ai/4kkKxYj" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">enhanced productivity</a>
                </p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-4">
              {currentUser && (
                <div className="inline-flex items-center px-4 py-2 bg-white/20 rounded-full text-white backdrop-blur-sm">
                  <span className="mr-2">👤</span>
                  {currentUser.displayName || currentUser.email?.split('@')[0]}
                </div>
              )}
              
              <button 
                onClick={onBackToMain}
                className="inline-flex items-center px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-200 backdrop-blur-sm border border-white/20"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to App
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Cursor Costs Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
          <div className="text-center mb-10">

            <h2 className="text-2xl font-bold text-gunmetal-900 mb-4">About Cursor Costs Tracker</h2>
          </div>
          
          <div className="prose prose-lg max-w-none text-gunmetal-700">
            <p className="mb-4 text-lg leading-relaxed">
              This is a <strong>real-world problem that we wanted to solve ourselves</strong> and we decided to share our solution with everyone else as well.
            </p>
            
            <p className="mb-4 leading-relaxed">
              Keeping track of these very high usage costs when you're using the Max programs and Cursor can be a bit of a hassle. 
              It's also good to see what models you're using and when - understanding your AI usage patterns helps you make better 
              decisions about your development workflow.
            </p>
            
            <p className="mb-6 leading-relaxed">
              So we've decided to create a quick solution to help you out and then convert that into whatever currency you want. 
              <strong> Hope you like it!</strong>
            </p>
            
            <div className="bg-primary-50 rounded-lg p-6 border border-primary-200">
              <h3 className="font-semibold text-gunmetal-900 mb-3">Key Features:</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Track Cursor AI usage costs in real-time
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Monitor which AI models you're using most
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Analyze usage patterns over time
                  </li>
                </ul>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Convert costs to 47+ global currencies
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Easy CSV import from Cursor data
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Beautiful charts and analytics
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Introduction Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-6">
          <div className="text-center">
            
            <img src="/logos/fueld-logo-full.svg" alt="Fueld" className="h-12 mx-auto mb-10" />
            <h2 className="text-2xl font-bold text-gunmetal-900 mb-4">About Fuled: The Future of AI-Powered Nutrition</h2>
            <p className="text-lg text-gunmetal-700 max-w-2xl mx-auto">
              Fueld is revolutionising how we approach nutrition and wellness through cutting-edge artificial intelligence, 
              making healthy living accessible and personalised for everyone.
            </p>
          </div>
        </div>

        {/* Customer Testimonials */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gunmetal-900 mb-8 text-center">What Our Customers Say</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="text-center">
              <div className="bg-primary-50 rounded-xl p-6 border border-primary-200">
                <svg className="w-8 h-8 text-primary-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"/>
                </svg>
                <p className="text-gunmetal-900 font-medium text-lg leading-relaxed mb-4">
                  "Amazing, Love the magic you are selling"
                </p>
                <div>
                  <p className="text-gunmetal-700 font-semibold">Stuart Crooks</p>
                  <p className="text-gunmetal-500 text-sm">Fintech Executive</p>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-secondary-50 rounded-xl p-6 border border-secondary-200">
                <svg className="w-8 h-8 text-secondary-600 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"/>
                </svg>
                <p className="text-gunmetal-900 font-medium text-lg leading-relaxed mb-4">
                  "That's just astonishing"
                </p>
                <div>
                  <p className="text-gunmetal-700 font-semibold">James Mayes</p>
                  <p className="text-gunmetal-500 text-sm">Startup Founder & CEO</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-primary-500 to-secondary-600 rounded-xl shadow-lg p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Ready to Transform Your Nutrition Journey?</h2>
          <p className="text-lg mb-6 text-white/90">
            Join thousands of users who have already discovered the power of AI-driven nutrition tracking
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="https://go.fueld.ai/3YZ7Qyn" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 bg-white text-primary-600 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Download Fueld App
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </a>
            <a 
              href="https://go.fueld.ai/4kkKxYj" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors font-medium backdrop-blur-sm border border-white/20"
            >
              Explore Fueld
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
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
              down macronutrients, and logs dietary patterns—all with minimal effort. Meanwhile, personal trainers, sports coaches, dietitians, researchers, clinicians or anyone specifically permissioned by the user can access this rich 
              data through the portal, where they can analyse trends, track targets, and generate powerful AI-
              supported nutritional reports.
            </p>
            <p className="text-gunmetal-700 leading-relaxed">
              Together, these tools create a complete, elegant workflow for nutritional data collection and analysis—from <strong>meal to insight</strong>.
            </p>
          </div>

          {/* The Fueld App */}
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold text-gunmetal-900 mb-4">Fueld Nutrition Tracking</h3>
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
            <div className="flex items-center justify-center ">
              <img src="/images/Fueld-app.png" alt="Fueld App" className="w-full h-auto" />
            </div>
          </div>

           {/*  Fueld Recipes */}
           <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="order-2 md:order-1">
            <img src="/images/Fueld-recipes.png" alt="Fueld App" className="w-full h-auto" />
            </div>
            <div className="order-1 md:order-2">
              <h3 className="text-2xl font-bold text-gunmetal-900 mb-4">Fueld Recipes</h3>
              <p className="text-lg text-gunmetal-700 mb-4 font-medium">
                Personalised cooking, powered by your fridge.
              </p>
              <p className="text-gunmetal-700 mb-4 leading-relaxed">
                Fueld Recipes is a magical extension of the Fueld App experience—bringing personalisation, AI, and convenience into the kitchen.
              </p>
              <p className="text-gunmetal-700 mb-4 leading-relaxed">
                With just a single photo of your fridge or pantry, Fueld's AI can identify available ingredients and instantly suggest recipes you'll love. 
                These suggestions are based not only on what you have on hand, but also what you've eaten today, your taste preferences, and your nutritional goals.
              </p>
              <p className="text-gunmetal-700 mb-6 leading-relaxed font-medium">
                No scrolling through generic recipes. No wasted ingredients. Just smart, simple suggestions tailored to you.
              </p>

              <div className="mb-6">
                <h4 className="font-semibold text-gunmetal-900 mb-3 text-lg">How It Works</h4>
                <div className="space-y-3">
                  <div>
                    <h5 className="font-medium text-gunmetal-900 mb-1">Snap a photo of your fridge or ingredients</h5>
                    <p className="text-gunmetal-700 text-sm">One image is all it takes. Fueld analyses and categorises your available foods instantly.</p>
                  </div>
                  <div>
                    <h5 className="font-medium text-gunmetal-900 mb-1">Get tailored recipe suggestions</h5>
                    <p className="text-gunmetal-700 text-sm">Based on what you've eaten today, your macro balance, flavour preferences, and dietary targets.</p>
                  </div>
                  <div>
                    <h5 className="font-medium text-gunmetal-900 mb-1">Save or share</h5>
                    <p className="text-gunmetal-700 text-sm">Bookmark recipes in your diary or share them with friends directly from the app.</p>
                  </div>
                  <div>
                    <h5 className="font-medium text-gunmetal-900 mb-1">Cook for your goals</h5>
                    <p className="text-gunmetal-700 text-sm">Every recipe is designed to align with your health objectives—whether it's more fibre, fewer carbs, or better balance.</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-semibold text-gunmetal-900 mb-3 text-lg">Why It Matters</h4>
                <p className="text-gunmetal-700 mb-4 leading-relaxed">
                  Nutrition isn't just about tracking—it's about making smarter choices in real time. Fueld Recipes turns what you have into what you need, 
                  helping users stay on track while reducing food waste and decision fatigue.
                </p>
                <p className="text-gunmetal-700 leading-relaxed">
                  Whether you're low on ingredients, short on time, or just need inspiration, Fueld Recipes makes healthy cooking intelligent, effortless, and uniquely yours.
                </p>
              </div>
            </div>
          </div>

          {/* The Fueld Portal */}
          <div className="grid md:grid-cols-2 gap-8 items-center">
            
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
            <div className="order-2 md:order-2">
              <img src="/images/Fueld-portal.png" alt="Fueld App" className="w-full h-auto" />
            </div>
            
          </div>

          {/* Call to Action */}
          <div className="bg-gradient-to-r from-primary-500 to-secondary-600 rounded-xl shadow-lg p-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-4">Ready to Transform Your Nutrition Journey?</h2>
            <p className="text-lg mb-6 text-white/90">
              Join thousands of users who have already discovered the power of AI-driven nutrition tracking
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="https://go.fueld.ai/3YZ7Qyn" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 bg-white text-primary-600 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Download Fueld App
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </a>
            <a 
              href="https://go.fueld.ai/4kkKxYj" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors font-medium backdrop-blur-sm border border-white/20"
            >
              Explore Fueld
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
          </div>

        </div>
      </div>
    </div>
  )
} 