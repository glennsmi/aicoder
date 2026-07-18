import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  actualTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Get system preference
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'dark' // Default to dark
  }

  // Calculate actual theme based on preference
  const calculateActualTheme = (themePreference: Theme): 'light' | 'dark' => {
    if (themePreference === 'system') {
      return getSystemTheme()
    }
    return themePreference
  }

  // Initialize with saved theme or default to dark
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as Theme) || 'dark'
    }
    return 'dark'
  })

  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = (localStorage.getItem('theme') as Theme) || 'dark'
      return calculateActualTheme(savedTheme)
    }
    return 'dark'
  })

  // Apply theme to document immediately
  const applyThemeToDocument = (themeToApply: 'light' | 'dark') => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement
      
      // Force remove all theme classes
      root.classList.remove('light', 'dark')
      
      // Force add the new theme class
      root.classList.add(themeToApply)
      
      // Also set a data attribute as backup
      root.setAttribute('data-theme', themeToApply)
      
      // Debug logging
      console.log('Applied theme:', themeToApply)
      console.log('Document classes:', root.className)
      console.log('Document classList contains dark:', root.classList.contains('dark'))
      console.log('Document classList contains light:', root.classList.contains('light'))
    }
  }

  // Apply theme on mount and whenever actualTheme changes
  useEffect(() => {
    applyThemeToDocument(actualTheme)
  }, [actualTheme])

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        const newSystemTheme = getSystemTheme()
        setActualTheme(newSystemTheme)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const handleSetTheme = (newTheme: Theme) => {
    const newActualTheme = calculateActualTheme(newTheme)
    setTheme(newTheme)
    setActualTheme(newActualTheme)
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme)
    }
  }

  const toggleTheme = () => {
    const newTheme = actualTheme === 'light' ? 'dark' : 'light'
    handleSetTheme(newTheme)
  }

  return (
    <ThemeContext.Provider value={{
      theme,
      actualTheme,
      setTheme: handleSetTheme,
      toggleTheme
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
} 