// firebase-init.js - FIX: Use Firebase v8 global functions (from CDN scripts)

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDgzf434g30N1GoMAes3Cy-u1BoD4OUVS0",
    authDomain: "gym-management-system-53340.firebaseapp.com",
    projectId: "gym-management-system-53340",
    storageBucket: "gym-management-system-53340.firebasestorage.app",
    messagingSenderId: "970523135234",
    appId: "1:970523135234:web:2d7c30652adb853822461b",
    measurementId: "G-R8V8KCLZL3"
};

// Initialize Firebase App
const app = firebase.initializeApp(firebaseConfig);

// Initialize Auth and Firestore and make them available globally
// script.js expects these variables to be defined globally.
const auth = app.auth();
const db = app.firestore();

console.log("Firebase App Initialized and Auth/DB globals defined!");