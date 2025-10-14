import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { OrganizationProvider } from './contexts/OrganizationContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
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
                <Route path="/" element={<CursorCostsPage />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/auth/complete" element={<CompleteEmailSignInPage />} />
                <Route path="/create-organization" element={<CreateOrganizationPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/teams" element={<TeamsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/billing" element={<BillingPage />} />
                <Route path="/api-connections" element={<APIConnectionsPage />} />
                <Route path="/team-dashboard" element={<TeamDashboardPage />} />
                <Route path="/team-members" element={<TeamMembersPage />} />
                <Route path="/team-overview" element={<TeamOverviewPage />} />
              </Routes>
            </Layout>
          </Router>
        </OrganizationProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App 