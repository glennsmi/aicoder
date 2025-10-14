// Firebase configuration
// Replace these with your actual Firebase config values from the Firebase Console
// Go to: https://console.firebase.google.com/project/cursorcosts/settings/general
export const firebaseConfig = {
  apiKey: "AIzaSyDcSjsGe0rebWJj73MyJSA_ysMOps0IV1g",
  authDomain: "cursorcosts.firebaseapp.com",
  projectId: "cursorcosts",
  storageBucket: "cursorcosts.firebasestorage.app",
  messagingSenderId: "547570015509",
  appId: "1:547570015509:web:1069528bae80d5e7bedd1c",
  measurementId: "G-0KQE66REG8"
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