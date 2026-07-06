// firebase-config.js

// --- Firebase core modules ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// --- Exported config object ---
const firebaseConfig = {
  apiKey: "AIzaSyD7J_N9AH7v9sOWsoA4D0ihVMNvjsLKneA",
  authDomain: "nerd-tutors-001.firebaseapp.com",
  projectId: "nerd-tutors-001",
  storageBucket: "nerd-tutors-001.firebasestorage.app",
  messagingSenderId: "975383880672",
  appId: "1:975383880672:web:66fcfaed92c903a6da8185",
  measurementId: "G-X8YMPFSPLW"
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
  "pathak.amitkumar@hrjohnsonindia.com",
];

// Helper function to check if user is admin
export const isAdmin = (email) => {
  return ADMIN_EMAILS.includes(email?.toLowerCase().trim());
};

googleProvider.setCustomParameters({ prompt: "select_account" });

console.log("✅ Firebase initialized");
