// src/firebase/clientApp.ts
// This is a 'use client' file because it uses browser-specific Firebase SDK
'use client';

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBk7r0_DFE8wpR2qK2Cm-0phTy31_396_U",
  authDomain: "koblich-chronicles.firebaseapp.com",
  projectId: "koblich-chronicles",
  storageBucket: "koblich-chronicles.firebasestorage.app",
  messagingSenderId: "529550745014",
  appId: "1:529550745014:web:f7bd6d87990272f4653517",
  measurementId: "G-75338WVJ8X"
};

// Initialize Firebase
// Check if Firebase app is already initialized to prevent re-initialization in Next.js dev mode
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Analytics and get a reference to the service
let analytics: Analytics | null = null; // <-- Explicitly type analytics
if (typeof window !== 'undefined') { // Only initialize analytics in the browser
  isSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
      console.debug('[Firebase] Analytics initialized.');
    } else {
      console.warn('[Firebase] Analytics not supported in this environment.');
    }
  });
}

export { analytics };