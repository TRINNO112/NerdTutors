// firebase-config.js

// --- Firebase core modules ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// --- Exported config object ---
const firebaseConfig = {
    apiKey: "AIzaSyAOHaoLEZjT8V5rkuDrOsdny1s09OKMelc",
    authDomain: "miscellaneous-adventure.firebaseapp.com",
    projectId: "miscellaneous-adventure",
    storageBucket: "miscellaneous-adventure.firebasestorage.app",
    messagingSenderId: "974562975403",
    appId: "1:974562975403:web:8dc24c1b865680cd4e61ee",
    measurementId: "G-08GC6BKWLJ"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// ADMIN EMAILS - Add your admin emails here
export const ADMIN_EMAILS = [
  "kaushtubh457@gmail.com",
  "jatinthacker000@gmail.com",
  // Add more admin emails as needed
];

// Helper function to check if user is admin
export const isAdmin = (email) => {
  return ADMIN_EMAILS.includes(email?.toLowerCase());
};

googleProvider.setCustomParameters({ prompt: "select_account" });

console.log("✅ Firebase initialized");
