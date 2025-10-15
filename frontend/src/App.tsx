import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { OrganizationProvider } from './contexts/OrganizationContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'
import CursorCostsPage from './pages/CursorCostsPage'
import CompleteEmailSignInPage from './pages/CompleteEmailSignInPage'
import CreateOrganizationPage from './pages/CreateOrganizationPage'
import DashboardPage from './pages/DashboardPage'
import TeamsPage from './pages/TeamsPage'
import UsersPage from './pages/UsersPage'
import BillingPage from './pages/BillingPage'
import APIConnectionsPage from './pages/APIConnectionsPage'
import TeamDashboardPage from './pages/TeamDashboardPage'
import TeamMembersPage from './pages/TeamMembersPage'
import TeamOverviewPage from './pages/TeamOverviewPage'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OrganizationProvider>
          <Router>
            <Layout>
              <Routes>
                {/* Default route - CSV Upload & Usage Charts (core functionality) */}
                <Route path="/" element={<CursorCostsPage />} />
                
                {/* Auth routes */}
                <Route path="/auth/complete" element={<CompleteEmailSignInPage />} />
                <Route path="/create-organization" element={<CreateOrganizationPage />} />
                
                {/* Organization routes (for admins/team managers) */}
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/teams" element={<TeamsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/billing" element={<BillingPage />} />
                <Route path="/api-connections" element={<APIConnectionsPage />} />
                
                {/* Team routes */}
                <Route path="/team-dashboard" element={<TeamDashboardPage />} />
                <Route path="/team-members" element={<TeamMembersPage />} />
                <Route path="/team-overview" element={<TeamOverviewPage />} />
                
                {/* Redirect any unknown routes to home */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </Router>
        </OrganizationProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App 