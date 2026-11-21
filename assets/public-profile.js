// HRNtrack — fiche publique d'un collectionneur : public_profiles/{uid}.
// La page de partage et la bourse aux échanges ne lisent QUE cette fiche. Elle ne contient que ce qui s'affiche :
// pseudo, avatar et, pour chaque figurine possédée ou recherchée, son ID, son statut et sa quantité ;
// plus, si la personne participe à la bourse aux échanges : trade: true et son contact (facultatif).
// Les prix, dates d'achat, états, notes et dates de visite restent dans users/{uid} (privé).
// Collection privée (profile.isPublic === false) : pas de fiche publique du tout.
import { doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { cleanContacts } from './socials.js';

export const PUBLIC_COLLECTION = 'public_profiles';

const OWNED = new Set(['possédé', 'possédée', 'owned']);
const WISH = new Set(['recherché', 'recherche', 'wishlist']);

/** Vrai si la collection est partagée (par défaut : oui). */
export const isPublicProfile = (data) => !(data && data.profile && data.profile.isPublic === false);

/**
 * Fonction pure : données privées (users/{uid}) → fiche publique, ou null si la collection est privée.
 * Sans date, pour pouvoir comparer deux fiches.
 */
export function toPublicProfile(data) {
    if (!isPublicProfile(data)) return null;
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
    const out = { pseudo, avatar, items };
    // Champs ajoutés seulement pour les participants à la bourse (les autres fiches gardent leur forme d'origine)
    if (profile.trade === true) {
        out.trade = true;
        // Réseaux : { instagram: 'pseudo', discord: '…' } (un champ par réseau dans Mon compte) ; ancien contact texte gardé à défaut
        const contacts = cleanContacts(profile.contacts);
        out.contact = Object.keys(contacts).length ? contacts : (typeof profile.contact === 'string' ? profile.contact.trim().slice(0, 80) : '');
    }
    return out;
}

/** Vrai si deux fiches publiques ont le même contenu (la date de mise à jour est ignorée). null = pas de fiche. */
export function samePublicProfile(a, b) {
    if (!a || !b) return !a && !b;
    const strip = (p) => JSON.stringify({ pseudo: p.pseudo || '', avatar: p.avatar || '', items: p.items || [], trade: p.trade === true, contact: p.trade === true ? (p.contact && typeof p.contact === 'object' ? cleanContacts(p.contact) : (p.contact || '')) : '' });   // objet : clés toujours dans le même ordre (cleanContacts)
    return strip(a) === strip(b);
}

/** Document à écrire, ou null si la collection est privée. */
export function publicProfileDoc(data) {
    const p = toPublicProfile(data);
    return p ? { ...p, updatedAt: new Date().toISOString() } : null;
}

/** Recopie la partie publique de users/{uid} dans public_profiles/{uid} (ou la supprime si privée). Ne bloque jamais l'utilisateur. */
export async function syncPublicProfile(db, uid, privateData) {
    if (!uid) return false;
    try {
        let data = privateData;
        if (!data) {
            const snap = await getDoc(doc(db, 'users', uid));
            if (!snap.exists()) return false;
            data = snap.data();
        }
        const pub = publicProfileDoc(data);
        if (pub) await setDoc(doc(db, PUBLIC_COLLECTION, uid), pub);
        else await deleteDoc(doc(db, PUBLIC_COLLECTION, uid));
        return true;
    } catch (e) {
        console.warn('Fiche publique non mise à jour :', e.code || e.message);
        return false;
    }
}

export async function deletePublicProfile(db, uid) {
    try { await deleteDoc(doc(db, PUBLIC_COLLECTION, uid)); } catch (e) { console.warn('Fiche publique non supprimée :', e.code || e.message); }
}
