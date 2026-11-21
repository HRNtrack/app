// HRNtrack — image « Story Instagram » (1080 × 1920) dessinée directement sur un <canvas>.
// Plus fiable que la capture d'une page HTML : rendu identique partout, images nettes, aucune dépendance.
// Logo local et images du catalogue chargées depuis la même origine : le canvas reste exportable.

const W = 1080, H = 1920;
const C = {
    bg1: '#141413', bg2: '#22211d', text: '#F5F5F0', sub: '#A8A49B', faint: 'rgba(255,255,255,0.07)',
    line: 'rgba(255,255,255,0.14)', green: '#7FA65A', gold: '#C6A875', track: '#2F2E2A'
};
const LOGO = 'assets/img/logo-blanc.png';
const FONT = "'Poppins', 'Segoe UI', Arial, sans-serif";

const TEXT = {
    fr: {
        kicker: 'MA COLLECTION HIRONO', collector: 'Collectionneur Hirono', ofCatalog: 'du catalogue',
        unique: '{n} / {t} figurines différentes', figs: 'Figurines', secrets: 'Secrets', series: 'Séries complètes',
        value: 'Valeur estimée', wish: 'Wishlist', doubles: 'À échanger', top: 'MES PÉPITES', favs: 'DANS MA COLLECTION',
        footer: 'Suis ta collection sur', pts: 'pts'
    },
    en: {
        kicker: 'MY HIRONO COLLECTION', collector: 'Hirono collector', ofCatalog: 'of the catalog',
        unique: '{n} / {t} unique figures', figs: 'Figures', secrets: 'Secrets', series: 'Complete series',
        value: 'Estimated value', wish: 'Wishlist', doubles: 'For trade', top: 'MY TOP PICKS', favs: 'IN MY COLLECTION',
        footer: 'Track yours on', pts: 'pts'
    }
};

// Le catalogue pointe vers https://hrntrack.app/…, qui redirige vers www sans en-tête CORS :
// sur le site on charge l'image depuis la même origine, ailleurs directement depuis www.
function sameOriginUrl(src) {
    try {
        const u = new URL(src, location.href);
        if (/(^|\.)hrntrack\.app$/i.test(u.hostname)) {
            return /(^|\.)hrntrack\.app$/i.test(location.hostname) ? u.pathname + u.search : 'https://www.hrntrack.app' + u.pathname + u.search;
        }
        return u.href;
    } catch (e) { return src; }
}

function loadImage(src) {
    return new Promise((resolve) => {
        if (!src) return resolve(null);
        src = sameOriginUrl(src);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// Texte centré qui rétrécit (jusqu'à minSize) puis se coupe avec « … » pour tenir dans maxW
function fitText(ctx, text, x, y, maxW, size, weight, color, minSize = size * 0.6, spacing = 0) {
    let s = size;
    const set = () => { ctx.font = `${weight} ${s}px ${FONT}`; if ('letterSpacing' in ctx) ctx.letterSpacing = spacing + 'px'; };
    set();
    while (ctx.measureText(text).width > maxW && s > minSize) { s -= 2; set(); }
    let t = String(text);
    if (ctx.measureText(t).width > maxW) {
        while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
        t += '…';
    }
    ctx.fillStyle = color;
    ctx.fillText(t, x, y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    return s;
}

function drawContain(ctx, img, x, y, w, h) {
    const r = Math.min(w / img.width, h / img.height);
    const dw = img.width * r, dh = img.height * r;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} d  { lang, pseudo, rank:{emoji,name,score}, ownedUnique, catalogSize, totalQty, secretsOwned, secretsTotal,
 *                      seriesComplete, seriesCountable, value (en € ou null), valueText, wish, doubles, picks:[{name,image,priceText}], picksAreTop, dateText }
 */
export async function drawStory(canvas, d) {
    const L = TEXT[d.lang] || TEXT.fr;
    const fmt = (k, v) => L[k].replace(/\{(\w+)\}/g, (_, n) => v[n] ?? '');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Polices et images d'abord, pour un rendu complet du premier coup
    try { await Promise.all(['400', '600', '800'].map(w => document.fonts.load(`${w} 40px Poppins`))); } catch (e) { /* police système */ }
    const [logo, ...pickImgs] = await Promise.all([loadImage(LOGO), ...d.picks.map(p => loadImage(p.image))]);

    // Fond : dégradé sombre + deux halos de couleur
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, C.bg1); bg.addColorStop(1, C.bg2);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const glow = (x, y, r, color) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    };
    glow(160, 620, 620, 'rgba(127,166,90,0.20)');
    glow(960, 1250, 560, 'rgba(198,168,117,0.16)');

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    // En-tête : logo, accroche, pseudo, rang
    if (logo) drawContain(ctx, logo, W / 2 - 150, 45, 300, 175);
    else fitText(ctx, 'HRNtrack', W / 2, 160, 600, 80, 800, C.text);
    fitText(ctx, L.kicker, W / 2, 270, 900, 28, 600, C.gold, 20, 8);
    fitText(ctx, d.pseudo || L.collector, W / 2, 360, 940, 78, 800, C.text, 44);

    const rankText = `${d.rank.emoji}  ${d.rank.name} · ${d.rank.score} ${L.pts}`;
    ctx.font = `600 30px ${FONT}`;
    const rw = ctx.measureText(rankText).width + 64;
    roundRect(ctx, W / 2 - rw / 2, 392, rw, 62, 31);
    ctx.fillStyle = 'rgba(198,168,117,0.14)'; ctx.fill();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = C.text; ctx.fillText(rankText, W / 2, 434);

    // Anneau de complétion
    const pct = d.catalogSize ? Math.round(d.ownedUnique / d.catalogSize * 100) : 0;
    const cx = W / 2, cy = 690, r = 200;
    ctx.lineCap = 'round'; ctx.lineWidth = 36;
    ctx.strokeStyle = C.track; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    if (pct > 0) {
        const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        grad.addColorStop(0, C.green); grad.addColorStop(1, C.gold);
        ctx.strokeStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(pct, 100) / 100); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    fitText(ctx, pct + '%', cx, cy + 30, 360, 132, 800, C.text);
    fitText(ctx, L.ofCatalog, cx, cy + 82, 340, 30, 400, C.sub);
    fitText(ctx, fmt('unique', { n: d.ownedUnique, t: d.catalogSize }), cx, cy + r + 70, 900, 32, 600, C.sub);

    // 4 chiffres clés
    const tiles = [
        { v: String(d.totalQty), l: L.figs, c: C.text },
        { v: `${d.secretsOwned}/${d.secretsTotal}`, l: L.secrets, c: C.gold },
        { v: `${d.seriesComplete}/${d.seriesCountable}`, l: L.series, c: C.green },
        d.value ? { v: d.valueText, l: L.value, c: C.text } : (d.doubles ? { v: String(d.doubles), l: L.doubles, c: C.text } : { v: String(d.wish), l: L.wish, c: C.text })
    ];
    const tw = 456, th = 160, gx = 24, top = 1010, left = (W - tw * 2 - gx) / 2;
    tiles.forEach((t, i) => {
        const x = left + (i % 2) * (tw + gx), y = top + Math.floor(i / 2) * (th + gx);
        roundRect(ctx, x, y, tw, th, 28);
        ctx.fillStyle = C.faint; ctx.fill();
        ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke();
        fitText(ctx, t.v, x + tw / 2, y + 88, tw - 40, 64, 800, t.c, 36);
        fitText(ctx, t.l.toUpperCase(), x + tw / 2, y + 130, tw - 40, 24, 600, C.sub, 16, 2);
    });

    // Pépites : 3 figurines avec image
    if (d.picks.length) {
        fitText(ctx, d.picksAreTop ? L.top : L.favs, W / 2, 1430, 900, 26, 600, C.gold, 18, 6);
        const n = d.picks.length, cw = 292, cg = 24, cl = (W - (cw * n + cg * (n - 1))) / 2, ctop = 1455;
        d.picks.forEach((p, i) => {
            const x = cl + i * (cw + cg);
            roundRect(ctx, x, ctop, cw, 215, 24);
            ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fill();
            ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke();
            if (pickImgs[i]) {
                ctx.save(); roundRect(ctx, x, ctop, cw, 215, 24); ctx.clip();
                drawContain(ctx, pickImgs[i], x + 20, ctop + 12, cw - 40, 191);
                ctx.restore();
            }
            fitText(ctx, p.name, x + cw / 2, ctop + 253, cw - 10, 24, 600, C.text, 18);
            if (p.priceText) fitText(ctx, p.priceText, x + cw / 2, ctop + 287, cw - 10, 26, 800, C.gold, 18);
        });
    }

    // Pied : adresse du site et date
    ctx.font = `400 28px ${FONT}`;
    const foot = L.footer + ' ', site = 'hrntrack.app';
    const fw = ctx.measureText(foot).width;
    ctx.font = `800 28px ${FONT}`;
    const sw = ctx.measureText(site).width;
    ctx.textAlign = 'left';
    ctx.font = `400 28px ${FONT}`; ctx.fillStyle = C.sub; ctx.fillText(foot, W / 2 - (fw + sw) / 2, 1800);
    ctx.font = `800 28px ${FONT}`; ctx.fillStyle = C.text; ctx.fillText(site, W / 2 - (fw + sw) / 2 + fw, 1800);
    ctx.textAlign = 'center';
    fitText(ctx, d.dateText, W / 2, 1838, 600, 20, 400, 'rgba(168,164,155,0.7)');
    return canvas;
}

export function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('export')), 'image/png'));
}
