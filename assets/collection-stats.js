// HRNtrack — statistiques de la collection d'un utilisateur (page Statistiques).
// Fonctions pures (aucun accès au DOM ni à Firebase) : testables avec une collection fictive.

export const RANKS = [
    { min: 0, name: 'Novice', emoji: '🌱' },
    { min: 200, name: 'Amateur', emoji: '🧢' },
    { min: 500, name: 'Collector', emoji: '💎' },
    { min: 1000, name: 'Master', emoji: '👑' },
    { min: 2000, name: 'Legend', emoji: '🌌' }
];

const OWNED = new Set(['possédé', 'possédée', 'owned']);
const WISH = new Set(['recherché', 'recherche', 'wishlist']);
export const isSpecialSerie = (serie) => /special|limited/i.test(serie);

/** Rang selon le score : +10 / figurine, +100 / secret, +50 / série complète. */
export function rankFor(score) {
    let i = RANKS.length - 1;
    while (i > 0 && score < RANKS[i].min) i--;
    const cur = RANKS[i], next = RANKS[i + 1] || null;
    const progressPct = next ? Math.round(((score - cur.min) / (next.min - cur.min)) * 100) : 100;
    return { ...cur, score, next, toNext: next ? next.min - score : 0, progressPct };
}

/**
 * @param {Array<object>} items  catalogue fusionné avec la collection (Status, Quantity, Purchase price, Currency, Purchase date, Condition)
 * @param {Record<string, number>} cotes   cote communautaire en € par ID
 * @param {Record<string, number>} rates   1 devise = X €
 * @param {Date} now
 */
export function computeCollectionStats(items, cotes = {}, rates = { EUR: 1 }, now = new Date()) {
    const toEur = (p, cur) => p * (rates[String(cur || 'EUR').toUpperCase()] ?? 1);
    const thisMonth = now.toISOString().slice(0, 7);
    const s = {
        catalogSize: items.length, ownedUnique: 0, totalQty: 0, doubles: 0,
        secretsOwned: 0, secretsTotal: 0, wish: 0, missing: 0,
        spentEur: 0, pricedQty: 0, marketValue: 0, valuedQty: 0,
        dealPaid: 0, dealMarket: 0,
        timeline: {}, monthly: {}, thisMonthQty: 0, thisMonthSpent: 0, lastPurchase: null,
        conditions: {}, topItems: [], seriesMap: {}
    };

    for (const item of items) {
        const serie = item.Serie || '—';
        const sm = (s.seriesMap[serie] ||= { name: serie, total: 0, owned: 0, spent: 0, missingNames: [], special: isSpecialSerie(serie) });
        sm.total++;
        const secret = String(item['Secret Rare']).toLowerCase() === 'yes';
        if (secret) s.secretsTotal++;
        const status = String(item.Status || '').toLowerCase();

        if (!OWNED.has(status)) {
            if (WISH.has(status)) s.wish++; else s.missing++;
            sm.missingNames.push(item.Name);
            continue;
        }
        // Possédée : au moins 1 exemplaire, même si la quantité n'a pas été saisie
        const rawQty = parseInt(item.Quantity, 10);
        const qty = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 1;
        s.ownedUnique++; s.totalQty += qty; sm.owned++;
        if (qty > 1) s.doubles += qty - 1;
        if (secret) s.secretsOwned++;

        const cond = item.Condition || 'Inconnu';
        s.conditions[cond] = (s.conditions[cond] || 0) + qty;

        const price = parseFloat(item['Purchase price']);
        const paidEur = Number.isFinite(price) && price > 0 ? toEur(price, item.Currency) : 0;
        if (paidEur) { s.spentEur += paidEur * qty; s.pricedQty += qty; sm.spent += paidEur * qty; }

        const cote = Number(cotes[item.ID]) || 0;
        if (cote > 0) {
            s.marketValue += cote * qty; s.valuedQty += qty;
            if (paidEur) { s.dealPaid += paidEur * qty; s.dealMarket += cote * qty; }
        }
        s.topItems.push({ name: item.Name, serie, image: item.Image, secret, paid: paidEur, cote });

        const d = item['Purchase date'] ? new Date(item['Purchase date']) : null;
        if (d && !isNaN(d) && d.getFullYear() >= 2019 && d <= now) {
            const day = d.toISOString().slice(0, 10), month = day.slice(0, 7);
            s.timeline[day] = (s.timeline[day] || 0) + qty;
            if (paidEur) s.monthly[month] = (s.monthly[month] || 0) + paidEur * qty;
            if (month === thisMonth) { s.thisMonthQty += qty; s.thisMonthSpent += paidEur * qty; }
            if (!s.lastPurchase || d > s.lastPurchase.date) s.lastPurchase = { date: d, name: item.Name };
        }
    }

    s.series = Object.values(s.seriesMap).map(x => ({ ...x, pct: x.total ? Math.round((x.owned / x.total) * 100) : 0 }));
    const regular = s.series.filter(x => !x.special);
    s.seriesCountable = regular.length;
    s.seriesComplete = regular.filter(x => x.owned === x.total).length;
    s.seriesStarted = s.series.filter(x => x.owned > 0).length;
    // Prochains objectifs : séries régulières commencées, pas finies, les plus proches de la fin
    s.nextGoals = regular.filter(x => x.owned > 0 && x.owned < x.total)
        .sort((a, b) => (a.total - a.owned) - (b.total - b.owned) || b.pct - a.pct).slice(0, 5);
    s.series.sort((a, b) => b.pct - a.pct || b.owned - a.owned || a.name.localeCompare(b.name));

    s.completionPct = s.catalogSize ? Math.round((s.ownedUnique / s.catalogSize) * 100) : 0;
    s.avgPriceEur = s.pricedQty ? s.spentEur / s.pricedQty : 0;
    s.marketCoveragePct = s.totalQty ? Math.round((s.valuedQty / s.totalQty) * 100) : 0;
    s.dealPct = s.dealMarket > 0 ? Math.round(((s.dealMarket - s.dealPaid) / s.dealMarket) * 100) : null;
    s.topItems = s.topItems.filter(x => x.cote || x.paid).sort((a, b) => Math.max(b.cote, b.paid) - Math.max(a.cote, a.paid)).slice(0, 5);
    s.rank = rankFor(s.totalQty * 10 + s.secretsOwned * 100 + s.seriesComplete * 50);
    s.statusCounts = { owned: s.ownedUnique, wish: s.wish, missing: s.missing };
    delete s.seriesMap;
    return s;
}
