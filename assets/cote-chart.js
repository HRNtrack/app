// HRNtrack — petit graphique d'évolution de la cote (SVG, sans bibliothèque).
// Les couleurs passent par les variables CSS du thème : le graphique suit le mode clair / sombre.

/**
 * @param {(number|null)[]} values  cote en € par mois (null = pas assez de prix ce mois-là)
 * @param {string[]} labels          libellés des mois (même longueur)
 * @param {{ format?: (n:number)=>string }} opts
 * @returns {string} SVG, ou '' s'il y a moins de 2 points
 */
export function coteChartSvg(values, labels, opts = {}) {
    const fmt = opts.format || ((n) => Math.round(n) + ' €');
    const pts = values.map((v, i) => ({ v, i })).filter(p => Number.isFinite(p.v));
    if (pts.length < 2) return '';

    const W = 300, H = 120, padL = 8, padR = 8, padT = 18, padB = 22;
    const vs = pts.map(p => p.v);
    let min = Math.min(...vs), max = Math.max(...vs);
    if (max - min < 1) { min -= 1; max += 1; }                 // courbe plate : on garde une marge
    const span = max - min;
    min -= span * 0.15; max += span * 0.15;
    const x = (i) => padL + (i * (W - padL - padR)) / Math.max(1, values.length - 1);
    const y = (v) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);

    const first = pts[0], last = pts[pts.length - 1];
    const trend = last.v > first.v ? 'up' : last.v < first.v ? 'down' : 'flat';
    const stroke = trend === 'up' ? 'var(--color-green)' : trend === 'down' ? 'var(--color-red)' : 'var(--color-text-sub)';

    const line = pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
    const area = `${line} L${x(last.i).toFixed(1)},${H - padB} L${x(first.i).toFixed(1)},${H - padB} Z`;
    const dots = pts.map(p => `<circle cx="${x(p.i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${p === last ? 3.5 : 2.5}" fill="${p === last ? stroke : 'var(--surface)'}" stroke="${stroke}" stroke-width="1.5"><title>${labels[p.i]} : ${fmt(p.v)}</title></circle>`).join('');
    const valueLabel = (p, anchor) => `<text x="${x(p.i).toFixed(1)}" y="${(y(p.v) - 7).toFixed(1)}" text-anchor="${anchor}" font-size="10" font-weight="700" fill="var(--text-main)">${fmt(p.v)}</text>`;
    const monthLabels = labels.map((l, i) => `<text x="${x(i).toFixed(1)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}" font-size="9" fill="var(--color-text-sub)">${l}</text>`).join('');

    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${labels[first.i]} ${fmt(first.v)} → ${labels[last.i]} ${fmt(last.v)}" style="display:block; overflow:visible">
        <line x1="${padL}" x2="${W - padR}" y1="${H - padB}" y2="${H - padB}" stroke="var(--color-border)" stroke-width="1"/>
        <path d="${area}" fill="${stroke}" opacity="0.1"/>
        <path d="${line}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        ${dots}${valueLabel(first, 'start')}${first !== last ? valueLabel(last, 'end') : ''}${monthLabels}
    </svg>`;
}

/** Variation en % entre le premier et le dernier point connu (null si impossible). */
export function coteTrend(values) {
    const pts = values.filter(Number.isFinite);
    if (pts.length < 2 || pts[0] <= 0) return null;
    return Math.round(((pts[pts.length - 1] - pts[0]) / pts[0]) * 100);
}
