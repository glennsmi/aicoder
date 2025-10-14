import { ReactNode, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from './Sidebar'
import AuthModal from './AuthModal'
import AccountSettingsModal from './AccountSettingsModal'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { currentUser } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [showAccountSettings, setShowAccountSettings] = useState(false)

  // If not authenticated, show centered content without sidebar
  if (!currentUser) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          {children}
        </div>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode={authMode}
        />
      </>
    )
  }

  // Authenticated: Show sidebar layout
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <Sidebar onOpenSettings={() => setShowAccountSettings(true)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <AccountSettingsModal 
        isOpen={showAccountSettings} 
        onClose={() => setShowAccountSettings(false)}
        stats={{ totalDays: 0, totalCost: 0, avgDailyCost: 0 }}
        onDeduplicate={async () => {}}
      />
    </div>
  )
}

