export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-secondary-900">
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-white via-primary-50/30 to-white dark:from-secondary-900 dark:via-secondary-800/50 dark:to-secondary-900">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gunmetal-900 dark:text-white">
            Born from a Real Need
          </h1>
          <p className="text-xl text-gunmetal-600 dark:text-gunmetal-300 leading-relaxed">
            AI Coder started as an internal tool. Now it's helping teams worldwide understand and optimize their AI coding tool usage.
          </p>
        </div>
      </section>

      {/* Origin Story */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl">
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-gunmetal-900 dark:text-white mb-4">
                The Problem We Faced
              </h2>
              <p className="text-lg text-gunmetal-700 dark:text-gunmetal-300 leading-relaxed">
                When AI coding assistants like Cursor and GitHub Copilot started revolutionizing how we write code, we immediately adopted them across our development team. But we quickly ran into a problem: <strong className="text-gunmetal-900 dark:text-white">we had no visibility into what was actually happening</strong>.
              </p>
            </div>

            <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-6 border-l-4 border-primary-500">
              <p className="text-lg text-gunmetal-700 dark:text-gunmetal-300 italic">
                "Which models are our developers using? How much are we spending? Who's getting the most value from these tools? We needed answers, and there was nothing out there that could help."
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-bold text-gunmetal-900 dark:text-white mb-4">
                From Internal Tool to Product
              </h2>
              <p className="text-lg text-gunmetal-700 dark:text-gunmetal-300 leading-relaxed mb-4">
                We built a simple dashboard to track our own usage. It gave us the accurate analysis we desperately needed—breakdowns by model, cost tracking, individual developer patterns. Suddenly, we had clarity.
              </p>
              <p className="text-lg text-gunmetal-700 dark:text-gunmetal-300 leading-relaxed">
                When we shared it with other engineering leaders, the response was overwhelming: <em className="text-primary-600 dark:text-primary-400">"We need this too!"</em> That's when we realized this wasn't just our problem—it was an industry-wide gap.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-secondary-950">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              <span className="text-gunmetal-900 dark:text-white">Our Mission: </span>
              <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
                Drive AI Adoption
              </span>
            </h2>
          </div>

          <div className="space-y-8">
            <div>
              <p className="text-lg text-gunmetal-700 dark:text-gunmetal-300 leading-relaxed mb-4">
                As we used our own tool, we discovered something unexpected: <strong className="text-gunmetal-900 dark:text-white">visibility doesn't just help you manage costs—it helps you encourage adoption</strong>.
              </p>
              <p className="text-lg text-gunmetal-700 dark:text-gunmetal-300 leading-relaxed">
                When developers see how their peers are using AI tools, when managers can celebrate top adopters, when teams can share what works—adoption accelerates. Productivity improves. Output increases. Familiarity with cutting-edge tools becomes a team strength, not an individual advantage.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mt-12">
              <div className="bg-white dark:bg-secondary-900 rounded-xl p-6 text-center border border-gray-200 dark:border-gray-700">
                <div className="text-4xl font-bold text-primary-500 mb-2">1,000+</div>
                <div className="text-gunmetal-700 dark:text-gunmetal-300">Development Teams</div>
              </div>
              <div className="bg-white dark:bg-secondary-900 rounded-xl p-6 text-center border border-gray-200 dark:border-gray-700">
                <div className="text-4xl font-bold text-accent-500 mb-2">50M+</div>
                <div className="text-gunmetal-700 dark:text-gunmetal-300">Tokens Tracked</div>
              </div>
              <div className="bg-white dark:bg-secondary-900 rounded-xl p-6 text-center border border-gray-200 dark:border-gray-700">
                <div className="text-4xl font-bold text-secondary-600 dark:text-white mb-2">87%</div>
                <div className="text-gunmetal-700 dark:text-gunmetal-300">Avg. Adoption Rate</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gunmetal-900 dark:text-white mb-4">
              What We Believe
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-secondary-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gunmetal-900 dark:text-white mb-3">
                AI Tools Should Be Accessible
              </h3>
              <p className="text-gunmetal-600 dark:text-gunmetal-400 leading-relaxed">
                Every developer deserves access to cutting-edge AI coding assistants. Our mission is to help organizations make that happen by removing the barriers of cost uncertainty and usage opacity.
              </p>
            </div>

            <div className="bg-white dark:bg-secondary-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-accent-100 dark:bg-accent-900/30 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-accent-600 dark:text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gunmetal-900 dark:text-white mb-3">
                Transparency Drives Adoption
              </h3>
              <p className="text-gunmetal-600 dark:text-gunmetal-400 leading-relaxed">
                When teams can see how AI tools are being used—and the value they're delivering—adoption naturally accelerates. Transparency isn't about surveillance; it's about empowerment.
              </p>
            </div>

            <div className="bg-white dark:bg-secondary-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-secondary-100 dark:bg-secondary-700 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-secondary-600 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gunmetal-900 dark:text-white mb-3">
                Privacy First, Always
              </h3>
              <p className="text-gunmetal-600 dark:text-gunmetal-400 leading-relaxed">
                We track usage and costs, not code. Your intellectual property stays yours. Our analytics focus on patterns and metrics, never on what you're actually building.
              </p>
            </div>

            <div className="bg-white dark:bg-secondary-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gunmetal-900 dark:text-white mb-3">
                Community-Driven Development
              </h3>
              <p className="text-gunmetal-600 dark:text-gunmetal-400 leading-relaxed">
                We started as an internal tool, shared it with the community, and continue to evolve based on real feedback from real engineering teams. Your needs shape our roadmap.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary-500 to-accent-500">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold text-secondary-900 mb-6">
            Join Teams Using AI Coder
          </h2>
          <p className="text-xl text-secondary-900/80 mb-8">
            Start tracking your team's AI coding tool usage today. Free forever for individual developers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#signup"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-gunmetal-900 text-lg font-semibold rounded-lg hover:bg-gray-100 transition-all duration-200 shadow-lg"
            >
              Start Free Trial
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <a
              href="#demo"
              className="inline-flex items-center justify-center px-8 py-4 bg-secondary-900 text-white text-lg font-semibold rounded-lg hover:bg-secondary-800 transition-all duration-200"
            >
              Watch Demo
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

