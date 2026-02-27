import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Real-time sync hook for a single Firestore document.
 * - Subscribes via onSnapshot for live updates
 * - Provides a setter that writes to Firestore (which triggers onSnapshot back)
 * - Falls back to localStorage if Firestore is unavailable
 */
export function useFirestoreSync<T>(
  docPath: string,
  field: string,
  fallback: T,
  localStorageKey?: string,
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [data, setData] = useState<T>(() => {
    // Load from localStorage initially for fast first paint
    if (localStorageKey) {
      try {
        const stored = localStorage.getItem(localStorageKey);
        if (stored) return JSON.parse(stored);
      } catch { /* ignore */ }
    }
    return fallback;
  });
  const [loading, setLoading] = useState(true);

  // Subscribe to Firestore changes
  useEffect(() => {
    const docRef = doc(db, 'teamsync', docPath);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const value = snapshot.data()[field] as T;
          if (value !== undefined) {
            setData(value);
            if (localStorageKey) {
              localStorage.setItem(localStorageKey, JSON.stringify(value));
            }
          }
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Firestore sync error, using local data:', error);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [docPath, field, localStorageKey]);

  // Write to Firestore
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setData((prev) => {
        const next = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
        // Write to Firestore (onSnapshot will propagate to other clients)
        const docRef = doc(db, 'teamsync', docPath);
        setDoc(docRef, { [field]: next }, { merge: true }).catch((err) => {
          console.warn('Firestore write failed:', err);
        });
        // Also persist locally as fallback
        if (localStorageKey) {
          localStorage.setItem(localStorageKey, JSON.stringify(next));
        }
        return next;
      });
    },
    [docPath, field, localStorageKey],
  );

  return [data, setValue, loading];
}
