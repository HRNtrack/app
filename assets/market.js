// HRNtrack — page Marché : calculs à partir des données publiques de market_prices (fonctions pures, testables).
//   community : cote actuelle en € par ID (nombre, ou objet { current })
//   history   : { months: ['YYYY-MM', …], items: { ID: [valeur | null, …] } } (6 mois, page admin)
//   rarity    : { collectors, owned: { ID: % }, wanted: { ID: % } } (page admin)

export const coteValue = (v) => Number(v && typeof v === 'object' ? v.current : v) || 0;

/** Tendance d'une série de valeurs : du premier point connu au dernier (le dernier est remplacé par la cote actuelle). */
export function trendOf(series, current) {
    if (!Array.isArray(series)) return null;
    const vals = series.slice();
    if (current > 0) vals[vals.length - 1] = current;
    const first = vals.find(v => v != null && v > 0);
    let last = null;
    for (let i = vals.length - 1; i >= 0; i--) if (vals[i] != null && vals[i] > 0) { last = vals[i]; break; }
    if (!first || !last || vals.filter(v => v != null && v > 0).length < 2) return null;
    return Math.round(((last - first) / first) * 100);
}

/**
 * @param {Array<{ID, Name, Serie, Image, 'Secret Rare'}>} catalog
 * @returns {{ items, top, risers, fallers, series, rare, wanted, count, avg, months }}
 */
export function computeMarket(catalog, community = {}, history = null, rarity = null, { limit = 10 } = {}) {
    const hist = (history && history.items) || {};
    const owned = (rarity && rarity.owned) || {};
    const wantedPct = (rarity && rarity.wanted) || {};
    const items = catalog.map(b => {
        const id = String(b.ID);
        const cote = coteValue(community[id] ?? community[b.ID]);
        return {
            id, name: b.Name, serie: b.Serie, image: b.Image, secret: String(b['Secret Rare']).toLowerCase() === 'yes',
            cote, trend: trendOf(hist[id], cote), spark: hist[id] || null,
            owned: owned[id] != null ? Number(owned[id]) : null, wanted: wantedPct[id] != null ? Number(wantedPct[id]) : null
        };
    });
    const priced = items.filter(i => i.cote > 0);
    const withTrend = priced.filter(i => i.trend !== null);
    const bySerie = new Map();
    for (const i of priced) {
        const s = bySerie.get(i.serie) || { serie: i.serie, count: 0, sum: 0, trends: [], max: null };
        s.count++; s.sum += i.cote;
        if (i.trend !== null) s.trends.push(i.trend);
        if (!s.max || i.cote > s.max.cote) s.max = i;
        bySerie.set(i.serie, s);
    }
    const series = [...bySerie.values()].map(s => ({
        serie: s.serie, count: s.count, avg: Math.round(s.sum / s.count), total: Math.round(s.sum),
        trend: s.trends.length ? Math.round(s.trends.reduce((a, b) => a + b, 0) / s.trends.length) : null, max: s.max
    })).sort((a, b) => b.avg - a.avg || a.serie.localeCompare(b.serie));
    return {
        items,
        count: priced.length,
        avg: priced.length ? Math.round(priced.reduce((a, i) => a + i.cote, 0) / priced.length) : 0,
        months: (history && history.months) || [],
        top: priced.slice().sort((a, b) => b.cote - a.cote).slice(0, limit),
        risers: withTrend.filter(i => i.trend > 0).sort((a, b) => b.trend - a.trend).slice(0, limit),
        fallers: withTrend.filter(i => i.trend < 0).sort((a, b) => a.trend - b.trend).slice(0, limit),
        series,
        // Rares : possédées par au moins un collectionneur, la part la plus faible d'abord
        rare: items.filter(i => i.owned !== null && i.owned > 0).sort((a, b) => a.owned - b.owned).slice(0, limit),
        wanted: items.filter(i => i.wanted !== null && i.wanted > 0).sort((a, b) => b.wanted - a.wanted).slice(0, limit)
    };
}
