// HRNtrack — enregistrement de la collection (users/{uid}.collection) et boutons rapides ✓ / ♥.
// Partagé par la Collection et les Nouveautés : même format partout, puis mise à jour de la fiche publique
// (public_profiles) après CHAQUE enregistrement.
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { syncPublicProfile } from './public-profile.js';

export const OWNED = 'Possédé', WISH = 'Recherché', NONE = 'No status';

/** Statut normalisé d'une entrée de collection */
export function statusOf(item) {
    const s = String((item && item.Status) || '').toLowerCase();
    if (s === 'possédé' || s === 'possédée' || s === 'owned') return OWNED;
    if (s === 'recherché' || s === 'recherche' || s === 'wishlist') return WISH;
    return NONE;
}

/**
 * Bouton rapide (fonction pure). act = 'own' (✓ je l'ai) ou 'wish' (♥ je la cherche) ;
 * un second appui sur le même bouton retire le statut. Prix, date, état et notes sont gardés.
 * @returns {{ list: object[], item: object }} nouvelle liste (l'entrée est créée si besoin)
 */
export function toggleStatus(list, id, act) {
    const out = list.slice();
    const idx = out.findIndex(i => String(i.ID) === String(id));
    const item = idx >= 0 ? { ...out[idx] } : { ID: id };
    const st = statusOf(item);
    if (act === 'own') {
        if (st === OWNED) item.Status = NONE;
        else { item.Status = OWNED; item.Quantity = Math.max(1, parseInt(item.Quantity, 10) || 1); item.Priority = ''; }
    } else if (act === 'wish') {
        if (st === WISH) { item.Status = NONE; item.Priority = ''; }
        else item.Status = WISH;
    }
    if (idx >= 0) out[idx] = item; else out.push(item);
    return { list: out, item };
}

/** Format enregistré (mêmes champs que depuis toujours) */
export function cleanCollection(list) {
    return list.map(item => ({
        ID: item.ID,
        Status: item.Status || NONE,
        Condition: item.Condition || "Inconnu",
        Quantity: item.Quantity || 0,
        "Purchase price": item["Purchase price"] || 0,
        Currency: item.Currency || "EUR",
        "Purchase date": item["Purchase date"] || "",
        Note: item.Note ?? item.Notes ?? "",
        Priority: item.Priority || ""
    }));
}

/** Enregistre la collection puis met à jour la fiche publique */
export async function saveCollection(db, uid, list) {
    await setDoc(doc(db, "users", uid), { collection: cleanCollection(list) }, { merge: true });
    syncPublicProfile(db, uid);
}
