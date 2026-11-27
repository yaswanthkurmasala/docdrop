/**
 * In-Memory Document Chaining Store
 * Enables seamless 1-click pipeline jumps between PDF instruments
 * with zero re-uploading and 100% volatile memory privacy.
 */

let inMemoryChainedFile: File | null = null;

export function setChainedDocument(file: File): void {
  inMemoryChainedFile = file;
}

export function getChainedDocument(): File | null {
  const file = inMemoryChainedFile;
  inMemoryChainedFile = null;
  return file;
}

export function peekChainedDocument(): File | null {
  return inMemoryChainedFile;
}
