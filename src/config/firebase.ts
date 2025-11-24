import { initializeApp, type FirebaseApp, getApps } from 'firebase/app'

const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
] as const

const missing = requiredEnvVars.filter((key) => !import.meta.env[key])

if (missing.length > 0) {
  console.warn(
    `Firebase configuration missing required keys: ${missing.join(', ')}. Populate them in your environment variables.`,
  )
}

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && 
  (window.navigator.userAgent.includes('Electron') || 
   window.navigator.userAgent.includes('electron'))

// Log current origin for debugging (especially important for Electron)
if (typeof window !== 'undefined') {
  console.log('Current origin:', window.location.origin)
  console.log('Is Electron:', isElectron)
  if (isElectron) {
    console.log('For Firebase Auth to work, make sure "localhost" is added to Firebase authorized domains')
  }
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
}

let app: FirebaseApp | undefined

export const getFirebaseApp = () => {
  if (!app) {
    app = getApps()[0] ?? initializeApp(firebaseConfig)
  }
  return app
}

