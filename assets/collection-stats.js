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
/** Priorités de wishlist (champ Priority d'une figurine recherchée). */
export const PRIORITIES = ['high', 'medium', 'low'];

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
        conditions: {}, topItems: [], seriesMap: {},
        wishCost: 0, wishPriced: 0,
        wishByPriority: Object.fromEntries([...PRIORITIES, 'none'].map(p => [p, { count: 0, cost: 0, priced: 0 }]))
    };

    for (const item of items) {
        const serie = item.Serie || '—';
        const sm = (s.seriesMap[serie] ||= { name: serie, total: 0, owned: 0, spent: 0, missingNames: [], special: isSpecialSerie(serie) });
        sm.total++;
        const secret = String(item['Secret Rare']).toLowerCase() === 'yes';
        if (secret) s.secretsTotal++;
        const status = String(item.Status || '').toLowerCase();

        if (!OWNED.has(status)) {
            // Coût pour compléter : cote communautaire des figurines manquantes (quand elle est connue)
            const missingCote = Number(cotes[item.ID]) || 0;
            sm.missingCount = (sm.missingCount || 0) + 1;
            if (missingCote > 0) { sm.missingCost = (sm.missingCost || 0) + missingCote; sm.missingPriced = (sm.missingPriced || 0) + 1; }
            if (WISH.has(status)) {
                s.wish++;
                const prio = PRIORITIES.includes(item.Priority) ? item.Priority : 'none';
                const w = s.wishByPriority[prio];
                w.count++;
                if (missingCote > 0) { w.cost += missingCote; w.priced++; s.wishCost += missingCote; s.wishPriced++; }
            } else s.missing++;
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
        s.topItems.push({ id: String(item.ID), name: item.Name, serie, image: item.Image, secret, paid: paidEur, cote });

        const d = item['Purchase date'] ? new Date(item['Purchase date']) : null;
        if (d && !isNaN(d) && d.getFullYear() >= 2019 && d <= now) {
            const day = d.toISOString().slice(0, 10), month = day.slice(0, 7);
            s.timeline[day] = (s.timeline[day] || 0) + qty;
            if (paidEur) s.monthly[month] = (s.monthly[month] || 0) + paidEur * qty;
            if (month === thisMonth) { s.thisMonthQty += qty; s.thisMonthSpent += paidEur * qty; }
            if (!s.lastPurchase || d > s.lastPurchase.date) s.lastPurchase = { date: d, name: item.Name };
        }
    }

    s.series = Object.values(s.seriesMap).map(x => ({ missingCount: 0, missingCost: 0, missingPriced: 0, ...x, missingCost: Math.round(x.missingCost || 0), pct: x.total ? Math.round((x.owned / x.total) * 100) : 0 }));
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
    s.wishCost = Math.round(s.wishCost);
    delete s.seriesMap;
    return s;
}

/**
 * Évolution mois par mois de la valeur estimée de la collection et de l'argent dépensé.
 * @param {Array<object>} items    catalogue fusionné avec la collection
 * @param {{months: string[], items: Record<string, Array<number|null>>}} history   market_prices/history ("YYYY-MM")
 * @param {Record<string, number>} cotes   cote actuelle en € par ID (sert au dernier mois et aux trous)
 * @param {Record<string, number>} rates   1 devise = X €
 * Une figurine compte à partir du mois de sa date d'achat ; sans date, elle compte sur toute la période.
 * @returns {{months: string[], value: number[], spent: number[], qty: number[], undated: number, sameStart: number, sameEnd: number} | null}
 * sameStart / sameEnd : valeur, au premier et au dernier mois, des seules figurines déjà possédées au premier mois.
 */
export function computeValueHistory(items, history, cotes = {}, rates = { EUR: 1 }) {
    const months = history && Array.isArray(history.months) ? history.months : [];
    if (!months.length) return null;
    const toEur = (p, cur) => p * (rates[String(cur || 'EUR').toUpperCase()] ?? 1);
    const ends = months.map(m => { const [y, mo] = m.split('-').map(Number); return new Date(y, mo, 1).getTime(); });
    const last = months.length - 1;
    const value = months.map(() => 0), spent = months.map(() => 0), qtyAt = months.map(() => 0);
    let undated = 0;
    let sameStart = 0, sameEnd = 0;   // figurines déjà là au premier mois : évolution « à collection égale »

    for (const item of items) {
        if (!OWNED.has(String(item.Status || '').toLowerCase())) continue;
        const rawQty = parseInt(item.Quantity, 10);
        const qty = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 1;
        const price = parseFloat(item['Purchase price']);
        const paid = Number.isFinite(price) && price > 0 ? toEur(price, item.Currency) : 0;
        const d = item['Purchase date'] ? new Date(item['Purchase date']) : null;
        const t = d && !isNaN(d) ? d.getTime() : null;
        if (t === null) undated += qty;
        const series = (history.items && history.items[item.ID]) || null;
        const current = Number(cotes[item.ID]) || 0;

        for (let k = 0; k <= last; k++) {
            if (t !== null && t >= ends[k]) continue;   // pas encore achetée ce mois-là
            let v = null;
            if (k === last && current > 0) v = current;   // dernier mois aligné sur la cote affichée partout
            if (v === null && series) {
                v = series[k] ?? null;
                // trou dans l'historique : valeur connue la plus proche (d'abord avant, puis après)
                for (let j = k - 1; v === null && j >= 0; j--) v = series[j] ?? null;
                for (let j = k + 1; v === null && j <= last; j++) v = series[j] ?? null;
            }
            if (v === null) v = current || paid || 0;
            value[k] += v * qty;
            spent[k] += paid * qty;
            qtyAt[k] += qty;
            if (t === null || t < ends[0]) { if (k === 0) sameStart += v * qty; if (k === last) sameEnd += v * qty; }
        }
    }
    return { months, value: value.map(Math.round), spent: spent.map(Math.round), qty: qtyAt, undated, sameStart: Math.round(sameStart), sameEnd: Math.round(sameEnd) };
}

/**
 * Journal de collection : achats regroupés par mois (le plus récent d'abord).
 * @param {Array<object>} items  catalogue fusionné avec la collection
 * @param {Record<string, number>} rates  1 devise = X €
 * @returns {{ months: Array<{ key: string, qty: number, spent: number, bySerie: Array<{ serie: string, qty: number }>,
 *            items: Array<{ id: string, name: string, image: string, serie: string, qty: number, day: string, secret: boolean }> }>,
 *            undated: number, firstKey: string|null }}
 *   undated : nombre de figurines possédées sans date d'achat (non placées sur la frise)
 */
export function computeJournal(items, rates = { EUR: 1 }, now = new Date()) {
    const toEur = (p, cur) => p * (rates[String(cur || 'EUR').toUpperCase()] ?? 1);
    const byMonth = new Map();
    let undated = 0;
    for (const item of items) {
        if (!OWNED.has(String(item.Status || '').toLowerCase())) continue;
        const rawQty = parseInt(item.Quantity, 10);
        const qty = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 1;
        const d = item['Purchase date'] ? new Date(item['Purchase date']) : null;
        if (!d || isNaN(d) || d.getFullYear() < 2019 || d > now) { undated += qty; continue; }
        const day = d.toISOString().slice(0, 10), key = day.slice(0, 7);
        const price = parseFloat(item['Purchase price']);
        const paid = Number.isFinite(price) && price > 0 ? toEur(price, item.Currency) * qty : 0;
        const m = byMonth.get(key) || { key, qty: 0, spent: 0, series: new Map(), items: [] };
        m.qty += qty;
        m.spent += paid;
        const serie = item.Serie || '—';
        m.series.set(serie, (m.series.get(serie) || 0) + qty);
        m.items.push({ id: String(item.ID), name: item.Name, image: item.Image, serie, qty, day, secret: String(item['Secret Rare']).toLowerCase() === 'yes' });
        byMonth.set(key, m);
    }
    const months = [...byMonth.values()]
        .sort((a, b) => b.key.localeCompare(a.key))
        .map(m => ({
            key: m.key, qty: m.qty, spent: Math.round(m.spent),
            bySerie: [...m.series].map(([serie, qty]) => ({ serie, qty })).sort((a, b) => b.qty - a.qty || a.serie.localeCompare(b.serie)),
            items: m.items.sort((a, b) => b.day.localeCompare(a.day) || a.name.localeCompare(b.name))
        }));
    return { months, undated, firstKey: months.length ? months[months.length - 1].key : null };
}
