'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from '@/lib/firebase-client';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);      // Firebase user
  const [dbUser, setDbUser] = useState(null);   // MongoDB user (with role)
  const [loading, setLoading] = useState(true);

  // Listen to Firebase auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Get DB user with role
        try {
          const token = await firebaseUser.getIdToken();
          const res = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setDbUser(data.user);
          }
        } catch (err) {
          console.error('Failed to verify user:', err);
        }
      } else {
        setUser(null);
        setDbUser(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Auth methods
  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  };

  const signInWithEmail = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  };

  const signUpWithEmail = async (email, password) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setDbUser(null);
  };

  // Helper to get auth header for API calls
  const getAuthHeader = async () => {
    if (!user) return {};
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  };

  // Authenticated fetch helper
  const authFetch = async (url, options = {}) => {
    const headers = await getAuthHeader();
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...options.headers,
      },
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      dbUser,
      loading,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      getAuthHeader,
      authFetch,
      isAdmin: dbUser?.role === 'admin',
      isParent: dbUser?.role === 'parent',
      isSchool: dbUser?.role === 'school',
      isCoach: dbUser?.role === 'coach',
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
