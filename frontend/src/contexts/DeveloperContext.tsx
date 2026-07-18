import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { isDeveloper } from '../lib/utils'

interface DeveloperContextType {
  isDevMode: boolean
  testMode: boolean
  toggleTestMode: () => void
}

const DeveloperContext = createContext<DeveloperContextType | undefined>(undefined)

export function useDeveloper() {
  const context = useContext(DeveloperContext)
  if (context === undefined) {
    throw new Error('useDeveloper must be used within a DeveloperProvider')
  }
  return context
}

interface DeveloperProviderProps {
  children: ReactNode
}

export function DeveloperProvider({ children }: DeveloperProviderProps) {
  const { currentUser } = useAuth()
  const [testMode, setTestMode] = useState(false)
  const isDevMode = isDeveloper(currentUser?.uid)

  // Load test mode preference from localStorage
  useEffect(() => {
    if (isDevMode) {
      const savedTestMode = localStorage.getItem('devTestMode')
      if (savedTestMode === 'true') {
        setTestMode(true)
      }
    } else {
      // If not a developer, ensure test mode is off
      setTestMode(false)
    }
  }, [isDevMode])

  const toggleTestMode = () => {
    if (!isDevMode) return // Only developers can toggle test mode

    const newTestMode = !testMode
    setTestMode(newTestMode)
    localStorage.setItem('devTestMode', String(newTestMode))
    console.log('🧪 Test mode:', newTestMode ? 'ENABLED' : 'DISABLED')
  }

  const value = {
    isDevMode,
    testMode,
    toggleTestMode,
  }

  return (
    <DeveloperContext.Provider value={value}>
      {children}
    </DeveloperContext.Provider>
  )
}
