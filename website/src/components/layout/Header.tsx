import { useState, useEffect } from 'react'
import ThemeToggle from '../ThemeToggle'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { actualTheme } = useTheme()
  const { currentUser } = useAuth()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

      const navigation: { name: string; href: string }[] = [
        { name: 'Features', href: '/features' },
        { name: 'Pricing', href: '/pricing' },
      ]

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 dark:bg-secondary-900/95 backdrop-blur-sm shadow-md'
          : 'bg-transparent'
      }`}
    >
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <a href="/" className="flex items-center gap-3 group">
                <img
                  src={actualTheme === 'dark' ? '/logos/logo-dark.png' : '/logos/logo-light.png'}
                  alt="AICoder.Guru - Measure. Motivate. Master AI."
                  className="h-12 transition-transform group-hover:scale-105"
                />
              </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-neutral-700 dark:text-sand-300 hover:text-primary-500 dark:hover:text-primary-400 font-medium transition-colors"
              >
                {item.name}
              </a>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            
            {currentUser ? (
              <a
                href={import.meta.env.VITE_APP_URL || 'http://localhost:5173'}
                className="hidden md:inline-flex px-4 py-2 bg-primary-500 text-secondary-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors"
              >
                Go to Dashboard
              </a>
            ) : (
              <>
                <a
                  href="#signup"
                  className="hidden md:inline-flex text-neutral-700 dark:text-sand-300 hover:text-accent-500 dark:hover:text-accent-400 font-medium transition-colors"
                >
                  Sign In
                </a>
                    <a
                      href={import.meta.env.VITE_APP_URL || 'http://localhost:5173'}
                      className="px-4 py-2 bg-primary-500 text-secondary-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors shadow-sm"
                    >
                      Start Free
                    </a>
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 py-4">
            <div className="flex flex-col gap-4">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-neutral-700 dark:text-sand-300 hover:text-primary-500 dark:hover:text-primary-400 font-medium transition-colors px-2"
                >
                  {item.name}
                </a>
              ))}
              {!currentUser && (
                <a
                  href="#signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-neutral-700 dark:text-sand-300 hover:text-primary-500 dark:hover:text-primary-400 font-medium transition-colors px-2"
                >
                  Sign In
                </a>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}

