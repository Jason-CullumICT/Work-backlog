// Verifies: FR-WF-001 — ID generation utilities
import { v4 as uuidv4 } from 'uuid';

let docIdCounter = 0;

/** Generate a new UUID */
export function generateId(): string {
  return uuidv4();
}

/** Generate an auto-incrementing WI-XXX document ID */
export function generateDocId(): string {
  docIdCounter += 1;
  return `WI-${String(docIdCounter).padStart(3, '0')}`;
}

/** Reset the counter (used when loading persisted data) */
export function setDocIdCounter(value: number): void {
  docIdCounter = value;
}

/** Get current counter value */
export function getDocIdCounter(): number {
  return docIdCounter;
}
