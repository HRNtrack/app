// HRNtrack — base Firestore partagée, avec cache local (IndexedDB).
// Les documents déjà lus restent disponibles hors ligne (collection, cotes…) et les pages s'affichent plus vite.
// Les modifications faites hors ligne sont envoyées automatiquement au retour du réseau.
import { app } from './firebase.js';
import {
    initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let instance;
try {
    instance = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
} catch (e) {
    // Déjà initialisée, ou IndexedDB indisponible (navigation privée…) : base classique, sans cache
    console.warn('Cache Firestore indisponible :', e.message);
    instance = getFirestore(app);
}
export const db = instance;
