// src/firebase/clientApp.ts
'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";

// Firebase config — these keys are safe to expose client-side (they identify
// the project, they don't grant privileged access). Security is enforced via
// Firebase Security Rules and backend validation.
const firebaseConfig = {
  apiKey: "AIzaSyBk7r0_DFE8wpR2qK2Cm-0phTy31_396_U",
  authDomain: "koblich-chronicles.firebaseapp.com",
  projectId: "koblich-chronicles",
  storageBucket: "koblich-chronicles.firebasestorage.app",
  messagingSenderId: "529550745014",
  appId: "1:529550745014:web:f7bd6d87990272f4653517",
  measurementId: "G-75338WVJ8X",
};

// Initialize Firebase App (re-initialization guard for Next.js HMR)
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Analytics is browser-only and async — callers must await this promise.
// Resolves to the Analytics instance when supported, or null otherwise.
const analyticsPromise: Promise<Analytics | null> =
  typeof window !== "undefined"
    ? isSupported()
        .then((supported) => {
          if (supported) {
            return getAnalytics(app);
          }
          return null;
        })
        .catch(() => null)
    : Promise.resolve(null);

/**
 * Returns the Firebase Analytics instance once it's ready.
 * Safe to call from any client component — returns null on the server
 * or in environments where analytics isn't supported.
 */
export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  return analyticsPromise;
}

export { app };
