import type { PropsWithChildren } from 'react'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'

import { getFirebaseApp } from '../config/firebase'
import { clearSecureToken, loadSecureToken, saveSecureToken } from '../security/secureStorage'

export interface AuthenticatedUser {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
}

interface AuthContextValue {
  user: AuthenticatedUser | null
  isLoading: boolean
  driveAccessToken: string | null
  ensureDriveAccess: () => Promise<string | null>
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const provider = new GoogleAuthProvider()
provider.setCustomParameters({ app_name: 'PonyTory' })
provider.addScope('https://www.googleapis.com/auth/drive.file')
provider.setCustomParameters({
  prompt: 'select_account consent',
})

const mapFirebaseUser = (user: User): AuthenticatedUser => ({
  id: user.uid,
  name: user.displayName ?? 'Unnamed User',
  email: user.email ?? 'Unknown email',
  avatarUrl: user.photoURL,
})

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [driveAccessToken, setDriveAccessToken] = useState<string | null>(null)

  useEffect(() => {
    const auth = getAuth(getFirebaseApp())
    setPersistence(auth, browserLocalPersistence).catch((error) =>
      console.warn('Failed to set Firebase persistence', error),
    )

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(mapFirebaseUser(firebaseUser))
        const token = await loadSecureToken('driveToken')
        setDriveAccessToken(token)
      } else {
        setUser(null)
        setDriveAccessToken(null)
        await clearSecureToken('driveToken')
        await clearSecureToken('driveFolderId')
      }
      setIsLoading(false)
    })

    return unsubscribe
  }, [])

  const ensureDriveAccess = async () => {
    if (driveAccessToken) {
      return driveAccessToken
    }

    const auth = getAuth(getFirebaseApp())
    if (!auth.currentUser) {
      throw new Error('User not authenticated')
    }

    const result = await signInWithPopup(auth, provider)
    const credential = GoogleAuthProvider.credentialFromResult(result)
    const freshToken = credential?.accessToken ?? null
    if (freshToken) {
      await saveSecureToken('driveToken', freshToken)
      setDriveAccessToken(freshToken)
    }
    return freshToken
  }

  const signIn = async () => {
    const auth = getAuth(getFirebaseApp())
    const result = await signInWithPopup(auth, provider)
    const credential = GoogleAuthProvider.credentialFromResult(result)
    const freshToken = credential?.accessToken ?? null
    if (freshToken) {
      await saveSecureToken('driveToken', freshToken)
      await clearSecureToken('driveFolderId')
      setDriveAccessToken(freshToken)
    }
  }

  const signOut = async () => {
    const auth = getAuth(getFirebaseApp())
    await firebaseSignOut(auth)
    await clearSecureToken('driveToken')
    await clearSecureToken('driveFolderId')
    setDriveAccessToken(null)
    setUser(null)
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      driveAccessToken,
      ensureDriveAccess,
      signIn,
      signOut,
    }),
    [user, isLoading, driveAccessToken],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

