import { initializeApp, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'
import { getFirestore, Firestore } from 'firebase/firestore'
import { firebaseConfig } from './firebase'

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig)

// Initialize Firebase services
export const auth: Auth = getAuth(app)
export const db: Firestore = getFirestore(app)

// Export the app as default
export default app 