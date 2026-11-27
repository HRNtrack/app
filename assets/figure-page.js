// HRNtrack — script des fiches figurines (/figurine/*.html).
// La page arrive déjà remplie (générée par tools/build-figures.mjs, en français, avec la cote du jour de la génération).
// Ce script : traduit la page, met la cote / la rareté / le graphique à jour en direct, gère le partage et la connexion.
import { db } from './db.js';
import { withCommon, syncLangToggle } from './i18n.js';
import { auth, setupAuthModal, updateAuthButtons, updateAuthLabel } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { coteValue, trendOf } from './market.js';
import { coteChartSvg } from './cote-chart.js';
import { FIG_TEXT, figureKind, fill, aboutText } from './figure-text.js';

// Même version de data.js que la page (le générateur écrit figure-page.js?v=<version de data.js>)
const dataVersion = new URL(import.meta.url).searchParams.get('v') || '';
const { baseData } = await import('../data.js' + (dataVersion ? '?v=' + dataVersion : ''));

const translations = withCommon(FIG_TEXT);
const currentLang = (() => { try { return localStorage.getItem('HRN_LANG') || 'fr'; } catch (e) { return 'fr'; } })();
const T = translations[currentLang] || translations.fr;
const t = (k) => T[k] ?? translations.fr[k] ?? k;
const loc = () => (window.HRN_LOCALES && window.HRN_LOCALES[currentLang]) || 'fr-FR';
const eur = (n) => (n || 0).toLocaleString(loc(), { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
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

setupAuthModal(() => currentLang);
onAuthStateChanged(auth, (user) => { updateAuthButtons(!!user); updateAuthLabel(T); });

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
