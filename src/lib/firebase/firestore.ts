import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db } from "./config";

export interface ConversionRecord {
  id?: string;
  toolId: string;
  toolName: string;
  fileName: string;
  outputFileName: string;
  fileSizeBytes?: number;
  timestamp: number;
  status: "success" | "failed";
  meta?: string;
  downloadUrl?: string;
  tokenCount?: number;
}

export interface SavedDocument {
  id?: string;
  title: string;
  content: string;
  format: "markdown" | "text";
  createdAt: number;
  updatedAt: number;
  sourceFileName?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isPro: boolean;
  conversionsCount: number;
  totalTokensUsed: number;
  createdAt: number;
  lastActiveAt: number;
}

/**
 * Initialize or update user profile document in Firestore
 */
export async function syncUserProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  if (!db || !uid) return;
  try {
    const userRef = doc(db, "users", uid);
    const existing = await getDoc(userRef);

    if (!existing.exists()) {
      await setDoc(userRef, {
        uid,
        email: data.email || null,
        displayName: data.displayName || "User",
        photoURL: data.photoURL || null,
        isPro: false,
        conversionsCount: 0,
        totalTokensUsed: 0,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      });
    } else {
      await updateDoc(userRef, {
        lastActiveAt: Date.now(),
        ...(data.displayName ? { displayName: data.displayName } : {}),
        ...(data.photoURL ? { photoURL: data.photoURL } : {}),
      });
    }
  } catch (err) {
    console.warn("Failed to sync user profile to Firestore:", err);
  }
}

/**
 * Log a document processing or conversion event
 */
export async function logConversionRecord(
  uid: string,
  record: Omit<ConversionRecord, "id">
): Promise<string | null> {
  if (!db || !uid) return null;
  try {
    const historyCol = collection(db, "users", uid, "history");
    const docRef = await addDoc(historyCol, {
      ...record,
      createdAt: serverTimestamp(),
    });

    // Increment user conversion tally
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      conversionsCount: increment(1),
      totalTokensUsed: increment(record.tokenCount || 0),
      lastActiveAt: Date.now(),
    }).catch(() => {});

    return docRef.id;
  } catch (err) {
    console.warn("Failed to log conversion record to Firestore:", err);
    return null;
  }
}

/**
 * Retrieve user's recent conversion history
 */
export async function getRecentConversions(
  uid: string,
  maxCount: number = 20
): Promise<ConversionRecord[]> {
  if (!db || !uid) return [];
  try {
    const historyCol = collection(db, "users", uid, "history");
    const q = query(historyCol, orderBy("timestamp", "desc"), limit(maxCount));
    const snap = await getDocs(q);

    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ConversionRecord, "id">),
    }));
  } catch (err) {
    console.warn("Failed to fetch conversions from Firestore:", err);
    return [];
  }
}

/**
 * Save an extracted or edited Markdown document to Firestore workspace
 */
export async function saveWorkspaceDocument(
  uid: string,
  docData: Omit<SavedDocument, "id">
): Promise<string | null> {
  if (!db || !uid) return null;
  try {
    const docsCol = collection(db, "users", uid, "documents");
    const ref = await addDoc(docsCol, {
      ...docData,
      createdAt: docData.createdAt || Date.now(),
      updatedAt: Date.now(),
    });
    return ref.id;
  } catch (err) {
    console.warn("Failed to save document to Firestore:", err);
    return null;
  }
}

/**
 * Fetch all saved workspace documents
 */
export async function getSavedWorkspaceDocuments(
  uid: string
): Promise<SavedDocument[]> {
  if (!db || !uid) return [];
  try {
    const docsCol = collection(db, "users", uid, "documents");
    const q = query(docsCol, orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);

    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<SavedDocument, "id">),
    }));
  } catch (err) {
    console.warn("Failed to fetch saved documents:", err);
    return [];
  }
}

/**
 * Delete a saved workspace document
 */
export async function deleteWorkspaceDocument(
  uid: string,
  docId: string
): Promise<boolean> {
  if (!db || !uid || !docId) return false;
  try {
    const docRef = doc(db, "users", uid, "documents", docId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn("Failed to delete workspace document:", err);
    return false;
  }
}
