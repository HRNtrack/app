// HRNtrack — configuration Firebase partagée par toutes les pages.
// Cette config est publique par nature : la sécurité repose sur les règles Firestore.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

export const firebaseConfig = {
    apiKey: "AIzaSyB1vHxCeB4IfNWpTibp64WgNP30KlXMaAc",
    authDomain: "hrntrack-1cfe3.firebaseapp.com",
    projectId: "hrntrack-1cfe3",
    storageBucket: "hrntrack-1cfe3.firebasestorage.app",
    messagingSenderId: "1059019333826",
    appId: "1:1059019333826:web:fa184b796b847cc0f2db5b"
};

export const app = initializeApp(firebaseConfig);
