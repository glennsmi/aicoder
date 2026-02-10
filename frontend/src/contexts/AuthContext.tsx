import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { 
  User as FirebaseUser, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
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
  Timestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { auth, db, functions, storage } from '../config/firebaseApp'
import { User, Invitation, OrganizationRole } from '@shared'
import { httpsCallable } from 'firebase/functions'

function isFirebaseStorageUrl(url: string): boolean {
  return url.includes('firebasestorage.googleapis.com') || url.includes('storage.googleapis.com')
}

function getImageExtensionFromContentType(contentType: string | undefined): string {
  const normalized = String(contentType || '').toLowerCase()
  if (normalized.includes('png')) return 'png'
  if (normalized.includes('webp')) return 'webp'
  if (normalized.includes('gif')) return 'gif'
  return 'jpg'
}

interface AuthContextType {
  currentUser: FirebaseUser | null
  user: User | null // Full user object from Firestore
  loading: boolean
  signup: (email: string, password: string, name?: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  sendEmailLink: (email: string) => Promise<void>
  completeEmailLinkSignIn: (email: string, emailLink?: string) => Promise<void>
  isEmailLinkSignIn: () => boolean
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
  const [userListener, setUserListener] = useState<Unsubscribe | null>(null)

  // Set up real-time listener for user document changes
  function setupUserListener(uid: string) {
    // Clean up existing listener
    if (userListener) {
      userListener()
      setUserListener(null)
    }

    const unsubscribe = onSnapshot(
      doc(db, 'users', uid),
      (doc) => {
        if (doc.exists()) {
          const userData = {
            id: doc.id,
            ...doc.data()
          } as User
          setUser(userData)
          console.log('User data updated via real-time listener:', userData)
        } else {
          setUser(null)
        }
      },
      (error) => {
        console.error('User listener error:', error)
      }
    )

    setUserListener(() => unsubscribe)
  }

  // Clean up user listener
  function cleanupUserListener() {
    if (userListener) {
      userListener()
      setUserListener(null)
    }
  }

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

  // For provider-auth users (e.g. Google), copy external avatar to our own Storage path once.
  // This gives us a durable image URL we control and can render reliably in the app.
  async function mirrorAuthAvatarToStorage(firebaseUser: FirebaseUser, userData: User | null): Promise<string | null> {
    const authPhotoUrl = String(firebaseUser.photoURL || '').trim()
    const firestorePhotoUrl = String((userData as any)?.profileImageUrl || '').trim()

    if (!authPhotoUrl) return null
    if (isFirebaseStorageUrl(authPhotoUrl)) return authPhotoUrl
    if (firestorePhotoUrl && isFirebaseStorageUrl(firestorePhotoUrl)) {
      try {
        if (authPhotoUrl !== firestorePhotoUrl) {
          await updateProfile(firebaseUser, { photoURL: firestorePhotoUrl })
        }
      } catch (e) {
        console.warn('Failed to sync auth avatar URL from Firestore:', e)
      }
      return firestorePhotoUrl
    }

    try {
      const response = await fetch(authPhotoUrl)
      if (!response.ok) throw new Error(`Avatar fetch failed (${response.status})`)

      const avatarBlob = await response.blob()
      if (!String(avatarBlob.type || '').startsWith('image/')) {
        throw new Error('Avatar content is not an image')
      }

      const extension = getImageExtensionFromContentType(avatarBlob.type)
      const objectPath = `users/${firebaseUser.uid}/avatar/provider_${Date.now()}.${extension}`
      const objectRef = ref(storage, objectPath)

      await uploadBytes(objectRef, avatarBlob, {
        contentType: avatarBlob.type || 'image/jpeg',
        cacheControl: 'public,max-age=31536000',
      })
      const storedUrl = await getDownloadURL(objectRef)

      await updateProfile(firebaseUser, { photoURL: storedUrl })
      await setDoc(
        doc(db, 'users', firebaseUser.uid),
        { profileImageUrl: storedUrl, profileImagePath: objectPath, updatedAt: serverTimestamp() },
        { merge: true }
      )
      return storedUrl
    } catch (e) {
      console.warn('Failed to mirror auth avatar to Storage:', e)
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

      if (!(invitation as any).token) {
        throw new Error('This invitation link is missing a token. Ask your admin to resend the invitation.')
      }

      console.log('✅ Invitation valid, accepting via Cloud Function:', invitation.organizationId)
      const fn = httpsCallable(functions, 'acceptInvitationByToken')
      await fn({ invitationId, token: (invitation as any).token })

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
      let userRole: OrganizationRole = 'admin' // Default role for new organization creator
      let userTier: 'free_individual' | 'paid_individual' | 'team' | 'enterprise' = 'free_individual'

      // If there's a pending invitation, accept it during signup
      if (!inviteSnapshot.empty) {
        const invitationId = inviteSnapshot.docs[0].id
        const invitation = inviteSnapshot.docs[0].data() as any as Invitation
        console.log('📨 Found pending invitation to organization:', invitation.organizationId)
        
        organizationId = invitation.organizationId
        userRole = invitation.role
        userTier = 'team'

        if (!(invitation as any).token) {
          throw new Error('Invitation is missing a token. Ask your admin to resend the invitation.')
        }

        console.log('✅ Accepting invitation via Cloud Function...')
        const acceptFn = httpsCallable(functions, 'acceptInvitationByToken')
        await acceptFn({ invitationId, token: (invitation as any).token })
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
        let userRole: OrganizationRole = 'admin' // Default role for new organization creator
        let userTier: 'free_individual' | 'paid_individual' | 'team' | 'enterprise' = 'free_individual'

        if (!inviteSnapshot.empty) {
          const invitationId = inviteSnapshot.docs[0].id
          const invitation = inviteSnapshot.docs[0].data() as any as Invitation
          console.log('📨 Found pending invitation to organization:', invitation.organizationId)
          
          organizationId = invitation.organizationId
          userRole = invitation.role
          userTier = 'team'

          if (!(invitation as any).token) {
            throw new Error('Invitation is missing a token. Ask your admin to resend the invitation.')
          }

          console.log('✅ Accepting invitation via Cloud Function...')
          const acceptFn = httpsCallable(functions, 'acceptInvitationByToken')
          await acceptFn({ invitationId, token: (invitation as any).token })
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

  // Send email link for passwordless sign-in
  async function sendEmailLink(email: string) {
    console.log('📧 Sending sign-in link to:', email)
    console.log('🌐 Current origin:', window.location.origin)
    
    // Action code settings for email link
    const actionCodeSettings = {
      // URL you want to redirect back to. The domain must be in the authorized domains list.
      url: `${window.location.origin}/auth/complete`,
      // This must be true for email link sign-in
      handleCodeInApp: true,
    }

    console.log('⚙️ Action code settings:', actionCodeSettings)

    try {
      console.log('📤 Calling Firebase sendSignInLinkToEmail...')
      await sendSignInLinkToEmail(auth, email, actionCodeSettings)
      
      // Save the email locally so we can use it to complete sign-in
      window.localStorage.setItem('emailForSignIn', email)
      
      console.log('✅ Sign-in link sent successfully to:', email)
      console.log('💾 Email saved to localStorage')
    } catch (error: any) {
      console.error('❌ Failed to send sign-in link')
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      console.error('Full error:', error)
      
      // Provide user-friendly error messages
      if (error.code === 'auth/operation-not-allowed') {
        throw new Error('Email link sign-in is not enabled. Please contact support.')
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.')
      } else if (error.code === 'auth/missing-email') {
        throw new Error('Please enter your email address.')
      } else {
        throw new Error(error.message || 'Failed to send sign-in link. Please try again.')
      }
    }
  }

  // Check if the current URL is an email link sign-in
  function isEmailLinkSignIn(): boolean {
    return isSignInWithEmailLink(auth, window.location.href)
  }

  // Complete email link sign-in
  async function completeEmailLinkSignIn(email: string, emailLink?: string) {
    console.log('🔗 Completing email link sign-in for:', email)
    
    const link = emailLink || window.location.href
    
    if (!isSignInWithEmailLink(auth, link)) {
      throw new Error('Invalid email link')
    }

    try {
      console.log('1️⃣ Signing in with email link...')
      const result = await signInWithEmailLink(auth, email, link)
      console.log('✅ Email link sign-in successful for:', result.user.email)
      
      // Clear the email from storage
      window.localStorage.removeItem('emailForSignIn')
      
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
          where('email', '==', email),
          where('status', '==', 'pending')
        )
        const inviteSnapshot = await getDocs(inviteQuery)

        let organizationId: string | null = null
        let userRole: OrganizationRole = 'admin' // Default role for new organization creator
        let userTier: 'free_individual' | 'paid_individual' | 'team' | 'enterprise' = 'free_individual'

        if (!inviteSnapshot.empty) {
          const invitationId = inviteSnapshot.docs[0].id
          const invitation = inviteSnapshot.docs[0].data() as any as Invitation
          console.log('📨 Found pending invitation to organization:', invitation.organizationId)
          
          organizationId = invitation.organizationId
          userRole = invitation.role
          userTier = 'team'

          if (!(invitation as any).token) {
            throw new Error('Invitation is missing a token. Ask your admin to resend the invitation.')
          }

          console.log('✅ Accepting invitation via Cloud Function...')
          const acceptFn = httpsCallable(functions, 'acceptInvitationByToken')
          await acceptFn({ invitationId, token: (invitation as any).token })
        } else {
          // Create personal organization
          organizationId = await createPersonalOrganization(
            result.user.uid,
            email
          )
          userRole = 'admin'
          userTier = 'free_individual'
        }

        const userDoc = {
          email: email,
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

        console.log('📄 Email link user document to create:', userDoc)

        try {
          await setDoc(userDocRef, userDoc)
          console.log('✅ New email link user document created in Firestore for:', result.user.uid)
          console.log('📧 This should trigger the welcome email function')
        } catch (error) {
          console.error('❌ Failed to create email link user document:', error)
          throw error
        }
      } else {
        console.log('👤 Existing user signed in:', result.user.uid)
      }
      
    } catch (error: any) {
      console.error('❌ Email link sign-in failed:', error)
      
      if (error.code === 'auth/invalid-action-code') {
        throw new Error('This sign-in link is invalid or has expired. Please request a new one.')
      } else if (error.code === 'auth/expired-action-code') {
        throw new Error('This sign-in link has expired. Please request a new one.')
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
        // Fetch initial user data from Firestore
        const userData = await fetchUserData(firebaseUser.uid)
        setUser(userData)

        // Ensure provider avatars are copied into our own Storage path once,
        // so sidebar/profile can use a durable URL we control.
        const mirroredAvatarUrl = await mirrorAuthAvatarToStorage(firebaseUser, userData)

        // Keep Firestore user doc in sync with Auth profile (email/photo).
        // This helps after secure email changes (verify-before-update) complete.
        try {
          const updates: Record<string, any> = {}
          const effectivePhotoUrl = mirroredAvatarUrl || firebaseUser.photoURL
          if (firebaseUser.email && userData?.email !== firebaseUser.email) updates.email = firebaseUser.email
          if (effectivePhotoUrl && (userData as any)?.profileImageUrl !== effectivePhotoUrl) {
            updates.profileImageUrl = effectivePhotoUrl
          }
          if (Object.keys(updates).length > 0) {
            await setDoc(doc(db, 'users', firebaseUser.uid), { ...updates, updatedAt: serverTimestamp() }, { merge: true })
          }
        } catch (e) {
          console.warn('Failed to sync user profile fields to Firestore:', e)
        }
        
        // Set up real-time listener for user document changes
        setupUserListener(firebaseUser.uid)
      } else {
        setUser(null)
        cleanupUserListener()
      }
      
      setLoading(false)
      if (initializing) {
        setInitializing(false)
      }
    })

    return () => {
      unsubscribe()
      cleanupUserListener()
    }
  }, [initializing])

  const value = {
    currentUser,
    user,
    loading: loading || initializing,
    signup,
    login,
    loginWithGoogle,
    sendEmailLink,
    completeEmailLinkSignIn,
    isEmailLinkSignIn,
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