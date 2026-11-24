import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./config";

/**
 * Upload a document or export output to Firebase Cloud Storage
 */
export async function uploadUserDocument(
  uid: string,
  fileOrBlob: File | Blob,
  fileName: string,
  folder: "uploads" | "exports" = "exports"
): Promise<{ downloadUrl: string; storagePath: string } | null> {
  if (!storage || !uid) return null;
  try {
    const timestamp = Date.now();
    const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `users/${uid}/${folder}/${timestamp}_${cleanName}`;
    const fileRef = ref(storage, storagePath);

    await uploadBytes(fileRef, fileOrBlob);
    const downloadUrl = await getDownloadURL(fileRef);

    return { downloadUrl, storagePath };
  } catch (err) {
    console.warn("Failed to upload file to Firebase Storage:", err);
    return null;
  }
}

/**
 * Delete a user file from Firebase Cloud Storage
 */
export async function deleteUserDocument(storagePath: string): Promise<boolean> {
  if (!storage || !storagePath) return false;
  try {
    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);
    return true;
  } catch (err) {
    console.warn("Failed to delete file from Firebase Storage:", err);
    return false;
  }
}
