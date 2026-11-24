import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

let app: FirebaseApp | undefined = undefined;
let auth: Auth | undefined = undefined;
let db: Firestore | undefined = undefined;
let storage: FirebaseStorage | undefined = undefined;

const hasValidApiKey =
  typeof firebaseConfig.apiKey === "string" &&
  firebaseConfig.apiKey.trim().length > 10 &&
  !firebaseConfig.apiKey.includes("your-");

if (hasValidApiKey) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    try {
      auth = getAuth(app);
    } catch (e) {
      console.warn("Firebase Auth init warning:", e);
    }

    const customDbId = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID;
    if (customDbId && customDbId !== "(default)") {
      try {
        db = getFirestore(app, customDbId);
      } catch {
        db = getFirestore(app);
      }
    } else {
      try {
        db = getFirestore(app);
      } catch {
        // ignore
      }
    }

    try {
      storage = getStorage(app);
    } catch {
      // ignore
    }
  } catch (err) {
    console.warn("Firebase init skipped:", err);
  }
}

export { app, auth, db, storage };
