// HRNtrack — calcul des statistiques de la page admin.
// Fonctions pures (aucun accès au DOM ni à Firebase) : testables avec des données fictives.

export const MIN_PRICES = 3;          // nombre minimum de prix pour publier une cote
export const DORMANT_DAYS = 182;      // ~6 mois sans visite
export const ACTIVE_DAYS = 30;
export const MIN_DATE = new Date('2019-01-01');   // une date d'achat plus ancienne est une erreur de saisie

// Taux de secours (1 unité de devise = X €), utilisés si le service de taux du jour ne répond pas
export const FALLBACK_RATES = { EUR: 1, USD: 0.91, CAD: 0.64, GBP: 1.20, CNY: 0.14 };

/** Taux du jour de la BCE via frankfurter.dev, convertis en « 1 devise = X € ». */
export async function fetchRates(fetchFn = fetch) {
    try {
        const res = await fetchFn('https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,CAD,GBP,CNY');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        const rates = { EUR: 1 };
        for (const [cur, perEur] of Object.entries(json.rates || {})) {
            if (perEur > 0) rates[cur] = 1 / perEur;
        }
        for (const cur of Object.keys(FALLBACK_RATES)) if (!rates[cur]) rates[cur] = FALLBACK_RATES[cur];
        return { rates, source: `BCE du ${json.date}`, live: true };
    } catch (e) {
        return { rates: { ...FALLBACK_RATES }, source: 'taux de secours (service indisponible)', live: false };
    }
}

export function median(sorted) {
    if (!sorted.length) return 0;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function quantile(sorted, q) {
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/**
 * Cote robuste d'une figurine à partir des prix payés (en €).
 * - au moins MIN_PRICES prix, sinon pas de cote ;
 * - à partir de 4 prix, les valeurs hors de [Q1 - 1,5×IQR ; Q3 + 1,5×IQR] sont écartées ;
 * - la cote est la médiane des prix restants.
 */
export function robustCote(prices, minPrices = MIN_PRICES) {
    const sorted = prices.filter(p => Number.isFinite(p) && p > 0).sort((a, b) => a - b);
    if (sorted.length < minPrices) return { value: null, n: sorted.length, kept: sorted.length, outliers: [] };
    let kept = sorted, outliers = [];
    if (sorted.length >= 4) {
        const q1 = quantile(sorted, 0.25), q3 = quantile(sorted, 0.75), iqr = q3 - q1;
        const lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
        kept = sorted.filter(p => p >= lo && p <= hi);
        outliers = sorted.filter(p => p < lo || p > hi);
    }
    return { value: Math.round(median(kept)), n: sorted.length, kept: kept.length, outliers };
}

const OWNED = new Set(['possédé', 'possédée', 'owned']);
const WISH = new Set(['recherché', 'recherche', 'wishlist']);

function parseDate(raw) {
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
}

/**
 * @param {Array<{id: string, data: object}>} users  documents Firestore users/{uid}
 * @param {Array<object>} catalog                     baseData (data.js)
 * @param {Record<string, number>} rates              1 devise = X €
 * @param {Date} now
 */
export function computeStats(users, catalog, rates, now = new Date()) {
    const byId = new Map(catalog.map(b => [String(b.ID), b]));
    const seriesSize = {};
    for (const b of catalog) seriesSize[b.Serie] = (seriesSize[b.Serie] || 0) + 1;
    const dayMs = 86400000;
    const toEur = (p, cur) => p * (rates[cur] ?? rates.EUR ?? 1);

    const s = {
        userCount: users.length, usersWithItems: 0,
        active30: 0, dormant: 0, usersWithMeta: 0,
        recency: { "Aujourd'hui": 0, '7 jours': 0, '30 jours': 0, '3 mois': 0, '6 mois': 0, '+ 6 mois': 0, 'Inconnue': 0 },
        tiers: { empty: 0, newbie: 0, inter: 0, expert: 0 },
        totalQty: 0, totalSecrets: 0, totalDoubles: 0, totalWishlist: 0,
        qtyWithPrice: 0, qtyWithDate: 0, userSpends: [],
        paidPricesEur: [], totalPaidEur: 0, usersWithPrice: 0,
        currencyCounts: {}, conditionCounts: {},
        joinDates: [], purchaseDates: {}, undatedQty: 0,
        activities: [],
        owners: {}, wishers: {}, seriesQty: {},
        seriesCompletion: {},   // serie -> { started, completed, sumPct }
        userSeriesRates: [],    // un taux par (utilisateur, série commencée)
        whales: [],
        unknownIds: 0
    };
    const pricesById = {};

    for (const u of users) {
        const d = u.data || {};
        const meta = d.meta || {};
        const lastSeen = parseDate(meta.lastSeen);
        const createdAt = parseDate(meta.createdAt);
        if (lastSeen || createdAt) s.usersWithMeta++;
        if (createdAt) s.joinDates.push(createdAt);

        if (lastSeen) {
            const days = (now - lastSeen) / dayMs;
            if (days <= ACTIVE_DAYS) s.active30++;
            if (days > DORMANT_DAYS) s.dormant++;
            const bucket = days < 1 ? "Aujourd'hui" : days <= 7 ? '7 jours' : days <= 30 ? '30 jours' : days <= 91 ? '3 mois' : days <= DORMANT_DAYS ? '6 mois' : '+ 6 mois';
            s.recency[bucket]++;
        } else {
            s.recency['Inconnue']++;
        }

        const ownedIds = new Set();
        const wishedIds = new Set();
        let userQty = 0, userValueItems = [], userHasPrice = false, userSpent = 0;

        for (const item of Array.isArray(d.collection) ? d.collection : []) {
            if (!item) continue;
            const id = String(item.ID ?? item.id ?? '');
            const base = byId.get(id);
            if (!base) { if (id) s.unknownIds++; continue; }   // ignore les ID absents du catalogue
            const status = String(item.Status ?? item.status ?? '').toLowerCase();

            if (WISH.has(status)) { wishedIds.add(id); continue; }
            if (!OWNED.has(status) || ownedIds.has(id)) continue;
            ownedIds.add(id);

            const rawQty = parseInt(item.Quantity ?? item.quantity, 10);
            const qty = Number.isFinite(rawQty) && rawQty > 0 ? Math.min(rawQty, 999) : 1;
            userQty += qty;
            s.totalQty += qty;
            if (qty > 1) s.totalDoubles += qty - 1;
            if (String(base['Secret Rare']).toLowerCase() === 'yes') s.totalSecrets += qty;
            s.seriesQty[base.Serie] = (s.seriesQty[base.Serie] || 0) + qty;
            s.owners[id] = (s.owners[id] || 0) + 1;
            userValueItems.push({ id, qty });

            const cond = String(item.Condition || 'Inconnu');
            s.conditionCounts[cond] = (s.conditionCounts[cond] || 0) + qty;

            const cur = String(item.Currency || item.currency || 'EUR').toUpperCase();
            const price = parseFloat(item['Purchase price'] ?? item.purchasePrice ?? item.price);
            if (Number.isFinite(price) && price > 0) {
                s.currencyCounts[cur] = (s.currencyCounts[cur] || 0) + 1;
                const eur = toEur(price, rates[cur] !== undefined ? cur : 'EUR');
                s.qtyWithPrice += qty;
                s.totalPaidEur += eur * qty;
                userSpent += eur * qty;
                s.paidPricesEur.push(eur);
                (pricesById[id] ||= []).push(eur);   // un prix par utilisateur et par figurine
                userHasPrice = true;
            }

            const pDate = parseDate(item['Purchase date'] || item.purchaseDate || item.date);
            if (pDate && pDate >= MIN_DATE && pDate <= now) {
                s.qtyWithDate += qty;
                const key = pDate.toISOString().slice(0, 10);
                s.purchaseDates[key] = (s.purchaseDates[key] || 0) + qty;
                s.activities.push({ id, name: base.Name, img: base.Image, date: pDate });
            } else {
                s.undatedQty += qty;
            }
        }

        for (const id of wishedIds) if (!ownedIds.has(id)) {
            s.wishers[id] = (s.wishers[id] || 0) + 1;
            s.totalWishlist++;
        }

        if (ownedIds.size) {
            s.usersWithItems++;
            // Complétion par série commencée
            const perSerie = {};
            for (const id of ownedIds) { const serie = byId.get(id).Serie; perSerie[serie] = (perSerie[serie] || 0) + 1; }
            for (const [serie, n] of Object.entries(perSerie)) {
                const pct = Math.min(100, (n / seriesSize[serie]) * 100);
                s.userSeriesRates.push(pct);
                const sc = (s.seriesCompletion[serie] ||= { started: 0, completed: 0, sumPct: 0, size: seriesSize[serie] });
                sc.started++; sc.sumPct += pct;
                if (n >= seriesSize[serie]) sc.completed++;
            }
        }
        if (userHasPrice) { s.usersWithPrice++; s.userSpends.push(userSpent); }

        if (userQty === 0) s.tiers.empty++;
        else if (userQty <= 10) s.tiers.newbie++;
        else if (userQty <= 50) s.tiers.inter++;
        else s.tiers.expert++;

        s.whales.push({ uid: String(u.id).slice(0, 6), qty: userQty, items: userValueItems });
    }

    // Cotes
    s.cotes = {};
    s.coteDetails = {};
    s.outliers = [];
    let notEnough = 0;
    for (const [id, prices] of Object.entries(pricesById)) {
        const c = robustCote(prices);
        if (c.value === null) { notEnough++; continue; }
        s.cotes[id] = c.value;
        s.coteDetails[id] = c;
        for (const p of c.outliers) s.outliers.push({ id, price: p, cote: c.value, n: c.n });
    }
    s.cotesNotEnough = notEnough;
    s.outliers.sort((a, b) => Math.abs(b.price - b.cote) - Math.abs(a.price - a.cote));

    // Valeur estimée : uniquement les figurines qui ont une cote
    s.estValue = 0; s.qtyValued = 0;
    for (const w of s.whales) {
        w.value = 0;
        for (const { id, qty } of w.items) {
            if (s.cotes[id] !== undefined) { w.value += s.cotes[id] * qty; s.qtyValued += qty; }
        }
        s.estValue += w.value;
        delete w.items;
    }
    s.whales.sort((a, b) => b.qty - a.qty);

    s.paidPricesEur.sort((a, b) => a - b);
    s.medianUnitPrice = median(s.paidPricesEur);
    s.userSpends.sort((a, b) => a - b);
    s.medianSpentPerPayer = median(s.userSpends);   // médiane : une faute de frappe ne la fausse pas
    s.avgSeriesCompletion = s.userSeriesRates.length ? s.userSeriesRates.reduce((a, b) => a + b, 0) / s.userSeriesRates.length : 0;
    s.neverOwned = catalog.filter(b => !s.owners[String(b.ID)]).map(b => ({ id: String(b.ID), name: b.Name, serie: b.Serie, wanted: s.wishers[String(b.ID)] || 0 }))
        .sort((a, b) => b.wanted - a.wanted || a.name.localeCompare(b.name));

    // Tension : toutes les figurines demandées, y compris celles que personne ne possède
    s.tension = Object.entries(s.wishers).map(([id, wanted]) => {
        const owned = s.owners[id] || 0;
        return { id, wanted, owned, index: wanted / (owned + 1) };
    }).sort((a, b) => b.index - a.index || b.wanted - a.wanted);

    s.activities.sort((a, b) => b.date - a.date);
    s.joinDates.sort((a, b) => a - b);
    return s;
}

export const HISTORY_MONTHS = 6;

/**
 * Historique des cotes : cote de chaque figurine à la fin de chacun des N derniers mois
 * (le dernier point = mois en cours). Chaque point utilise les achats DATÉS jusqu'à cette date,
 * avec les mêmes règles que la cote actuelle (médiane, ≥ MIN_PRICES prix, aberrants écartés).
 * L'historique est donc reconstitué à partir des dates d'achat, sans attendre des mois.
 * @returns {{ months: string[], updatedAt: string, items: Record<string, (number|null)[]> }}
 */
export function computeCoteHistory(users, catalog, rates, now = new Date(), months = HISTORY_MONTHS) {
    const ids = new Set(catalog.map(b => String(b.ID)));
    const toEur = (p, cur) => p * (rates[String(cur || 'EUR').toUpperCase()] ?? 1);
    const dated = {};   // ID -> [{ t, eur }]  (un achat par utilisateur et par figurine)

    for (const u of users) {
        const seen = new Set();
        for (const item of Array.isArray(u.data?.collection) ? u.data.collection : []) {
            if (!item) continue;
            const id = String(item.ID ?? item.id ?? '');
            if (!ids.has(id) || seen.has(id)) continue;
            if (!OWNED.has(String(item.Status ?? item.status ?? '').toLowerCase())) continue;
            const price = parseFloat(item['Purchase price'] ?? item.purchasePrice ?? item.price);
            const d = parseDate(item['Purchase date'] || item.purchaseDate || item.date);
            if (!Number.isFinite(price) || price <= 0 || !d || d < MIN_DATE || d > now) continue;
            seen.add(id);
            (dated[id] ||= []).push({ t: d.getTime(), eur: toEur(price, item.Currency || item.currency) });
        }
    }

    // Fins de mois : 1er jour du mois suivant (exclu), du plus ancien au mois en cours
    const labels = [], ends = [];
    for (let i = months - 1; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(`${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`);
        ends.push(new Date(start.getFullYear(), start.getMonth() + 1, 1).getTime());
    }

    const items = {};
    for (const [id, list] of Object.entries(dated)) {
        const series = ends.map(end => robustCote(list.filter(p => p.t < end).map(p => p.eur)).value);
        if (series.filter(v => v !== null).length >= 2) items[id] = series;   // au moins 2 points pour tracer
    }
    return { months: labels, updatedAt: now.toISOString(), items };
}
