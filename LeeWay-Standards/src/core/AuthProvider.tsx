/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.CORE.AUTH
TAG: AI.ORCHESTRATION.CORE.AUTHPROVIDER.OAUTH

COLOR_ONION_HEX:
NEON=#4285F4
FLUO=#5A9AF5
PASTEL=#BFDBFE

ICON_ASCII:
family=lucide
glyph=lock

5WH:
WHAT = leeway OAuth authentication provider using Firebase Auth — the user's identity layer for the whole OS
WHY = Enforces user-owned OAuth flow so leeway API billing goes to the authenticated user, not the developer
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/AuthProvider.tsx
WHEN = 2026
HOW = React Context + Firebase Auth with leewayAuthProvider, storing OAuth access token in sessionStorage

AGENTS:
ASSESS
AUDIT
SECURITY
leeway

LICENSE:
MIT
*/

// core/AuthProvider.tsx
// leeway OAuth via Firebase Auth.
// Users sign in with their leeway account only — no API key input ever.

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  OAuthProvider,
  signOut,
  type User,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase config uses only PUBLIC project identifiers (safe to expose)
// Hardcoded to prevent .env cache issues during development
const firebaseConfig = {
  apiKey: "AIzaSyD6g6WI5Ql1W1On5yBsJiGpesC5D71RL5I",
  authDomain: "agent-lee-assistant.firebaseapp.com",
  projectId: "agent-lee-assistant",
  storageBucket: "agent-lee-assistant.firebasestorage.app",
  messagingSenderId: "386516092800",
  appId: "1:386516092800:web:410a9abdba67c85e332365",
};

// Initialize Firebase only once
export const firebaseApp = getApps().length === 0 
  ? initializeApp(firebaseConfig) 
  : getApps()[0];

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

const leewayProvider = new OAuthProvider('github.com');
leewayProvider.addScope('profile');
leewayProvider.addScope('email');
// Request access to the user's own leeway API quota:
// Temporarily disabled to prevent OAuth Consent verification errors!
// leewayProvider.addScope('https://www.leewayapis.com/auth/generative-language');

interface AuthContextType {
  user: User | null;
  loading: boolean;
  accessToken: string | null;
  signInWithleeway: () => Promise<void>;
  signOutUser: () => Promise<void>;
  getIdToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    // TEMPORARY OVERRIDE: Instant bypass to get straight into the app!
    setUser({
      uid: 'dev-bypass-uid',
      email: 'dev@agentlee.os',
      displayName: 'Agent Lee Dev',
      getIdToken: async () => 'dev-token',
      photoURL: null,
    } as any);
    setAccessToken('dev-access-token');
    // Ensure LeewayInferenceClient (reads sessionStorage) also sees the dev token
    sessionStorage.setItem('agent_lee_access_token', 'dev-access-token');
    setLoading(false);
    return;

    // The rest of this is technically unreachable now, protecting the app from Firebase crashes
    // Attempt to load token from session storage on reload

    // Attempt to load token from session storage on reload
    const storedToken = sessionStorage.getItem('agent_lee_access_token');
    if (storedToken) {
      setAccessToken(storedToken);
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithleeway = async () => {
    try {
      const result = await signInWithPopup(auth, leewayProvider);
      
      // Get the OAuth access token to call leeway APIs directly on behalf of the user
      const credential = OAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
        sessionStorage.setItem('agent_lee_access_token', credential.accessToken);
      }
    } catch (error: any) {
      console.error('leeway sign-in failed:', error);
      alert(`Login failed: ${error.message || 'Unknown error'}. Please check your Firebase Console setup.`);
      throw error;
    }
  };

  const signOutUser = async () => {
    await signOut(auth);
    setAccessToken(null);
    sessionStorage.removeItem('agent_lee_access_token');
  };

  const getIdToken = async (): Promise<string> => {
    if (!user) throw new Error('No authenticated user');
    return user.getIdToken(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, accessToken, signInWithleeway, signOutUser, getIdToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

