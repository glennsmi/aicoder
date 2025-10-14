import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { auth, db } from '../config/firebaseApp'

interface AuthContextType {
  currentUser: User | null
  loading: boolean
  signup: (email: string, password: string, name?: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
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
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(true)

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

      // Create user document in Firestore with default preferences (this will trigger the welcome email function)
      console.log('3️⃣ Creating Firestore user document...')
      const userDoc = {
        email: userCredential.user.email,
        displayName: name || userCredential.user.displayName || '',
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
        console.error('❌ Error details:', error)
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
    
    // Add custom parameters to handle popup issues
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
      
      // Only create document if it doesn't exist (this will trigger welcome email for new users)
      if (!userDocSnap.exists()) {
        console.log('3️⃣ User document does not exist, creating new one...')
        const userDoc = {
          email: result.user.email,
          displayName: result.user.displayName || '',
          preferences: {
            primaryCurrency: 'GBP', // Default currency
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
          console.error('❌ Error details:', error)
          throw error
        }
      } else {
        console.log('👤 Existing user signed in:', result.user.uid)
      }
      
    } catch (error: any) {
      console.error('❌ Google sign-in failed:', error)
      // Handle popup blocked or other errors
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      setLoading(false)
      if (initializing) {
        setInitializing(false)
      }
    })

    return unsubscribe
  }, [initializing])

  const value = {
    currentUser,
    loading: loading || initializing,
    signup,
    login,
    loginWithGoogle,
    logout
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