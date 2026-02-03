import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useOrganization } from '../contexts/OrganizationContext'
import { useTheme } from '../contexts/ThemeContext'
import { useDeveloper } from '../contexts/DeveloperContext'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, user, logout } = useAuth()
  const { organization } = useOrganization() // currentMember unused for now
  const { actualTheme, setTheme } = useTheme()
  const { isDevMode, testMode, toggleTestMode } = useDeveloper()
  const [collapsed, setCollapsed] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  // Check if user is admin (for legacy admin panel) - unused for now
  // const isAdmin = currentUser && currentUser.email === 'glenn@aicoder.guru'

  // Determine user's role and tier
  const userRole = user?.currentRole || 'individual'
  const userTier = user?.tier || 'free_individual'

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  // Navigation items based on role/tier
  const getNavigationItems = () => {
    if (!currentUser) return []

    const items = []

    // All users get "My Usage" - the core CSV upload & charts functionality
    items.push({
      label: 'My Usage',
      path: '/',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    })

    // Admin-specific items
    if (userRole === 'admin' && organization) {
      items.push(
        {
          label: 'Organization Dashboard',
          path: '/dashboard',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
            </svg>
          ),
        },
        {
          label: 'Team Management',
          path: '/teams',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
        },
        {
          label: 'User Management',
          path: '/users',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
        },
        {
          label: 'API Connections',
          path: '/api-connections',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
        }
      )

      items.push({
        label: 'Billing & Subscription',
        path: '/billing',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        ),
      })
    } else if (userRole === 'team_manager' && organization) {
      items.push(
        {
          label: 'Team Dashboard',
          path: '/team-dashboard',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
        },
        {
          label: 'Team Members',
          path: '/team-members',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
        }
      )
    } else if (userRole === 'member' && organization) {
      items.push({
        label: 'Team Overview',
        path: '/team-overview',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
      })
    } else if (userTier === 'paid_individual') {
      items.push(
        {
          label: 'API Connections',
          path: '/api-connections',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
        },
        {
          label: 'Account & Billing',
          path: '/billing',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          ),
        }
      )
    }

    return items
  }

  const navItems = getNavigationItems()

  if (!currentUser) return null

  return (
    <div className={`flex flex-col h-screen bg-secondary-900 text-white transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
      {/* Logo */}
      <div className="flex items-center p-4 border-b border-secondary-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img
              src="/logos/jade-guru.svg"
              alt="AICoder.Guru"
              className="w-8 h-8 flex-shrink-0"
            />
            <div>
              <h1 className="font-bold text-sm">AICoder.Guru</h1>
            </div>
          </div>
        )}
        {collapsed && (
          <img
            src="/logos/jade-guru.svg"
            alt="AICoder.Guru"
            className="w-8 h-8 mx-auto"
          />
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 flex flex-col overflow-y-auto py-4">
        <div className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                  ? 'bg-accent-400 text-neutral-900 font-semibold'
                  : 'text-white/80 hover:bg-secondary-800 hover:text-white'
                  }`}
                title={collapsed ? item.label : undefined}
              >
                {item.icon}
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </button>
            )
          })}

          {/* Create Team Button (for free individual users) */}
          {user && user.tier === 'free_individual' && !organization && (
            <>
              <div className="my-4 border-t border-secondary-700" />
              <button
                onClick={() => navigate('/create-organization')}
                className="w-full flex items-center gap-3 px-3 py-2.5 bg-accent-400/20 text-accent-400 rounded-lg hover:bg-accent-400/30 transition-all font-medium"
                title={collapsed ? 'Create Team' : undefined}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {!collapsed && <span className="text-sm">Create Team</span>}
              </button>
            </>
          )}
        </div>

        {/* Spacer to push collapse button to bottom */}
        <div className="flex-1"></div>

        {/* Collapse/Expand Button */}
        <div className="px-2 pb-4">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center px-3 py-2.5 hover:bg-secondary-800 rounded-lg transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg className="w-5 h-5 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"} />
            </svg>
          </button>
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-secondary-700">
        {/* Developer Test Mode Toggle - Only visible to developers */}
        {isDevMode && (
          <button
            onClick={toggleTestMode}
            className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${testMode
                ? 'bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/40'
                : 'text-white/80 hover:bg-secondary-800 hover:text-white'
              }`}
            title={collapsed ? (testMode ? 'Test mode ON' : 'Test mode OFF') : undefined}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            {!collapsed && (
              <div className="flex-1 flex items-center justify-between">
                <span className="text-sm font-medium">Test Mode</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${testMode
                    ? 'bg-yellow-400 text-neutral-900'
                    : 'bg-secondary-700 text-white/60'
                  }`}>
                  {testMode ? 'ON' : 'OFF'}
                </span>
              </div>
            )}
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(actualTheme === 'dark' ? 'light' : 'dark')}
          className="w-full flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-secondary-800 hover:text-white transition-colors"
          title={collapsed ? (actualTheme === 'dark' ? 'Light mode' : 'Dark mode') : undefined}
        >
          {actualTheme === 'dark' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
          {!collapsed && <span className="text-sm">{actualTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-secondary-800 transition-colors"
          >
            <div className="w-8 h-8 bg-accent-400 rounded-full flex items-center justify-center text-neutral-900 font-semibold text-sm flex-shrink-0">
              {currentUser.email?.[0].toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium truncate">{currentUser.displayName || 'User'}</p>
                <p className="text-xs text-white/60 truncate">{currentUser.email}</p>
              </div>
            )}
            {!collapsed && (
              <svg
                className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </button>

          {showUserMenu && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />

              {/* Menu - Solid background with distinct styling */}
              <div className={`absolute ${collapsed ? 'left-full ml-2' : 'left-0'} bottom-full mb-2 w-64 bg-secondary-950 rounded-lg shadow-2xl border-2 border-accent-400 py-2 z-50`}>
                {organization && (
                  <div className="px-4 py-3 border-b border-accent-400/30">
                    <p className="text-xs text-white/60 uppercase tracking-wide font-semibold">Organization</p>
                    <p className="text-sm font-bold text-white mt-1">{organization.name}</p>
                    <p className="text-xs text-accent-400 capitalize font-medium mt-1">{userRole} • {userTier.replace('_', ' ')}</p>
                  </div>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-900/20 transition-colors flex items-center gap-2 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

