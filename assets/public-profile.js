// HRNtrack — fiche publique d'un collectionneur : public_profiles/{uid}.
// La page de partage ne lit QUE cette fiche. Elle ne contient que ce qui s'affiche :
// pseudo, avatar et, pour chaque figurine possédée ou recherchée, son ID, son statut et sa quantité.
// Les prix, dates d'achat, états, notes et dates de visite restent dans users/{uid} (privé).
import { doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export const PUBLIC_COLLECTION = 'public_profiles';

const OWNED = new Set(['possédé', 'possédée', 'owned']);
const WISH = new Set(['recherché', 'recherche', 'wishlist']);

/** Fonction pure : données privées (users/{uid}) → fiche publique. Sans date, pour pouvoir comparer deux fiches. */
export function toPublicProfile(data) {
    const profile = (data && data.profile) || {};
    const pseudo = typeof profile.pseudo === 'string' ? profile.pseudo.trim().slice(0, 40) : '';
    const avatar = typeof profile.avatar === 'string' && /^https:\/\//i.test(profile.avatar) ? profile.avatar.slice(0, 500) : '';
    const items = [];
    for (const it of (data && Array.isArray(data.collection) ? data.collection : [])) {
        if (!it || it.ID === undefined || it.ID === null) continue;
        const st = String(it.Status || '').toLowerCase();
        const status = OWNED.has(st) ? 'owned' : WISH.has(st) ? 'wish' : null;
        if (!status) continue;
        let qty = Math.floor(Number(it.Quantity ?? it.Qty));
        if (!Number.isFinite(qty) || qty < 1) qty = status === 'owned' ? 1 : 0;
        items.push({ ID: String(it.ID), s: status, q: Math.min(qty, 999) });
    }
    items.sort((a, b) => a.ID.localeCompare(b.ID));
    return { pseudo, avatar, items };
}

/** Vrai si deux fiches publiques ont le même contenu (la date de mise à jour est ignorée). */
export function samePublicProfile(a, b) {
    if (!a || !b) return false;
    const strip = ({ pseudo, avatar, items }) => JSON.stringify({ pseudo: pseudo || '', avatar: avatar || '', items: items || [] });
    return strip(a) === strip(b);
}

export function publicProfileDoc(data) {
    return { ...toPublicProfile(data), updatedAt: new Date().toISOString() };
}

/** Recopie la partie publique de users/{uid} dans public_profiles/{uid}. Ne bloque jamais l'utilisateur. */
export async function syncPublicProfile(db, uid, privateData) {
    if (!uid) return false;
    try {
        let data = privateData;
        if (!data) {
            const snap = await getDoc(doc(db, 'users', uid));
            if (!snap.exists()) return false;
            data = snap.data();
        }
        await setDoc(doc(db, PUBLIC_COLLECTION, uid), publicProfileDoc(data));
        return true;
    } catch (e) {
        console.warn('Fiche publique non mise à jour :', e.code || e.message);
        return false;
    }
}

export async function deletePublicProfile(db, uid) {
    try { await deleteDoc(doc(db, PUBLIC_COLLECTION, uid)); } catch (e) { console.warn('Fiche publique non supprimée :', e.code || e.message); }
}
