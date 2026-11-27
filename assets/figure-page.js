// HRNtrack — script des fiches figurines (/figurine/*.html).
// La page arrive déjà remplie (générée par tools/build-figures.mjs, en français, avec la cote du jour de la génération).
// Ce script : traduit la page, met la cote / la rareté / le graphique à jour en direct, gère le partage et la connexion.
import { db } from './db.js';
import { withCommon, syncLangToggle } from './i18n.js';
import { auth, setupAuthModal, updateAuthButtons, updateAuthLabel } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { syncPublicProfile } from './public-profile.js';
import { coteValue, trendOf } from './market.js';
import { coteChartSvg } from './cote-chart.js';
import { FIG_TEXT, figureKind, fill, aboutText } from './figure-text.js';
import { formatMoney, refreshRates, displayCurrency } from './money.js';

// Même version de data.js que la page (le générateur écrit figure-page.js?v=<version de data.js>)
const dataVersion = new URL(import.meta.url).searchParams.get('v') || '';
const { baseData } = await import('../data.js' + (dataVersion ? '?v=' + dataVersion : ''));

const translations = withCommon(FIG_TEXT);
const currentLang = (() => { try { return localStorage.getItem('HRN_LANG') || 'fr'; } catch (e) { return 'fr'; } })();
const T = translations[currentLang] || translations.fr;
const t = (k) => T[k] ?? translations.fr[k] ?? k;
const loc = () => (window.HRN_LOCALES && window.HRN_LOCALES[currentLang]) || 'fr-FR';
// Cotes en euros affichées dans la devise de la langue (anglais → dollars US, voir assets/money.js)
const eur = (n) => formatMoney(n || 0, currentLang, loc());
const num = (n) => Number(n).toLocaleString(loc());
const $ = (id) => document.getElementById(id);

const figId = document.documentElement.dataset.fig;
const fig = baseData.find(f => String(f.ID) === figId);
const serieItems = fig ? baseData.filter(f => f.Serie === fig.Serie) : [];
const isSecret = (f) => String(f['Secret Rare']).toLowerCase() === 'yes';
let market = { community: null, history: null, rarity: null };

function renderCote() {
    if (!fig) return;
    const { community, history } = market;
    if (!community) return;                                   // on garde la cote écrite dans la page
    const cote = coteValue(community[figId]);
    const box = $('cote-val');
    if (cote > 0) {
        const hist = history && history.items ? history.items[figId] : null;
        const tr = trendOf(hist, cote);
        const months = Math.max(1, ((history && history.months) || []).length - 1);
        box.classList.remove('none');
        box.innerHTML = `<span>${eur(cote)}</span>` + (tr === null ? '' :
            `<span class="trend ${tr > 0 ? 'up' : tr < 0 ? 'down' : 'flat'}">${tr > 0 ? '<span aria-hidden="true">▲ </span>' : tr < 0 ? '<span aria-hidden="true">▼ </span>' : ''}${fill(t('trend'), { s: tr > 0 ? '+' : '', n: num(tr), m: months })}</span>`);
    } else {
        box.classList.add('none');
        box.textContent = t('coteNone');
    }
    // Cotes de la série
    const cotes = [];
    document.querySelectorAll('.series-grid [data-id]').forEach(a => {
        const c = coteValue(community[a.dataset.id]);
        if (c > 0) cotes.push(c);
        const small = a.querySelector('small');
        if (small) small.textContent = c > 0 ? eur(c) : t('noCote');
    });
    $('series-avg').textContent = cotes.length ? fill(t('seriesAvg'), { c: eur(cotes.reduce((a, b) => a + b, 0) / cotes.length) }) : '';
}

function renderChart() {
    const { history, community } = market;
    const box = $('chart');
    if (!history || !history.items) return;
    const months = history.months || [];
    const values = (history.items[figId] || []).slice();
    const cur = coteValue(community && community[figId]);
    if (values.length && cur > 0) values[values.length - 1] = cur;
    const labels = months.map(m => new Date(m + '-01T12:00:00').toLocaleDateString(loc(), { month: 'short' }));
    const svg = values.length ? coteChartSvg(values.map(v => (v == null ? null : Number(v))), labels, { format: eur }) : '';
    box.innerHTML = svg || `<p class="chart-empty">${t('histNone')}</p>`;
}

function renderRarity() {
    const r = market.rarity;
    if (!r) return;
    const owned = r.owned && r.owned[figId] != null ? Number(r.owned[figId]) : null;
    const wanted = r.wanted && r.wanted[figId] != null ? Number(r.wanted[figId]) : null;
    const meter = (cls, label, p) => `<div class="meter ${cls}"><span>${label}</span><i aria-hidden="true" style="--p:${Math.min(100, p)}%"></i></div>`;
    $('rarity').innerHTML = (owned === null && wanted === null) ? `<p class="hint">${t('rarityNone')}</p>` :
        (owned !== null ? meter('owned', fill(t('ownedBy'), { p: num(owned) }), owned) : '') +
        (wanted !== null ? meter('wanted', fill(t('wantedBy'), { p: num(wanted) }), wanted) : '');
}

function updateUIText() {
    syncLangToggle(currentLang);
    if (currentLang !== 'fr') {
        document.querySelectorAll('[data-t]').forEach(el => { const v = T[el.getAttribute('data-t')]; if (v) el.textContent = v; });
        document.querySelectorAll('[data-t-aria]').forEach(el => { const v = T[el.getAttribute('data-t-aria')]; if (v) el.setAttribute('aria-label', v); });
        if (fig) {
            const kind = figureKind(fig.Serie);
            $('about').textContent = aboutText(T, { name: fig.Name, serie: fig.Serie, secret: isSecret(fig), kind, count: serieItems.length, secrets: serieItems.filter(isSecret).length });
            const sum = $('series-sum');
            if (sum) sum.textContent = fill(t('seriesSum'), { n: serieItems.length, k: serieItems.filter(isSecret).length });
        }
    }
    updateAuthLabel(T);
    renderCote(); renderChart(); renderRarity();
}
window.updateUIText = updateUIText;

// Partager : feuille de partage du téléphone, sinon copie du lien
$('btn-share')?.addEventListener('click', async () => {
    const url = location.href.split('#')[0];
    if (navigator.share) { try { await navigator.share({ title: document.title, url }); } catch (e) { /* annulé */ } return; }
    try { await navigator.clipboard.writeText(url); if (window.hrnNotify) window.hrnNotify(t('copied'), 'success'); }
    catch (e) { window.prompt(t('copyPrompt'), url); }
});

// Flèches du clavier : figurine précédente / suivante de la série
document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable], dialog[open]')) return;
    const a = document.querySelector(e.key === 'ArrowLeft' ? '.pager a.prev' : e.key === 'ArrowRight' ? '.pager a.next' : null);
    if (!a) return;
    try { sessionStorage.setItem('hrn-dir', a.dataset.dir); } catch (err) { /* stockage indisponible */ }
    location.href = a.href;
});

// ================================================================
// « MA COLLECTION » : connecté, on modifie la figurine directement ici.
// Même format et même enregistrement que la page Collection : on relit la liste de l'utilisateur
// (users/{uid}.collection), on met à jour CETTE figurine, on enregistre, puis on resynchronise
// la fiche publique (public_profiles) comme après chaque enregistrement de collection.
// ================================================================
const OWNED = 'Possédé', WISH = 'Recherché', NONE = 'No status';
const CONDITIONS = [['Inconnu', 'condUnknown'], ['Neuf', 'condMint'], ['Bon', 'condGood'], ['Moyen', 'condFair'], ['Abimé', 'condDamaged']];
const CURRENCIES = [['EUR', '€'], ['USD', '$'], ['CAD', 'CA$'], ['GBP', '£'], ['CNY', '¥']];
const PRIORITIES = [['', 'prioNone'], ['high', 'prioHigh'], ['medium', 'prioMedium'], ['low', 'prioLow']];
const escH = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const statusOf = (it) => { const s = String((it && it.Status) || '').toLowerCase(); return s === 'possédé' ? OWNED : (s === 'recherché' || s === 'wishlist') ? WISH : NONE; };
let currentUser = null, myItems = [];

function renderMine() {
    const box = $('mine');
    if (!box || !fig) return;
    if (!currentUser) { box.hidden = true; box.innerHTML = ''; return; }
    const it = myItems.find(i => String(i.ID) === figId) || {};
    const st = statusOf(it);
    const opt = (list, val) => list.map(([v, k]) => `<option value="${escH(v)}"${v === val ? ' selected' : ''}>${escH(t(k))}</option>`).join('');
    const cur = it.Currency || displayCurrency(currentLang);
    box.innerHTML = `
        <h2 id="h-mine">${escH(t('mineTitle'))}</h2>
        <form id="mine-form" novalidate>
            <fieldset class="seg">
                <legend class="sr-only">${escH(t('stLegend'))}</legend>
                ${[[NONE, 'stNone'], [OWNED, 'stOwned'], [WISH, 'stWish']].map(([v, k]) =>
                    `<label><input type="radio" name="status" value="${v}"${v === st ? ' checked' : ''}><span>${escH(t(k))}</span></label>`).join('')}
            </fieldset>
            <div class="mine-fields" data-for="${OWNED}">
                <label>${escH(t('lblQty'))}<input type="number" name="qty" min="1" step="1" inputmode="numeric" value="${escH(Math.max(1, parseInt(it.Quantity, 10) || 1))}"></label>
                <label>${escH(t('lblCondition'))}<select name="cond">${opt(CONDITIONS, it.Condition || 'Inconnu')}</select></label>
                <label>${escH(t('lblPrice'))}<span class="price-row"><input type="number" name="price" min="0" step="0.01" inputmode="decimal" value="${Number(it['Purchase price']) > 0 ? escH(it['Purchase price']) : ''}" placeholder="0"><select name="cur" aria-label="${escH(t('lblCurrency'))}">${CURRENCIES.map(([v, s]) => `<option value="${v}"${v === cur ? ' selected' : ''}>${s}</option>`).join('')}</select></span></label>
                <label>${escH(t('lblDate'))}<input type="date" name="date" value="${escH(it['Purchase date'] || '')}"></label>
            </div>
            <div class="mine-fields" data-for="${WISH}">
                <label>${escH(t('lblPriority'))}<select name="prio">${opt(PRIORITIES, it.Priority || '')}</select></label>
            </div>
            <label class="mine-notes">${escH(t('lblNotes'))}<textarea name="note" rows="2" placeholder="${escH(t('notesPh'))}">${escH(it.Note || '')}</textarea></label>
            <div class="mine-foot">
                <button type="submit" class="btn">${escH(t('btnSaveMine'))}</button>
                <a href="dashboard.html?focus=${encodeURIComponent(figId)}">${escH(t('openInCollection'))}</a>
                <p class="mine-msg" role="status" aria-live="polite"></p>
            </div>
        </form>`;
    box.hidden = false;
    const form = $('mine-form');
    const sync = () => {
        const s = form.status.value;
        form.querySelectorAll('.mine-fields').forEach(f => { f.hidden = f.dataset.for !== s; });
    };
    form.addEventListener('change', (e) => { if (e.target.name === 'status') sync(); });
    form.addEventListener('submit', (e) => { e.preventDefault(); saveMine(form); });
    sync();
    // Connecté : le bouton « Ajouter » devient inutile (le panneau le remplace)
    const add = $('btn-add'); if (add) add.hidden = true;
    markSeries();
}

/** Vignettes de la série : ✓ possédée, ♥ wishlist (comme les cartes de la Collection) */
function markSeries() {
    const byId = new Map(myItems.map(i => [String(i.ID), statusOf(i)]));
    document.querySelectorAll('.series-grid [data-id]').forEach(a => {
        const s = currentUser ? byId.get(a.dataset.id) : null;
        a.classList.toggle('owned', s === OWNED);
        a.classList.toggle('wish', s === WISH);
        let tag = a.querySelector('.mine-tag');
        if (s === OWNED || s === WISH) {
            if (!tag) { tag = document.createElement('span'); tag.className = 'mine-tag'; a.appendChild(tag); }
            tag.innerHTML = `<span aria-hidden="true">${s === OWNED ? '✓' : '♥'}</span><span class="sr-only">${escH(t(s === OWNED ? 'mineOwned' : 'mineWish'))}</span>`;
        } else if (tag) tag.remove();
    });
}

async function loadMine(user) {
    try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const data = snap.exists() ? snap.data() : {};
        myItems = Array.isArray(data.collection) ? data.collection : [];
    } catch (e) { myItems = []; }
    renderMine();
}

async function saveMine(form) {
    const btn = form.querySelector('button[type=submit]'), msg = form.querySelector('.mine-msg');
    const status = form.status.value;
    btn.disabled = true; btn.textContent = t('saving'); msg.textContent = '';
    try {
        const price = parseFloat(form.price.value);
        const clean = {
            ID: fig.ID,
            Status: status,
            Condition: status === OWNED ? form.cond.value : (myItems.find(i => String(i.ID) === figId) || {}).Condition || 'Inconnu',
            Quantity: status === OWNED ? Math.max(1, parseInt(form.qty.value, 10) || 1) : 0,   // possédée = au moins 1 exemplaire
            'Purchase price': status === OWNED && price > 0 ? price : 0,
            Currency: form.cur.value || 'EUR',
            'Purchase date': status === OWNED ? (form.date.value || '') : '',
            Note: form.note.value || '',
            Priority: status === WISH ? form.prio.value : ''
        };
        // On relit la liste juste avant d'écrire : une modification faite ailleurs entre-temps n'est pas écrasée
        const ref = doc(db, 'users', currentUser.uid);
        const snap = await getDoc(ref);
        const list = snap.exists() && Array.isArray(snap.data().collection) ? snap.data().collection.slice() : [];
        const idx = list.findIndex(i => String(i.ID) === figId);
        if (idx >= 0) list[idx] = { ...list[idx], ...clean }; else list.push(clean);
        await setDoc(ref, { collection: list }, { merge: true });
        syncPublicProfile(db, currentUser.uid);
        myItems = list;
        markSeries();
        msg.textContent = t('saved');
    } catch (e) {
        console.error('Enregistrement :', e);
        msg.textContent = t('saveErr');
    }
    btn.disabled = false; btn.textContent = t('btnSaveMine');
}

// Déconnecté : « Ajouter à ma collection » ouvre directement la connexion (sans quitter la page)
$('btn-add')?.addEventListener('click', (e) => {
    if (currentUser || !window.toggleAuthModal) return;
    e.preventDefault();
    window.toggleAuthModal();
});

setupAuthModal(() => currentLang);
onAuthStateChanged(auth, (user) => {
    updateAuthButtons(!!user); updateAuthLabel(T);
    currentUser = user || null;
    if (user) loadMine(user); else { myItems = []; renderMine(); markSeries(); const add = $('btn-add'); if (add) add.hidden = false; }
});

fetch('footer.html').then(r => r.text()).then(d => {
    $('footer-placeholder').innerHTML = d;
    if (window.initCookieLogic) window.initCookieLogic();
    updateUIText();
}).catch(e => console.error('Erreur Footer:', e));
updateUIText();

// Cote, historique et rareté en direct (données publiques)
const get = async (id) => { try { const s = await getDoc(doc(db, 'market_prices', id)); return s.exists() ? s.data() : null; } catch (e) { return null; } };
const [community, history, rarity] = await Promise.all([get('community'), get('history'), get('rarity')]);
market = { community, history, rarity };
renderCote(); renderChart(); renderRarity();
if (await refreshRates(currentLang)) { renderCote(); renderChart(); }
