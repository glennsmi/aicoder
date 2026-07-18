import { Link } from 'react-router-dom'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-secondary-900 text-sand-300 border-t border-secondary-700">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-5 gap-8">
          {/* Logo & About */}
          <div className="md:col-span-1">
            <a href="/" className="inline-block mb-4 group">
              <img 
                src="/logos/logo-dark.png" 
                alt="AICoder.Guru - Measure. Motivate. Master AI." 
                className="h-16 transition-transform group-hover:scale-105"
              />
            </a>
            <p className="text-sm text-sand-300/80 leading-relaxed">
              Measure. Motivate. Master AI. Simple analytics for your team's AI coding tools.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-white mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/features" className="text-sm hover:text-accent-400 transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-sm hover:text-accent-400 transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-sm hover:text-accent-400 transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <a 
                  href={`${import.meta.env.VITE_APP_URL || 'http://localhost:5173'}/login`}
                  className="text-sm hover:text-accent-400 transition-colors"
                >
                  Start Free Trial
                </a>
              </li>
              <li>
                <a 
                  href={`${import.meta.env.VITE_APP_URL || 'http://localhost:5173'}/login`}
                  className="text-sm hover:text-accent-400 transition-colors"
                >
                  Sign In
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-white mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-sm hover:text-accent-400 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <a 
                  href="mailto:support@aicoder.guru" 
                  className="text-sm hover:text-accent-400 transition-colors"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Developers */}
          <div>
            <h3 className="font-semibold text-white mb-4">Developers</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/developers/file-ingestion-api" className="text-sm hover:text-accent-400 transition-colors">
                  File Ingestion API
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@aicoder.guru"
                  className="text-sm hover:text-accent-400 transition-colors"
                >
                  Developer Support
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-white mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="text-sm hover:text-accent-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm hover:text-accent-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="text-sm hover:text-accent-400 transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link to="/acceptable-use" className="text-sm hover:text-accent-400 transition-colors">
                  Acceptable Use
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-secondary-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-sand-300/60">
            © {currentYear} AICoder.Guru. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-sand-300/60">
            <span>Made with ❤️ for developers</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

