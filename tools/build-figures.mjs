// HRNtrack — génère une fiche publique par figurine (/figurine/<slug>.html) et le sitemap.xml.
// À relancer à CHAQUE mise à jour du catalogue (data.js), et si possible après « Mettre à jour les Cotes » :
//     node tools/build-figures.mjs
// - Le texte est en français (langue vue par Google) ; la page se traduit et met la cote à jour en direct.
// - La cote, la tendance et la rareté écrites dans la page viennent des données publiques market_prices
//   (lues au moment de la génération ; sans réseau, les fiches sont faites sans cote).
// - Un fichier n'est réécrit que si son contenu change ; le sitemap garde alors l'ancienne date.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.hrntrack.app/';
const OUT_DIR = path.join(ROOT, 'figurine');
const today = new Date().toISOString().slice(0, 10);

const { baseData } = await import(pathToFileURL(path.join(ROOT, 'data.js')).href + '?t=' + Date.now());
const { figureSlugs, figureHref } = await import(pathToFileURL(path.join(ROOT, 'assets/figure-url.js')).href);
const { FIG_TEXT, figureKind, fill, aboutText } = await import(pathToFileURL(path.join(ROOT, 'assets/figure-text.js')).href);
const T = FIG_TEXT.fr;

// Version de data.js utilisée par le site (lue dans marche.html) : reprise pour le script des fiches
const marche = fs.readFileSync(path.join(ROOT, 'marche.html'), 'utf8');
const dataVersion = (marche.match(/data\.js\?v=([\w-]+)/) || [])[1] || today;

// --- Données publiques de cote (Firestore REST, lecture publique) ---
const fromFs = (v) => {
    if (!v) return null;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return Number(v.doubleValue);
    if ('stringValue' in v) return v.stringValue;
    if ('nullValue' in v) return null;
    if ('booleanValue' in v) return v.booleanValue;
    if ('timestampValue' in v) return v.timestampValue;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFs);
    if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, fromFs(x)]));
    return null;
};
async function getPublic(id) {
    try {
        const r = await fetch(`https://firestore.googleapis.com/v1/projects/hrntrack-1cfe3/databases/(default)/documents/market_prices/${id}`);
        if (!r.ok) return null;
        const j = await r.json();
        return Object.fromEntries(Object.entries(j.fields || {}).map(([k, x]) => [k, fromFs(x)]));
    } catch (e) { return null; }
}
const [community, history, rarity] = await Promise.all([getPublic('community'), getPublic('history'), getPublic('rarity')]);
const { coteValue, trendOf } = await import(pathToFileURL(path.join(ROOT, 'assets/market.js')).href);

// --- Outils ---
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = (n) => Math.round(n).toLocaleString('fr-FR') + ' €';
const isSecret = (f) => String(f['Secret Rare']).toLowerCase() === 'yes';
const imgPath = (f) => String(f.Image || '').replace(/^https?:\/\/(www\.)?hrntrack\.app\//, '');   // relatif à la racine
const imgAbs = (f) => /^https?:/.test(imgPath(f)) ? imgPath(f) : SITE + imgPath(f);
const cote = (f) => community ? coteValue(community[String(f.ID)]) : 0;
const slugs = figureSlugs(baseData);
const urlOf = (f) => SITE + figureHref(slugs.get(String(f.ID)));

const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.gstatic.com https://apis.google.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob: https:; connect-src 'self' https://*.googleapis.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://api.frankfurter.dev https://formsubmit.co; frame-src https://hrntrack-1cfe3.firebaseapp.com https://accounts.google.com; object-src 'none'; base-uri 'self'; form-action 'self' https://formsubmit.co";

function page(f, i, list) {
    const id = String(f.ID);
    const secret = isSecret(f);
    const kind = figureKind(f.Serie);
    const c = cote(f);
    const hist = history && history.items ? history.items[id] : null;
    const tr = c > 0 ? trendOf(hist, c) : null;
    const months = Math.max(1, ((history && history.months) || []).length - 1);
    const owned = rarity && rarity.owned && rarity.owned[id] != null ? Number(rarity.owned[id]) : null;
    const wanted = rarity && rarity.wanted && rarity.wanted[id] != null ? Number(rarity.wanted[id]) : null;
    const secrets = list.filter(isSecret).length;
    const url = urlOf(f);
    const kindLabel = kind === 'serie' ? T.tagSerie : kind === 'special' ? T.tagSpecial : T.tagAccessory;

    const title = `${f.Name} (${f.Serie}) – cote et prix Hirono | HRNtrack`;
    const desc = `${f.Name}, ${kind === 'serie' ? 'figurine Hirono de la série ' + f.Serie : 'édition Hirono ' + f.Serie}${secret ? ' (secrète)' : ''}. `
        + (c > 0 ? `Cote actuelle : ${eur(c)}. ` : '')
        + `Évolution de la cote, rareté et toute la série sur HRNtrack.`;
    const about = aboutText(T, { name: f.Name, serie: f.Serie, secret, kind, count: list.length, secrets });

    const prev = list[i - 1], next = list[i + 1];
    const pagerLink = (g, dir) => g ? `<a class="${dir}" href="${figureHref(slugs.get(String(g.ID)))}" data-dir="${dir}" rel="${dir}">
                ${dir === 'prev' ? `<img src="${esc(imgPath(g))}" alt="" loading="lazy" decoding="async">` : ''}<span><small data-t="${dir}">${dir === 'prev' ? T.prev : T.next}</small><strong>${esc(g.Name)}</strong></span>${dir === 'next' ? `<img src="${esc(imgPath(g))}" alt="" loading="lazy" decoding="async">` : ''}
            </a>` : '';

    const serieHref = 'dashboard.html?serie=' + encodeURIComponent(f.Serie);
    const breadcrumb = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'HRNtrack', item: SITE },
        { '@type': 'ListItem', position: 2, name: T.crumbCollection, item: SITE + 'dashboard.html' },
        { '@type': 'ListItem', position: 3, name: f.Serie, item: SITE + serieHref },
        { '@type': 'ListItem', position: 4, name: f.Name, item: url }
    ] };
    const arrow = (n) => n > 0 ? '<span aria-hidden="true">▲ </span>' : n < 0 ? '<span aria-hidden="true">▼ </span>' : '';
    const speculation = { prefetch: [{ where: { href_matches: '/figurine/*' }, eagerness: 'moderate' }],
        prerender: [{ where: { selector_matches: '.pager a' }, eagerness: 'moderate' }] };

    return `<!DOCTYPE html>
<!-- Page générée par tools/build-figures.mjs : ne pas modifier à la main (relancer le script). -->
<html lang="fr" data-page="figurine" data-fig="${esc(id)}">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="${CSP}">
    <base href="/">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <script src="assets/theme.js"></script>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}">
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="HRNtrack">
    <meta property="og:title" content="${esc(f.Name + ' – ' + f.Serie + ' | HRNtrack')}">
    <meta property="og:description" content="${esc(desc)}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${esc(imgAbs(f))}">
    <meta property="og:image:alt" content="${esc(f.Name)}">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:image" content="${esc(imgAbs(f))}">
    <script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>
    <link rel="icon" type="image/png" href="assets/img/favicon.png">
    <link rel="manifest" href="manifest.webmanifest">
    <link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
    <meta name="theme-color" content="#F5F5F0" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="#161615" media="(prefers-color-scheme: dark)">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-title" content="HRNtrack">
    <link rel="preload" href="assets/fonts/poppins-400-latin.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="assets/fonts/poppins-700-latin.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="assets/fonts.css">
    <link rel="stylesheet" href="assets/common.css">
    <link rel="stylesheet" href="assets/figure.css?v=${dataVersion}">
    <link rel="preload" as="image" href="${esc(imgPath(f))}" fetchpriority="high">
    <link rel="expect" href="#fig-hero" blocking="render">
    <script>
        // Sens de la transition (précédente / suivante) entre deux fiches
        (function () {
            function dir() { try { return sessionStorage.getItem('hrn-dir') || ''; } catch (e) { return ''; } }
            // Une transition annulée (rechargement, page déjà affichée) rejette « ready » : sans gravité
            function quiet(vt) { if (vt) { vt.ready.catch(function () {}); vt.finished.catch(function () {}); } }
            addEventListener('pageswap', function (e) { quiet(e.viewTransition); if (e.viewTransition && dir()) e.viewTransition.types.add(dir()); });
            addEventListener('pagereveal', function (e) {
                var d = dir();
                quiet(e.viewTransition);
                if (e.viewTransition && d) e.viewTransition.types.add(d);
                try { sessionStorage.removeItem('hrn-dir'); } catch (err) { /* stockage indisponible */ }
            });
            document.addEventListener('click', function (e) {
                var a = e.target.closest && e.target.closest('a[href]');
                if (!a) return;
                try { sessionStorage.setItem('hrn-dir', a.dataset.dir || ''); } catch (err) { /* stockage indisponible */ }
            }, true);
        })();
    </script>
    <script type="speculationrules">${JSON.stringify(speculation)}</script>
</head>
<body>

    <script src="assets/header.js" data-active="dashboard"></script>

    <main class="fig-wrap" id="main">
        <nav aria-label="${T.crumbsAria}" data-t-aria="crumbsAria"><ol class="crumbs">
            <li><a href="index.html" data-t="crumbHome">${T.crumbHome}</a></li>
            <li><a href="dashboard.html" data-t="crumbCollection">${T.crumbCollection}</a></li>
            <li><a href="${esc(serieHref)}">${esc(f.Serie)}</a></li>
            <li><span aria-current="page">${esc(f.Name)}</span></li>
        </ol></nav>

        <section class="fig-hero" id="fig-hero">
            <figure class="fig-photo">
                <img src="${esc(imgPath(f))}" alt="${esc(f.Name)}" fetchpriority="high" decoding="async" width="600" height="600">
                <figcaption><span>Hirono</span><span>${esc(id)}</span></figcaption>
            </figure>
            <div>
                <p class="fig-kicker">${esc(f.Serie)}</p>
                <h1 class="fig-title">${esc(f.Name)}</h1>
                <ul class="fig-tags">
                    <li data-t="${kind === 'serie' ? 'tagSerie' : kind === 'special' ? 'tagSpecial' : 'tagAccessory'}">${kindLabel}</li>
                    ${secret ? `<li class="is-secret" data-t="tagSecret">${T.tagSecret}</li>` : ''}
                    <li>POP MART</li>
                </ul>
                <div class="fig-cote">
                    <span class="lbl" data-t="coteLabel">${T.coteLabel}</span>
                    <div class="val${c > 0 ? '' : ' none'}" id="cote-val">${c > 0
                        ? `<span>${eur(c)}</span>` + (tr === null ? '' : `<span class="trend ${tr > 0 ? 'up' : tr < 0 ? 'down' : 'flat'}">${arrow(tr)}${fill(T.trend, { s: tr > 0 ? '+' : '', n: tr, m: months })}</span>`)
                        : T.coteNone}</div>
                    <p class="hint" data-t="coteHint">${T.coteHint}</p>
                </div>
                <div class="fig-rarity" id="rarity">${owned === null && wanted === null ? `<p class="hint">${T.rarityNone}</p>` :
                    (owned !== null ? `<div class="meter owned"><span>${fill(T.ownedBy, { p: String(owned).replace('.', ',') })}</span><i aria-hidden="true" style="--p:${Math.min(100, owned)}%"></i></div>` : '') +
                    (wanted !== null ? `<div class="meter wanted"><span>${fill(T.wantedBy, { p: String(wanted).replace('.', ',') })}</span><i aria-hidden="true" style="--p:${Math.min(100, wanted)}%"></i></div>` : '')}</div>
                <!-- Connecté : « Ma collection » (statut, quantité, prix…) rempli par assets/figure-page.js -->
                <section class="fig-mine" id="mine" aria-labelledby="h-mine" hidden></section>
                <div class="fig-actions">
                    <a class="btn" id="btn-add" href="dashboard.html?focus=${encodeURIComponent(id)}" data-t="btnAdd">${T.btnAdd}</a>
                    <a class="btn ghost" href="echanges.html" data-t="btnTrade">${T.btnTrade}</a>
                    <button type="button" class="btn ghost" id="btn-share" data-t="btnShare">${T.btnShare}</button>
                </div>
            </div>
        </section>

        <div class="pager">${pagerLink(prev, 'prev')}${pagerLink(next, 'next')}</div>

        <div class="two">
            <section class="block" aria-labelledby="h-hist">
                <h2 id="h-hist"><span data-t="histTitle">${T.histTitle}</span> <small data-t="histSub">${T.histSub}</small></h2>
                <div id="chart"><p class="chart-empty" data-t="histNone">${T.histNone}</p></div>
            </section>
            <section class="block" aria-labelledby="h-about">
                <h2 id="h-about" data-t="aboutTitle">${T.aboutTitle}</h2>
                <p id="about">${esc(about)}</p>
                <p class="note" data-t="method">${T.method}</p>
            </section>
        </div>

        <section class="block" aria-labelledby="h-series">
            <h2 id="h-series"><span><span data-t="seriesTitle">${T.seriesTitle}</span> · ${esc(f.Serie)}</span> <small><span id="series-sum">${fill(T.seriesSum, { n: list.length, k: secrets })}</span> <span id="series-avg"></span></small></h2>
            <p class="series-open"><a href="${esc(serieHref)}" data-t="seriesOpen">${T.seriesOpen}</a></p>
            <ul class="series-grid">
${list.map(g => {
    const gc = cote(g);
    return `                <li><a href="${figureHref(slugs.get(String(g.ID)))}" data-id="${esc(g.ID)}"${g === f ? ' aria-current="page"' : ''}>
                    <img src="${esc(imgPath(g))}" alt="" loading="lazy" decoding="async" width="120" height="120">
                    <strong>${isSecret(g) ? `<span class="star" aria-hidden="true">★</span> <span class="sr-only" data-t="secretSr">${T.secretSr}</span> ` : ''}${esc(g.Name)}</strong><small>${gc > 0 ? eur(gc) : T.noCote}</small>
                </a></li>`;
}).join('\n')}
            </ul>
        </section>
    </main>

    <!-- MODAL D'AUTHENTIFICATION -->
    <dialog id="auth-modal" class="modal-overlay hrn-dialog" aria-labelledby="auth-modal-title">
        <form class="modal-content" style="text-align:center; max-width:440px;" id="auth-form" method="post" onsubmit="event.preventDefault(); window.handleLogin();">
            <div class="auth-title" id="auth-modal-title" data-t="authLogin">Connexion</div>
            <p style="color:var(--color-text-sub); font-size:13px; margin-bottom:20px;" data-t="authDesc">Sauvegardez votre collection dans le cloud.</p>
            <label for="auth-email" class="sr-only" data-t="lblEmail">Email</label>
            <input type="email" id="auth-email" name="email" autocomplete="username" spellcheck="false" required placeholder="Email" style="margin-bottom:12px;">
            <label for="auth-pass" class="sr-only" data-t="lblPassword">Mot de passe</label>
            <input type="password" id="auth-pass" name="password" autocomplete="current-password" required placeholder="Mot de passe" style="margin-bottom:12px;">
            <div style="text-align: right; margin-bottom: 15px;">
                <button type="button" class="btn-cancel" style="display:inline; padding:0; margin:0; width:auto; font-size:11px;" onclick="window.handleResetPassword()" data-t="btnForgot">Mot de passe oublié ?</button>
            </div>
            <p class="dialog-msg" role="status" aria-live="polite"></p>
            <button type="submit" class="btn-save" data-t="btnLogin">Se connecter</button>
            <div class="auth-separator">OU</div>
            <button type="button" class="btn-save" onclick="window.handleGoogleLogin()" style="background:var(--surface); color:var(--text-main); border:1px solid var(--color-border); margin-bottom: 12px; display: flex; align-items: center; justify-content: center; gap: 10px;">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style="width:18px; height:18px;" alt="Google">
                <span data-t="btnGoogle">Continuer avec Google</span>
            </button>
            <button type="button" class="btn-save" onclick="window.handleRegister()" style="background:var(--surface); color:var(--text-main); border:1px solid var(--color-border);" data-t="btnRegister">Créer un compte (Email)</button>
            <button type="button" class="btn-cancel" onclick="window.toggleAuthModal()" data-t="btnCancel">Annuler</button>
        </form>
    </dialog>

    <div id="footer-placeholder"></div>

    <script src="assets/site.js"></script>
    <script type="module" src="assets/figure-page.js?v=${dataVersion}"></script>
</body>
</html>
`;
}

// --- Génération ---
fs.mkdirSync(OUT_DIR, { recursive: true });
const bySerie = new Map();
for (const f of baseData) { if (!bySerie.has(f.Serie)) bySerie.set(f.Serie, []); bySerie.get(f.Serie).push(f); }

const oldSitemap = fs.existsSync(path.join(ROOT, 'sitemap.xml')) ? fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8') : '';
const oldDates = new Map([...oldSitemap.matchAll(/<loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g)].map(m => [m[1], m[2]]));

const written = new Set();
let created = 0, updated = 0, same = 0;
const figureUrls = [];
for (const [, list] of bySerie) {
    list.forEach((f, i) => {
        const file = slugs.get(String(f.ID)) + '.html';
        const html = page(f, i, list).replace(/\n/g, '\r\n');
        const p = path.join(OUT_DIR, file);
        const before = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
        if (before === html) same++;
        else { fs.writeFileSync(p, html); before === null ? created++ : updated++; }
        written.add(file);
        const url = urlOf(f);
        figureUrls.push({ url, lastmod: before === html ? (oldDates.get(url) || today) : today });
    });
}
// Fiches dont la figurine n'existe plus (ou a changé de nom) : supprimées
const removed = fs.readdirSync(OUT_DIR).filter(n => n.endsWith('.html') && !written.has(n));
for (const n of removed) fs.unlinkSync(path.join(OUT_DIR, n));

// --- sitemap.xml : pages publiques + fiches ---
const STATIC = ['', 'marche.html', 'nouveautes.html', 'echanges.html', 'releases.html', 'donateurs.html', 'contact.html', 'privacy.html'];
const entries = STATIC.map(p => ({ url: SITE + p, lastmod: oldDates.get(SITE + p) || today })).concat(figureUrls);
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\r\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\r\n'
    + entries.map(e => `  <url><loc>${e.url}</loc><lastmod>${e.lastmod}</lastmod></url>`).join('\r\n') + '\r\n</urlset>\r\n';
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);

console.log(`Fiches : ${created} créées, ${updated} mises à jour, ${same} inchangées, ${removed.length} supprimées${removed.length ? ' (' + removed.join(', ') + ')' : ''}.`);
console.log(`Cotes : ${community ? 'lues' : 'INDISPONIBLES (fiches sans cote)'} · rareté : ${rarity ? 'lue' : 'non publiée'} · data.js?v=${dataVersion}`);
console.log(`sitemap.xml : ${entries.length} adresses.`);
