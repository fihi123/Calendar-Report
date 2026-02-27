import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBRGsks3V3z5fPNlsfjeGTuULeu2HM45RE",
  authDomain: "pe-report-46be5.firebaseapp.com",
  projectId: "pe-report-46be5",
  storageBucket: "pe-report-46be5.firebasestorage.app",
  messagingSenderId: "899402792312",
  appId: "1:899402792312:web:3d55c4563ae6f41be0dc8d",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
