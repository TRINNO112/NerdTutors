// Firebase configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc,
    serverTimestamp,
    query,
    orderBy
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { 
    getAuth, 
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

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
const db = getFirestore(app);
const auth = getAuth(app);

// Export functions and instances
export { 
    db, 
    auth, 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc,
    serverTimestamp,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    query,
    orderBy
};