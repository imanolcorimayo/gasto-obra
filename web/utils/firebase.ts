import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import {
  getAuth,
  type Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth'

interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

export const getFirebaseConfig = (): FirebaseConfig => {
  const config = useRuntimeConfig()

  return {
    apiKey: config.public.firebaseApiKey as string,
    authDomain: config.public.firebaseAuthDomain as string,
    projectId: config.public.firebaseProjectId as string,
    storageBucket: config.public.firebaseStorageBucket as string,
    messagingSenderId: config.public.firebaseMessagingSenderId as string,
    appId: config.public.firebaseAppId as string,
  }
}

let firebaseApp: FirebaseApp | null = null
let firestore: Firestore | null = null
let auth: Auth | null = null

export const initializeFirebase = (): FirebaseApp => {
  if (firebaseApp) {
    return firebaseApp
  }

  const config = getFirebaseConfig()
  firebaseApp = initializeApp(config)

  return firebaseApp
}

export const getFirestoreInstance = (): Firestore => {
  if (firestore) {
    return firestore
  }

  const app = initializeFirebase()
  firestore = getFirestore(app)

  return firestore
}

export const getAuthInstance = (): Auth => {
  if (auth) {
    return auth
  }

  const app = initializeFirebase()
  auth = getAuth(app)

  if (typeof window !== 'undefined') {
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.warn('Failed to set auth persistence:', error)
    })
  }

  return auth
}

export const getGoogleProvider = (): GoogleAuthProvider => {
  const provider = new GoogleAuthProvider()
  provider.addScope('email')
  provider.addScope('profile')
  return provider
}

export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    const auth = getAuthInstance()
    const provider = getGoogleProvider()
    const result = await signInWithPopup(auth, provider)
    return result.user
  } catch (error) {
    console.error('Error signing in with Google:', error)
    throw error
  }
}

export const signOutUser = async (): Promise<void> => {
  try {
    const auth = getAuthInstance()
    await signOut(auth)
  } catch (error) {
    console.error('Error signing out:', error)
    throw error
  }
}

export const getCurrentUser = (): User | null => {
  const auth = getAuthInstance()
  return auth.currentUser
}

export const getCurrentUserAsync = (): Promise<User | null> => {
  return new Promise((resolve) => {
    const auth = getAuthInstance()

    if (auth.currentUser) {
      resolve(auth.currentUser)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })
}

export const onAuthStateChange = (callback: (user: User | null) => void): (() => void) => {
  const auth = getAuthInstance()
  return onAuthStateChanged(auth, callback)
}

export const isFirebaseConfigured = (): boolean => {
  try {
    const config = getFirebaseConfig()
    return !!(
      config.apiKey &&
      config.authDomain &&
      config.projectId
    )
  } catch {
    return false
  }
}
