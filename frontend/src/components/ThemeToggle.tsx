import { useTheme } from '../contexts/ThemeContext'
import { Sun, Moon, Laptop } from 'lucide-react'

export default function ThemeToggle() {
  const { theme, actualTheme, setTheme } = useTheme()

  const themes = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'system' as const, label: 'System', icon: Laptop }
  ]

  const currentIndex = themes.findIndex(t => t.value === theme)

  return (
    <div className="relative">
      {/* Container - back to original size */}
      <div className="relative bg-gray-200 dark:bg-gray-700 rounded-full  transition-colors duration-200 px-2">
        <div className="flex relative">
          {/* Sliding background indicator - increased vertical padding */}
          <div 
            className="absolute top-1 bottom-1 bg-white dark:bg-gray-600 rounded-full shadow-md transition-all duration-300 ease-out p-2"
            style={{
              width: '33.333%',
              left: `${currentIndex * 33.333}%`,
            }}
          />
          
          {/* Theme options - back to original size */}
          {themes.map((themeOption) => {
            const IconComponent = themeOption.icon
            return (
              <button
                key={themeOption.value}
                onClick={() => setTheme(themeOption.value)}
                className={`
                  relative z-10 flex items-center justify-center pl-3 pr-6 py-3 rounded-full text-xs transition-all duration-200
                  ${theme === themeOption.value
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }
                `}
                style={{ width: '33.333%' }}
                title={`Switch to ${themeOption.label} theme`}
              >
                <IconComponent className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs ml-1 min-w-0">{themeOption.label}</span>
              </button>
            )
          })}
        </div>
      </div>
      
      {/* Current theme indicator */}
      {theme === 'system' && (
        <div className="absolute -bottom-7 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          Auto ({actualTheme})
        </div>
      )}
    </div>
  )
} 