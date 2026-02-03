import { initializeApp, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'
import { getFirestore, Firestore } from 'firebase/firestore'
import { getFunctions, Functions } from 'firebase/functions'
import { firebaseConfig } from './firebase'

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig)

// Initialize Firebase services
export const auth: Auth = getAuth(app)
export const db: Firestore = getFirestore(app)

// Initialize Firebase Functions with europe-west2 region
export const functions: Functions = getFunctions(app, 'europe-west2')

// Connect to emulator if in development (optional)
// if (import.meta.env.DEV) {
//   connectFunctionsEmulator(functions, 'localhost', 5001)
// }

// Export the app as default
export default app 