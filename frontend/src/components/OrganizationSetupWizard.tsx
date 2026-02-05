import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebaseApp'
import { Organization, OrganizationTier } from '@shared'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../config/firebaseApp'

interface OrganizationSetupWizardProps {
  onComplete: (organizationId: string) => void
  onCancel?: () => void
}

type Step = 'info' | 'tier' | 'invite' | 'complete'

interface OrgFormData {
  name: string
  description: string
  tier: OrganizationTier
  inviteEmails: string[]
}

export default function OrganizationSetupWizard({ onComplete, onCancel }: OrganizationSetupWizardProps) {
  const { currentUser } = useAuth()
  const [currentStep, setCurrentStep] = useState<Step>('info')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState<OrgFormData>({
    name: '',
    description: '',
    tier: 'team',
    inviteEmails: [''],
  })

  const handleNext = () => {
    if (currentStep === 'info') {
      if (!formData.name.trim()) {
        setError('Please enter an organization name')
        return
      }
      setError('')
      setCurrentStep('tier')
    } else if (currentStep === 'tier') {
      setCurrentStep('invite')
    } else if (currentStep === 'invite') {
      handleSubmit()
    }
  }

  const handleBack = () => {
    setError('')
    if (currentStep === 'tier') {
      setCurrentStep('info')
    } else if (currentStep === 'invite') {
      setCurrentStep('tier')
    }
  }

  const handleSubmit = async () => {
    if (!currentUser) {
      setError('You must be logged in to create an organization')
      return
    }

    try {
      setLoading(true)
      setError('')

      // Create organization document
      const orgId = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const organizationData: Omit<Organization, 'id'> = {
        name: formData.name,
        tier: formData.tier,
        billingPlan: {
          seats: formData.tier === 'free' ? 1 : 10,
          usedSeats: 1,
          pricePerSeat: 0,
          baseFee: 0,
          billingCycle: 'monthly' as const,
        },
        settings: {
          apiIntegrations: [],
          dataRetentionDays: formData.tier === 'free' ? 90 : 365,
          allowMemberInvites: formData.tier !== 'free',
          requireTwoFactor: false,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: currentUser.uid,
      }

      // Create organization document
      await setDoc(doc(db, 'organizations', orgId), {
        ...organizationData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      // Create admin member document
      await setDoc(doc(db, 'organizations', orgId, 'members', currentUser.uid), {
        userId: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName || '',
        role: 'admin',
        teamId: null,
        joinedAt: serverTimestamp(),
        status: 'active',
        invitedBy: null,
        invitedAt: null,
      })

      // Update user document with organization
      await setDoc(
        doc(db, 'users', currentUser.uid),
        {
          organizationId: orgId,
          currentRole: 'admin',
          tier: formData.tier,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )

      // Create invitations for team members
      const validEmails = formData.inviteEmails.filter(email => 
        email.trim() && email.includes('@') && email !== currentUser.email
      )

      for (const email of validEmails) {
        const fn = httpsCallable(functions, 'createInvitation')
        await fn({
          organizationId: orgId,
          email: email.trim().toLowerCase(),
          role: 'member',
          teamId: null,
        })
      }

      setCurrentStep('complete')
      
      // Wait a moment to show success message, then complete
      setTimeout(() => {
        onComplete(orgId)
      }, 2000)
      
    } catch (err: any) {
      console.error('Error creating organization:', err)
      setError(err.message || 'Failed to create organization')
    } finally {
      setLoading(false)
    }
  }

  const addEmailField = () => {
    setFormData(prev => ({
      ...prev,
      inviteEmails: [...prev.inviteEmails, ''],
    }))
  }

  const removeEmailField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      inviteEmails: prev.inviteEmails.filter((_, i) => i !== index),
    }))
  }

  const updateEmailField = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      inviteEmails: prev.inviteEmails.map((email, i) => i === index ? value : email),
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gunmetal-900 text-white p-6 rounded-t-xl">
          <h2 className="text-2xl font-semibold">Create Your Organization</h2>
          <p className="text-white/70 mt-1">
            {currentStep === 'info' && 'Step 1 of 3: Basic Information'}
            {currentStep === 'tier' && 'Step 2 of 3: Choose Your Tier'}
            {currentStep === 'invite' && 'Step 3 of 3: Invite Team Members'}
            {currentStep === 'complete' && 'Setup Complete!'}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Organization Info */}
          {currentStep === 'info' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="orgName" className="block text-sm font-medium text-gunmetal-900 mb-1">
                  Organization Name *
                </label>
                <input
                  id="orgName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white text-gunmetal-900 placeholder:text-gray-400"
                  placeholder="Acme Inc."
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="orgDescription" className="block text-sm font-medium text-gunmetal-900 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  id="orgDescription"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white text-gunmetal-900 placeholder:text-gray-400"
                  placeholder="Brief description of your organization..."
                  rows={3}
                  disabled={loading}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  💡 You'll be set as the organization admin and can invite team members in the next steps.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Tier Selection */}
          {currentStep === 'tier' && (
            <div className="space-y-4">
              <p className="text-sm text-gunmetal-700 mb-4">
                Choose the plan that best fits your organization's needs
              </p>

              {/* Team Tier */}
              <button
                onClick={() => setFormData(prev => ({ ...prev, tier: 'team' }))}
                className={`w-full text-left p-6 border-2 rounded-xl transition-all ${
                  formData.tier === 'team'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gunmetal-900">Team</h3>
                    <p className="text-sm text-gunmetal-700 mt-1">
                      Perfect for growing teams up to 50 members
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-gunmetal-700">
                      <li className="flex items-center">
                        <svg className="w-5 h-5 text-primary-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Up to 50 users
                      </li>
                      <li className="flex items-center">
                        <svg className="w-5 h-5 text-primary-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        API integrations
                      </li>
                      <li className="flex items-center">
                        <svg className="w-5 h-5 text-primary-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Team management
                      </li>
                      <li className="flex items-center">
                        <svg className="w-5 h-5 text-primary-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Unlimited data retention
                      </li>
                    </ul>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-2xl font-bold text-gunmetal-900">£49</div>
                    <div className="text-sm text-gunmetal-700">base/month</div>
                    <div className="text-sm text-gunmetal-700 mt-1">+£12/user</div>
                  </div>
                </div>
              </button>

              {/* Enterprise Tier */}
              <button
                onClick={() => setFormData(prev => ({ ...prev, tier: 'enterprise' }))}
                className={`w-full text-left p-6 border-2 rounded-xl transition-all ${
                  formData.tier === 'enterprise'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gunmetal-900">Enterprise</h3>
                    <p className="text-sm text-gunmetal-700 mt-1">
                      For large organizations with advanced needs
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-gunmetal-700">
                      <li className="flex items-center">
                        <svg className="w-5 h-5 text-primary-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Unlimited users
                      </li>
                      <li className="flex items-center">
                        <svg className="w-5 h-5 text-primary-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Custom API integrations
                      </li>
                      <li className="flex items-center">
                        <svg className="w-5 h-5 text-primary-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Advanced analytics
                      </li>
                      <li className="flex items-center">
                        <svg className="w-5 h-5 text-primary-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Dedicated support
                      </li>
                    </ul>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-2xl font-bold text-gunmetal-900">£199</div>
                    <div className="text-sm text-gunmetal-700">base/month</div>
                    <div className="text-sm text-gunmetal-700 mt-1">+£8/user</div>
                  </div>
                </div>
              </button>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-blue-700">
                  💳 Billing integration coming soon. Your organization will be created and you can start inviting team members immediately.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Invite Members */}
          {currentStep === 'invite' && (
            <div className="space-y-4">
              <p className="text-sm text-gunmetal-700 mb-4">
                Invite team members to join your organization. They'll receive an email invitation.
              </p>

              <div className="space-y-3">
                {formData.inviteEmails.map((email, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => updateEmailField(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white text-gunmetal-900 placeholder:text-gray-400"
                      placeholder="colleague@example.com"
                      disabled={loading}
                    />
                    {formData.inviteEmails.length > 1 && (
                      <button
                        onClick={() => removeEmailField(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        disabled={loading}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addEmailField}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors flex items-center"
                disabled={loading}
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add another email
              </button>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-blue-700">
                  💡 You can skip this step and invite team members later from your organization dashboard.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 'complete' && (
            <div className="text-center py-8">
              <div className="mb-4">
                <svg className="w-16 h-16 mx-auto text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gunmetal-900 mb-2">Organization Created!</h3>
              <p className="text-sm text-gunmetal-700">
                Your organization <strong>{formData.name}</strong> has been successfully created.
                {formData.inviteEmails.filter(e => e.trim()).length > 0 && (
                  <span> Invitations have been sent to your team members.</span>
                )}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {currentStep !== 'complete' && (
          <div className="border-t border-gray-200 p-6 flex justify-between">
            <button
              onClick={currentStep === 'info' ? onCancel : handleBack}
              className="px-4 py-2 text-gunmetal-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={loading}
            >
              {currentStep === 'info' ? 'Cancel' : 'Back'}
            </button>
            <button
              onClick={handleNext}
              disabled={loading}
              className="px-6 py-2 bg-primary-500 text-gunmetal-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-gunmetal-900" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </div>
              ) : (
                currentStep === 'invite' ? 'Create Organization' : 'Next'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

