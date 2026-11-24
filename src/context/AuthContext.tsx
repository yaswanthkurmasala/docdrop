"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { syncUserProfile } from "@/lib/firebase/firestore";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  plan: "free" | "pro";
  planName?: string;
  conversionsCount?: number;
  totalTokensUsed?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loginWithSocial: (provider: "google" | "github") => Promise<void>;
  loginWithEmail: (email: string, password?: string) => Promise<void>;
  signupWithEmail: (name: string, email: string, password?: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => void;
  setProStatus: (isPro: boolean, planName?: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  loginWithSocial: async () => {},
  loginWithEmail: async () => {},
  signupWithEmail: async () => {},
  loginAsGuest: async () => {},
  logout: () => {},
  setProStatus: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore cached session first for instant UI response
  useEffect(() => {
    try {
      const stored = localStorage.getItem("docdrop_user") || localStorage.getItem("doctomd_user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // Subscribe to real Firebase Auth state
  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const baseName =
          fbUser.displayName ||
          (fbUser.email ? fbUser.email.split("@")[0].replace(/[._]/g, " ") : "DocDrop Member");
        const formattedName = baseName.charAt(0).toUpperCase() + baseName.slice(1);

        const mappedUser: User = {
          id: fbUser.uid,
          name: formattedName,
          email: fbUser.email || "guest@docdrop.internal",
          avatarUrl: fbUser.photoURL || undefined,
          plan: "free",
          planName: "Free Explorer",
        };

        setUser(mappedUser);
        try {
          localStorage.setItem("docdrop_user", JSON.stringify(mappedUser));
        } catch {}

        // Sync with Firestore in background
        await syncUserProfile(fbUser.uid, {
          email: fbUser.email,
          displayName: formattedName,
          photoURL: fbUser.photoURL,
        });

        // Listen for live Firestore updates (e.g. Pro status, usage stats)
        if (db) {
          try {
            const unsubProfile = onSnapshot(
              doc(db, "users", fbUser.uid),
              (snap) => {
                if (snap.exists()) {
                  const data = snap.data();
                  setUser((prev) => {
                    if (!prev) return prev;
                    const updated: User = {
                      ...prev,
                      plan: data.isPro ? "pro" : "free",
                      planName: data.isPro ? "Pro Pass" : "Free Explorer",
                      conversionsCount: data.conversionsCount || 0,
                      totalTokensUsed: data.totalTokensUsed || 0,
                    };
                    try {
                      localStorage.setItem("docdrop_user", JSON.stringify(updated));
                    } catch {}
                    return updated;
                  });
                }
              },
              (err) => {
                console.warn("Firestore profile snapshot error:", err);
              }
            );
            setIsLoading(false);
            return () => unsubProfile();
          } catch {
            setIsLoading(false);
          }
        }
      } else {
        // User logged out from Firebase
        setUser(null);
        try {
          localStorage.removeItem("docdrop_user");
          localStorage.removeItem("doctomd_user");
        } catch {}
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithSocial = async (provider: "google" | "github") => {
    setIsLoading(true);
    try {
      if (auth) {
        const authProvider =
          provider === "google" ? new GoogleAuthProvider() : new GithubAuthProvider();
        await signInWithPopup(auth, authProvider);
      } else {
        // Fallback local session when Firebase is not configured on production
        const localUser: User = {
          id: `local_${provider}_${Math.random().toString(36).substring(2, 9)}`,
          name: provider === "google" ? "Google Member" : "GitHub Developer",
          email: `${provider}-user@docdrop.internal`,
          plan: "free",
          planName: "Free Explorer",
        };
        setUser(localUser);
        try {
          localStorage.setItem("docdrop_user", JSON.stringify(localUser));
        } catch {}
      }
    } catch (err: any) {
      console.warn("Social sign-in error:", err);
      if (err?.code === "auth/popup-closed-by-user") {
        throw new Error("Sign-in popup was closed before completing.");
      } else if (err?.code === "auth/unauthorized-domain") {
        throw new Error("Domain localhost is now authorized. Please refresh and try again.");
      } else if (err?.code === "auth/operation-not-allowed") {
        throw new Error(
          provider === "github"
            ? "GitHub sign-in is not configured on this Firebase project. Please use Google, Email, or Guest session."
            : "Google sign-in is not enabled in Firebase project settings."
        );
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithEmail = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      if (!password || password.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }
      if (auth) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Fallback local session when Firebase is not configured on production
        const baseName = email.split("@")[0].replace(/[._]/g, " ");
        const formattedName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
        const localUser: User = {
          id: `local_${Math.random().toString(36).substring(2, 9)}`,
          name: formattedName || "DocDrop Member",
          email,
          plan: "free",
          planName: "Free Explorer",
        };
        setUser(localUser);
        try {
          localStorage.setItem("docdrop_user", JSON.stringify(localUser));
        } catch {}
      }
    } catch (err: any) {
      if (
        err?.code === "auth/invalid-credential" ||
        err?.code === "auth/user-not-found" ||
        err?.code === "auth/wrong-password"
      ) {
        throw new Error(
          "Invalid email or password. If you don't have an account yet, switch to the Sign Up tab above."
        );
      } else if (err?.code === "auth/too-many-requests") {
        throw new Error("Access temporarily disabled due to many failed attempts. Try again later or reset password.");
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signupWithEmail = async (name: string, email: string, password?: string) => {
    setIsLoading(true);
    try {
      if (!password || password.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }
      if (auth) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name && cred.user) {
          await updateProfile(cred.user, { displayName: name });
        }
      } else {
        // Fallback local session when Firebase is not configured on production
        const localUser: User = {
          id: `local_${Math.random().toString(36).substring(2, 9)}`,
          name: name || "DocDrop Member",
          email,
          plan: "free",
          planName: "Free Explorer",
        };
        setUser(localUser);
        try {
          localStorage.setItem("docdrop_user", JSON.stringify(localUser));
        } catch {}
      }
    } catch (err: any) {
      if (err?.code === "auth/email-already-in-use") {
        throw new Error("An account with this email already exists. Please switch to the Log In tab.");
      } else if (err?.code === "auth/weak-password") {
        throw new Error("Password is too weak. Please choose at least 6 characters.");
      } else if (err?.code === "auth/invalid-email") {
        throw new Error("Please enter a valid email address.");
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsGuest = async () => {
    setIsLoading(true);
    try {
      if (auth) {
        await signInAnonymously(auth);
      } else {
        const guestUser: User = {
          id: `guest_${Math.random().toString(36).substring(2, 9)}`,
          name: "Guest Explorer",
          email: "guest@docdrop.internal",
          plan: "free",
          planName: "Free Explorer",
        };
        setUser(guestUser);
        try {
          localStorage.setItem("docdrop_user", JSON.stringify(guestUser));
        } catch {}
      }
    } finally {
      setIsLoading(false);
    }
  };

  const setProStatus = async (isPro: boolean, planName?: string) => {
    if (user) {
      const updated: User = {
        ...user,
        plan: isPro ? "pro" : "free",
        planName: planName || (isPro ? "Pro Pass" : "Free Explorer"),
      };
      setUser(updated);
      try {
        localStorage.setItem("docdrop_user", JSON.stringify(updated));
        if (isPro) {
          localStorage.setItem("docdrop_pro_unlocked", "true");
        }
      } catch {}

      // Persist to Firestore if online
      if (db && user.id) {
        try {
          await updateDoc(doc(db, "users", user.id), {
            isPro,
          });
        } catch (e) {
          console.warn("Could not sync Pro status to Firestore:", e);
        }
      }
    }
  };

  const logout = async () => {
    if (auth) {
      try {
        await signOut(auth);
      } catch {}
    }
    setUser(null);
    try {
      localStorage.removeItem("docdrop_user");
      localStorage.removeItem("doctomd_user");
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        loginWithSocial,
        loginWithEmail,
        signupWithEmail,
        loginAsGuest,
        logout,
        setProStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
