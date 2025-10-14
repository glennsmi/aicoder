// Firebase configuration for aicoder.guru
// Firebase Console: https://console.firebase.google.com/project/aicoder-guru/settings/general
export const firebaseConfig = {
  apiKey: "AIzaSyCk6kXTYXXn2t3pvV2dxIPC4HQrJ4Uq-IY",
  authDomain: "aicoder-guru.firebaseapp.com",
  projectId: "aicoder-guru",
  storageBucket: "aicoder-guru.firebasestorage.app",
  messagingSenderId: "68953395443",
  appId: "1:68953395443:web:289570a7f26ea54db96786",
  measurementId: "G-8CVEM8VP7S"
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