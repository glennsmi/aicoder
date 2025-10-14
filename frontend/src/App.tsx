import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { OrganizationProvider } from './contexts/OrganizationContext'
import { ThemeProvider } from './contexts/ThemeContext'
import HomePage from './pages/HomePage'
import CursorCostsPage from './pages/CursorCostsPage'
import CompleteEmailSignInPage from './pages/CompleteEmailSignInPage'
import CreateOrganizationPage from './pages/CreateOrganizationPage'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OrganizationProvider>
          <Router>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
              <main>
                <Routes>
                  <Route path="/" element={<CursorCostsPage />} />
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/auth/complete" element={<CompleteEmailSignInPage />} />
                  <Route path="/create-organization" element={<CreateOrganizationPage />} />
                </Routes>
              </main>
            </div>
          </Router>
        </OrganizationProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App 