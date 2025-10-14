import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import OrganizationSetupWizard from '../components/OrganizationSetupWizard'

export default function CreateOrganizationPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [showWizard, setShowWizard] = useState(false)

  const handleComplete = (organizationId: string) => {
    console.log('✅ Organization created:', organizationId)
    // Redirect to main dashboard after creation
    navigate('/')
  }

  const handleCancel = () => {
    navigate('/')
  }

  // If user already has an organization, redirect to home
  if (user?.organizationId) {
    navigate('/')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {!showWizard ? (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gunmetal-900 mb-4">
              Create Your Organization
            </h1>
            <p className="text-gunmetal-700 mb-6">
              Set up a team or enterprise organization to collaborate with your team, 
              track usage across multiple users, and unlock advanced features.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gunmetal-900 mb-2">Team</h3>
                <ul className="space-y-2 text-sm text-gunmetal-700 mb-4">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-primary-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Up to 50 team members</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-primary-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>API integrations</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-primary-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Team management & roles</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-primary-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Unlimited data retention</span>
                  </li>
                </ul>
                <div className="text-2xl font-bold text-gunmetal-900">£49/mo</div>
                <div className="text-sm text-gunmetal-700">+ £12/user per month</div>
              </div>

              <div className="border border-primary-500 rounded-lg p-6 bg-primary-50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gunmetal-900">Enterprise</h3>
                  <span className="text-xs font-semibold text-primary-600 bg-white px-2 py-1 rounded">POPULAR</span>
                </div>
                <ul className="space-y-2 text-sm text-gunmetal-700 mb-4">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-primary-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Unlimited team members</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-primary-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Custom API integrations</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-primary-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Advanced analytics & reporting</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-primary-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Dedicated support</span>
                  </li>
                </ul>
                <div className="text-2xl font-bold text-gunmetal-900">£199/mo</div>
                <div className="text-sm text-gunmetal-700">+ £8/user per month</div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowWizard(true)}
                className="flex-1 px-6 py-3 bg-primary-500 text-gunmetal-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors"
              >
                Get Started
              </button>
              <button
                onClick={handleCancel}
                className="px-6 py-3 border border-gray-300 text-gunmetal-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Maybe Later
              </button>
            </div>

            <p className="text-xs text-gunmetal-600 mt-6 text-center">
              💳 Full billing integration coming soon. You can create your organization now and start inviting team members.
            </p>
          </div>
        ) : (
          <OrganizationSetupWizard 
            onComplete={handleComplete}
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  )
}

