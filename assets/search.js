// HRNtrack — recherche dans le catalogue (page Collection).
// Fonctions pures, testables sans navigateur.
//  - insensible aux majuscules et aux accents (« cafe » trouve « Café »)
//  - plusieurs mots : tous doivent être trouvés, dans n'importe quel ordre (« hedwig potter »)
//  - cherche dans le nom, la série et l'ID ; les meilleurs résultats d'abord

/** Texte simplifié pour la comparaison : minuscules, sans accents ni ponctuation. */
export function normalize(text) {
    return String(text ?? '')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9%]+/g, ' ')
        .trim();
}

/** Prépare un index de recherche : à faire une seule fois par catalogue. */
export function buildIndex(items) {
    return items.map(item => ({
        item,
        name: normalize(item.Name),
        serie: normalize(item.Serie),
        id: normalize(item.ID)
    }));
}

/**
 * Score d'une entrée pour une requête (0 = ne correspond pas).
 * Chaque mot doit apparaître dans le nom, la série ou l'ID.
 */
export function scoreEntry(entry, words) {
    let score = 0;
    for (const w of words) {
        const nameWords = entry.name.split(' ');
        if (entry.name === w) score += 100;
        else if (nameWords.includes(w)) score += 40;
        else if (nameWords.some(x => x.startsWith(w))) score += 25;
        else if (entry.name.includes(w)) score += 15;
        else if (entry.serie.split(' ').some(x => x.startsWith(w))) score += 10;
        else if (entry.serie.includes(w)) score += 6;
        else if (entry.id.includes(w)) score += 8;
        else return 0;   // un mot introuvable : l'entrée est écartée
    }
    if (entry.name.startsWith(words.join(' '))) score += 30;   // la requête entière commence le nom
    return score;
}

/**
 * Filtre et classe les entrées.
 * @returns {Array<{item, score}>} dans l'ordre de pertinence (requête vide → tout, score 0)
 */
export function search(index, query) {
    const words = normalize(query).split(' ').filter(Boolean);
    if (!words.length) return index.map(e => ({ item: e.item, score: 0 }));
    const out = [];
    for (const e of index) {
        const score = scoreEntry(e, words);
        if (score > 0) out.push({ item: e.item, score });
    }
    return out.sort((a, b) => b.score - a.score);
}
