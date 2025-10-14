// Firebase configuration from environment variables
// Copy frontend/.env.example to frontend/.env.local and fill in your Firebase credentials
// Get these from: https://console.firebase.google.com/project/YOUR_PROJECT/settings/general
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Firebase emulator configuration for local development
export const useEmulator = process.env.NODE_ENV === 'development'

export const emulatorConfig = {
  auth: {
    host: 'localhost',
    port: 9099
  },
  firestore: {
    host: 'localhost',
    port: 8080
  },
  functions: {
    host: 'localhost',
    port: 5001
  }
} 