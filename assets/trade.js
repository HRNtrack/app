// HRNtrack — bourse aux échanges : rapprochement des doublons et des manques entre collectionneurs.
// Fonctions pures (aucun accès au DOM ni à Firebase) : testables avec des fiches fictives.
// Une fiche = { uid, pseudo, avatar, contact, items: [{ ID, s: 'owned'|'wish', q }] } (voir assets/public-profile.js).

function index(profile) {
    const owned = new Map(), wish = new Set();
    for (const it of (profile && profile.items) || []) {
        const id = String(it.ID);
        if (it.s === 'owned') owned.set(id, Math.max(1, Number(it.q) || 1));
        else if (it.s === 'wish') wish.add(id);
    }
    const doubles = [...owned].filter(([, q]) => q > 1).map(([id]) => id);
    return { owned, wish, doubles };
}

/**
 * @param {object} me       ma fiche (mêmes champs qu'une fiche publique)
 * @param {object[]} others fiches des autres participants
 * @param {Set<string>} [catalogIds]  IDs du catalogue (les IDs inconnus sont ignorés)
 * @returns {object[]} une entrée par collectionneur ayant au moins une figurine à échanger, la meilleure d'abord :
 *   { uid, pseudo, avatar, contact, theyGive: [{id, wished}], iGive: [{id, wished}], mutual, wishedCount, score }
 *   theyGive : ses doublons que je n'ai pas (wished = dans ma wishlist)
 *   iGive    : mes doublons qu'il ou elle n'a pas (wished = dans sa wishlist)
 */
export function computeTradeMatches(me, others, catalogIds) {
    const mine = index(me);
    const known = (id) => !catalogIds || catalogIds.has(id);
    const out = [];
    for (const other of others || []) {
        if (!other || other.uid === me.uid) continue;
        const theirs = index(other);
        const theyGive = theirs.doubles.filter(id => known(id) && !mine.owned.has(id))
            .map(id => ({ id, wished: mine.wish.has(id) }));
        const iGive = mine.doubles.filter(id => known(id) && !theirs.owned.has(id))
            .map(id => ({ id, wished: theirs.wish.has(id) }));
        if (!theyGive.length && !iGive.length) continue;
        const byWish = (a, b) => (b.wished - a.wished) || a.id.localeCompare(b.id);
        theyGive.sort(byWish); iGive.sort(byWish);
        const mutual = theyGive.length > 0 && iGive.length > 0;
        const wishedCount = theyGive.filter(x => x.wished).length + iGive.filter(x => x.wished).length;
        // Échange réciproque d'abord, puis les figurines vraiment recherchées, puis le volume
        const score = (mutual ? 1000 : 0) + wishedCount * 20 + Math.min(theyGive.length, iGive.length) * 5 + theyGive.length + iGive.length;
        out.push({
            uid: other.uid, pseudo: other.pseudo || '', avatar: other.avatar || '', contact: other.contact || '',
            theyGive, iGive, mutual, wishedCount, score
        });
    }
    return out.sort((a, b) => b.score - a.score || a.pseudo.localeCompare(b.pseudo));
}

/** Mes doublons (IDs) et ma wishlist, pour le résumé de la page. */
export function myTradeSummary(me) {
    const m = index(me);
    return { doubles: m.doubles.length, wish: m.wish.size };
}
