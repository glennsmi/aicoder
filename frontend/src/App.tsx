import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { AuthProvider } from './contexts/AuthContext'
import { OrganizationProvider } from './contexts/OrganizationContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { DeveloperProvider } from './contexts/DeveloperContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import CursorCostsPage from './pages/CursorCostsPage'
import CompleteEmailSignInPage from './pages/CompleteEmailSignInPage'
import CreateOrganizationPage from './pages/CreateOrganizationPage'
import InvitationAcceptPage from './pages/InvitationAcceptPage'
import DashboardPage from './pages/DashboardPage'
import TeamsPage from './pages/TeamsPage'
import UsersPage from './pages/UsersPage'
import BillingPage from './pages/BillingPage'
import APIConnectionsPage from './pages/APIConnectionsPage'
import TeamDashboardPage from './pages/TeamDashboardPage'
import TeamMembersPage from './pages/TeamMembersPage'
import TeamOverviewPage from './pages/TeamOverviewPage'
import OrganizationSettingsPage from './pages/OrganizationSettingsPage'

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-secondary-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-400"></div>
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DeveloperProvider>
          <OrganizationProvider>
            <Router>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/auth/complete" element={<CompleteEmailSignInPage />} />
                <Route path="/invite" element={<InvitationAcceptPage />} />

                {/* Protected routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout><CursorCostsPage /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/create-organization" element={
                  <ProtectedRoute>
                    <Layout><CreateOrganizationPage /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Layout><DashboardPage /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/teams" element={
                  <ProtectedRoute>
                    <Layout><TeamsPage /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/users" element={
                  <ProtectedRoute>
                    <Layout><UsersPage /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/billing" element={
                  <ProtectedRoute>
                    <Layout><BillingPage /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/organization-settings" element={
                  <ProtectedRoute>
                    <Layout><OrganizationSettingsPage /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/api-connections" element={
                  <ProtectedRoute>
                    <Layout><APIConnectionsPage /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/team-dashboard" element={
                  <ProtectedRoute>
                    <Layout><TeamDashboardPage /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/team-members" element={
                  <ProtectedRoute>
                    <Layout><TeamMembersPage /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/team-overview" element={
                  <ProtectedRoute>
                    <Layout><TeamOverviewPage /></Layout>
                  </ProtectedRoute>
                } />

                {/* Redirect any unknown routes */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </OrganizationProvider>
        </DeveloperProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App