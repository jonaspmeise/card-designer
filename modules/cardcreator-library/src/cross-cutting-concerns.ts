/**
 * Generate a UUID v4 string.
 * Simple implementation that works in both Node.js and browser environments.
 */
export type ID = string;
export type Identifiable<T> = T & { id: ID };

export const generateId = (): ID => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    },
  );
};

/**
 * Checks, whether two (json-compatible) objects are identical.
 * This only works for simple objects and if this method is called frequently, helper methods
 * with hashing should be used instead.
 * @param a The first object.
 * @param b The second object.
 * @returns whether these two objects are identical (pretty much).
 */
export const objectsIdentical = (
  a: unknown,
  b: unknown,
): boolean => {
  return JSON.stringify(a) == JSON.stringify(b);
};
