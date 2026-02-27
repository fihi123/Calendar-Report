import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Real-time sync hook for a single Firestore document.
 * - Subscribes via onSnapshot for live updates
 * - Seeds Firestore with local data if the document doesn't exist yet
 * - Falls back to localStorage if Firestore is unavailable
 */
export function useFirestoreSync<T>(
  docPath: string,
  field: string,
  fallback: T,
  localStorageKey?: string,
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [data, setData] = useState<T>(() => {
    if (localStorageKey) {
      try {
        const stored = localStorage.getItem(localStorageKey);
        if (stored) return JSON.parse(stored);
      } catch { /* ignore */ }
    }
    return fallback;
  });
  const [loading, setLoading] = useState(true);
  const dataRef = useRef(data);
  dataRef.current = data;

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
        } else {
          // Document doesn't exist in Firestore yet — seed it with local data
          setDoc(docRef, { [field]: dataRef.current }, { merge: true }).catch((err) => {
            console.warn('Firestore seed failed:', err);
          });
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
        const docRef = doc(db, 'teamsync', docPath);
        setDoc(docRef, { [field]: next }, { merge: true }).catch((err) => {
          console.warn('Firestore write failed:', err);
        });
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
