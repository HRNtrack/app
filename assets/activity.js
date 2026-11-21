// HRNtrack — enregistre la date d'inscription et la dernière visite de l'utilisateur connecté,
// dans users/{uid}.meta, pour que la page admin ait de vraies statistiques d'activité.
// Une seule écriture par jour et par appareil, pour limiter les écritures Firestore.
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { syncPublicProfile } from './public-profile.js';

export async function recordVisit(db, user) {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = 'HRN_LAST_SEEN_' + user.uid;
    try { if (localStorage.getItem(key) === today) return; } catch (e) { /* stockage indisponible */ }

    const meta = { lastSeen: new Date().toISOString() };
    // Date de création du compte Firebase : connue pour tous les comptes, même anciens
    const created = user.metadata && user.metadata.creationTime ? new Date(user.metadata.creationTime) : null;
    if (created && !isNaN(created)) meta.createdAt = created.toISOString();

    try {
        await setDoc(doc(db, 'users', user.uid), { meta }, { merge: true });
        try { localStorage.setItem(key, today); } catch (e) { /* stockage indisponible */ }
        // Une fois par jour : la fiche publique (page de partage) suit la collection et le profil
        syncPublicProfile(db, user.uid);
    } catch (e) {
        // Ex. règles Firestore qui refusent le champ : sans conséquence pour l'utilisateur
        console.warn('Visite non enregistrée :', e.code || e.message);
    }
}
