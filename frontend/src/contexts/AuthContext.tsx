import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { 
  User as FirebaseUser, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth'
import { 
  doc, 
  setDoc, 
  serverTimestamp, 
  getDoc, 
  query, 
  collection, 
  where, 
  getDocs,
  updateDoc,
  Timestamp 
} from 'firebase/firestore'
import { auth, db } from '../config/firebaseApp'
import { User, Invitation, OrganizationRole } from '@cursor-costs/shared'

interface AuthContextType {
  currentUser: FirebaseUser | null
  user: User | null // Full user object from Firestore
  loading: boolean
  signup: (email: string, password: string, name?: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  acceptInvitation: (invitationId: string) => Promise<void>
  hasPendingInvitation: () => Promise<Invitation | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(true)

  // Fetch full user data from Firestore
  async function fetchUserData(uid: string): Promise<User | null> {
    try {
      const userDocRef = doc(db, 'users', uid)
      const userDocSnap = await getDoc(userDocRef)
      
      if (userDocSnap.exists()) {
        return {
          id: userDocSnap.id,
          ...userDocSnap.data()
        } as User
      }
      return null
    } catch (error) {
      console.error('Error fetching user data:', error)
      return null
    }
  }

  // Check for pending invitations for the user's email
  async function hasPendingInvitation(): Promise<Invitation | null> {
    if (!currentUser?.email) return null

    try {
      const invitationsRef = collection(db, 'invitations')
      const q = query(
        invitationsRef,
        where('email', '==', currentUser.email),
        where('status', '==', 'pending')
      )
      
      const snapshot = await getDocs(q)
      
      if (!snapshot.empty) {
        const inviteDoc = snapshot.docs[0]
        return {
          id: inviteDoc.id,
          ...inviteDoc.data()
        } as Invitation
      }
      
      return null
    } catch (error) {
      console.error('Error checking for invitations:', error)
      return null
    }
  }

  // Accept an invitation to join an organization
  async function acceptInvitation(invitationId: string): Promise<void> {
    if (!currentUser) throw new Error('Must be logged in to accept invitation')

    try {
      console.log('🎫 Accepting invitation:', invitationId)
      
      // Get invitation details
      const inviteDoc = await getDoc(doc(db, 'invitations', invitationId))
      if (!inviteDoc.exists()) {
        throw new Error('Invitation not found')
      }

      const invitation = inviteDoc.data() as Invitation

      // Verify the email matches
      if (invitation.email !== currentUser.email) {
        throw new Error('This invitation is for a different email address')
      }

      // Check if invitation is still valid
      if (invitation.status !== 'pending') {
        throw new Error('This invitation has already been used or expired')
      }

      const now = Timestamp.now()
      if (invitation.expiresAt < now) {
        throw new Error('This invitation has expired')
      }

      console.log('✅ Invitation valid, joining organization:', invitation.organizationId)

      // Update user document to join the organization
      await updateDoc(doc(db, 'users', currentUser.uid), {
        organizationId: invitation.organizationId,
        currentRole: invitation.role,
        tier: 'team', // Default tier for org members
        updatedAt: serverTimestamp(),
      })

      // Create member document in organization
      await setDoc(doc(db, 'organizations', invitation.organizationId, 'members', currentUser.uid), {
        userId: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName || '',
        role: invitation.role,
        teamId: invitation.teamId || null,
        invitedAt: invitation.createdAt,
        joinedAt: serverTimestamp(),
        status: 'active',
        invitedBy: invitation.invitedBy,
      })

      // Update invitation status
      await updateDoc(doc(db, 'invitations', invitationId), {
        status: 'accepted',
        acceptedBy: currentUser.uid,
        acceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      // Refresh user data
      const updatedUser = await fetchUserData(currentUser.uid)
      setUser(updatedUser)

      console.log('🎉 Successfully joined organization')
    } catch (error) {
      console.error('❌ Failed to accept invitation:', error)
      throw error
    }
  }

  // Create a personal organization for individual users
  async function createPersonalOrganization(userId: string, userEmail: string): Promise<string> {
    console.log('🏢 Creating personal organization for:', userEmail)
    
    const orgRef = doc(collection(db, 'organizations'))
    const orgId = orgRef.id

    const orgData = {
      name: `${userEmail}'s Workspace`,
      tier: 'free' as const,
      billingPlan: {
        seats: 1,
        usedSeats: 1,
        pricePerSeat: 0,
        baseFee: 0,
        billingCycle: 'monthly' as const,
      },
      settings: {
        apiIntegrations: [],
        dataRetentionDays: 90,
        allowMemberInvites: false,
        requireTwoFactor: false,
      },
      ownerId: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    await setDoc(orgRef, orgData)

    // Create self as admin member
    await setDoc(doc(db, 'organizations', orgId, 'members', userId), {
      userId,
      email: userEmail,
      displayName: currentUser?.displayName || '',
      role: 'admin' as OrganizationRole,
      invitedAt: serverTimestamp(),
      joinedAt: serverTimestamp(),
      status: 'active',
    })

    console.log('✅ Personal organization created:', orgId)
    return orgId
  }

  // Sign up with email and password
  async function signup(email: string, password: string, name?: string) {
    console.log('🚀 Starting signup process for:', email)
    
    try {
      console.log('1️⃣ Creating Firebase Auth user...')
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      console.log('✅ Firebase Auth user created:', userCredential.user.uid)
      
      // Update the user's display name if provided
      if (name && userCredential.user) {
        console.log('2️⃣ Updating display name...')
        await updateProfile(userCredential.user, {
          displayName: name
        })
        console.log('✅ Display name updated')
      }

      // Check for pending invitations
      console.log('3️⃣ Checking for pending invitations...')
      const invitationsRef = collection(db, 'invitations')
      const inviteQuery = query(
        invitationsRef,
        where('email', '==', email),
        where('status', '==', 'pending')
      )
      const inviteSnapshot = await getDocs(inviteQuery)

      let organizationId: string | null = null
      let userRole: OrganizationRole = 'individual'
      let userTier: 'free_individual' | 'paid_individual' | 'team' | 'enterprise' = 'free_individual'

      // If there's a pending invitation, accept it during signup
      if (!inviteSnapshot.empty) {
        const invitation = inviteSnapshot.docs[0].data() as Invitation
        console.log('📨 Found pending invitation to organization:', invitation.organizationId)
        
        organizationId = invitation.organizationId
        userRole = invitation.role
        userTier = 'team'

        // Create member document
        await setDoc(doc(db, 'organizations', organizationId, 'members', userCredential.user.uid), {
          userId: userCredential.user.uid,
          email: email,
          displayName: name || '',
          role: invitation.role,
          teamId: invitation.teamId || null,
          invitedAt: invitation.createdAt,
          joinedAt: serverTimestamp(),
          status: 'active',
          invitedBy: invitation.invitedBy,
        })

        // Mark invitation as accepted
        await updateDoc(doc(db, 'invitations', inviteSnapshot.docs[0].id), {
          status: 'accepted',
          acceptedBy: userCredential.user.uid,
          acceptedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })

        console.log('✅ Automatically accepted invitation during signup')
      } else {
        // No invitation - create personal organization for free individual tier
        console.log('🏢 No invitation found, creating personal organization...')
        organizationId = await createPersonalOrganization(
          userCredential.user.uid,
          email || ''
        )
        userRole = 'admin'
        userTier = 'free_individual'
      }

      // Create user document in Firestore
      console.log('4️⃣ Creating Firestore user document...')
      const userDoc = {
        email: userCredential.user.email,
        displayName: name || userCredential.user.displayName || '',
        organizationId,
        currentRole: userRole,
        tier: userTier,
        preferences: {
          primaryCurrency: 'GBP', 
          lastUpdated: serverTimestamp(),
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      console.log('📄 User document to create:', userDoc)

      try {
        await setDoc(doc(db, 'users', userCredential.user.uid), userDoc)
        console.log('✅ User document created in Firestore for:', userCredential.user.uid)
        console.log('📧 This should trigger the welcome email function')
      } catch (error) {
        console.error('❌ Failed to create user document:', error)
        throw error
      }
    } catch (authError) {
      console.error('❌ Auth signup failed:', authError)
      throw authError
    }
  }

  // Login with email and password
  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password)
  }

  // Login with Google
  async function loginWithGoogle() {
    console.log('🚀 Starting Google sign-in process...')
    
    const provider = new GoogleAuthProvider()
    provider.addScope('email')
    provider.addScope('profile')
    
    provider.setCustomParameters({
      prompt: 'select_account'
    })
    
    try {
      console.log('1️⃣ Opening Google sign-in popup...')
      const result = await signInWithPopup(auth, provider)
      console.log('✅ Google sign-in successful for:', result.user.email)
      
      // Check if user document already exists
      console.log('2️⃣ Checking if user document exists...')
      const userDocRef = doc(db, 'users', result.user.uid)
      const userDocSnap = await getDoc(userDocRef)
      
      // Only create document if it doesn't exist
      if (!userDocSnap.exists()) {
        console.log('3️⃣ New user, checking for invitations...')
        
        // Check for pending invitations
        const invitationsRef = collection(db, 'invitations')
        const inviteQuery = query(
          invitationsRef,
          where('email', '==', result.user.email),
          where('status', '==', 'pending')
        )
        const inviteSnapshot = await getDocs(inviteQuery)

        let organizationId: string | null = null
        let userRole: OrganizationRole = 'individual'
        let userTier: 'free_individual' | 'paid_individual' | 'team' | 'enterprise' = 'free_individual'

        if (!inviteSnapshot.empty) {
          const invitation = inviteSnapshot.docs[0].data() as Invitation
          console.log('📨 Found pending invitation to organization:', invitation.organizationId)
          
          organizationId = invitation.organizationId
          userRole = invitation.role
          userTier = 'team'

          // Create member document
          await setDoc(doc(db, 'organizations', organizationId, 'members', result.user.uid), {
            userId: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName || '',
            role: invitation.role,
            teamId: invitation.teamId || null,
            invitedAt: invitation.createdAt,
            joinedAt: serverTimestamp(),
            status: 'active',
            invitedBy: invitation.invitedBy,
          })

          // Mark invitation as accepted
          await updateDoc(doc(db, 'invitations', inviteSnapshot.docs[0].id), {
            status: 'accepted',
            acceptedBy: result.user.uid,
            acceptedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        } else {
          // Create personal organization
          organizationId = await createPersonalOrganization(
            result.user.uid,
            result.user.email || ''
          )
          userRole = 'admin'
          userTier = 'free_individual'
        }

        const userDoc = {
          email: result.user.email,
          displayName: result.user.displayName || '',
          organizationId,
          currentRole: userRole,
          tier: userTier,
          preferences: {
            primaryCurrency: 'GBP',
            lastUpdated: serverTimestamp(),
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }

        console.log('📄 Google user document to create:', userDoc)

        try {
          await setDoc(userDocRef, userDoc)
          console.log('✅ New Google user document created in Firestore for:', result.user.uid)
          console.log('📧 This should trigger the welcome email function')
        } catch (error) {
          console.error('❌ Failed to create Google user document:', error)
          throw error
        }
      } else {
        console.log('👤 Existing user signed in:', result.user.uid)
      }
      
    } catch (error: any) {
      console.error('❌ Google sign-in failed:', error)
      if (error.code === 'auth/popup-blocked') {
        throw new Error('Popup blocked. Please allow popups for this site and try again.')
      } else if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in cancelled. Please try again.')
      } else {
        throw error
      }
    }
  }

  // Logout
  async function logout() {
    await signOut(auth)
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setCurrentUser(firebaseUser)
      
      if (firebaseUser) {
        // Fetch full user data from Firestore
        const userData = await fetchUserData(firebaseUser.uid)
        setUser(userData)
      } else {
        setUser(null)
      }
      
      setLoading(false)
      if (initializing) {
        setInitializing(false)
      }
    })

    return unsubscribe
  }, [initializing])

  const value = {
    currentUser,
    user,
    loading: loading || initializing,
    signup,
    login,
    loginWithGoogle,
    logout,
    acceptInvitation,
    hasPendingInvitation,
  }

  // Show loading spinner while initializing
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 