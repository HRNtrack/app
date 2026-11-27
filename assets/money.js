// HRNtrack — devise d'affichage des prix selon la langue du site.
// Les données restent TOUJOURS en euros (cotes, dépenses, budget) ; seul l'affichage est converti.
//   anglais → dollars US ; autres langues → euros.
// Taux : BCE du jour (assets/admin-stats.js → fetchRates), gardé 7 jours dans le navigateur pour un affichage
// immédiat ; sans réseau, taux de secours.
import { fetchRates, FALLBACK_RATES } from './admin-stats.js';

const DISPLAY_CURRENCY = { en: 'USD' };
const CACHE_KEY = 'HRN_FX';
const CACHE_DAYS = 7;

let eurPer = { ...FALLBACK_RATES };          // 1 unité de devise = X €
try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (c && c.rates && Date.now() - c.t < CACHE_DAYS * 864e5) eurPer = { ...eurPer, ...c.rates };
} catch (e) { /* stockage indisponible : taux de secours */ }

export const displayCurrency = (lang) => DISPLAY_CURRENCY[lang] || 'EUR';
export const currencySymbol = (lang) => (displayCurrency(lang) === 'USD' ? '$' : '€');

let pending = null;
/** Récupère le taux du jour (une fois par page). Résout à true si l'affichage doit être recalculé. */
export function refreshRates(lang) {
    if (displayCurrency(lang) === 'EUR') return Promise.resolve(false);
    if (!pending) pending = fetchRates().then(r => {
        if (!r.live) return false;
        eurPer = { ...eurPer, ...r.rates };
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), rates: r.rates })); } catch (e) { /* stockage indisponible */ }
        return true;
    });
    return pending;
}

/** Montant en euros → montant dans la devise d'affichage */
export function fromEur(eur, lang) {
    const cur = displayCurrency(lang);
    return cur === 'EUR' ? eur : eur / (eurPer[cur] || 1);
}
/** Montant saisi dans la devise d'affichage → euros (pour enregistrer) */
export function toEur(amount, lang) {
    const cur = displayCurrency(lang);
    return cur === 'EUR' ? amount : amount * (eurPer[cur] || 1);
}

/**
 * Formate un montant donné en euros, dans la devise de la langue.
 * @param {number} eur  montant en euros
 * @param {string} lang langue du site
 * @param {string} locale format des nombres (window.HRN_LOCALES[lang])
 */
export function formatMoney(eur, lang, locale, digits = 0) {
    const cur = displayCurrency(lang);
    // « $45 » plutôt que « US$45 » (format britannique) : les dollars s'écrivent au format américain
    const loc = cur === 'USD' ? 'en-US' : (locale || 'fr-FR');
    return fromEur(Number(eur) || 0, lang).toLocaleString(loc, { style: 'currency', currency: cur, minimumFractionDigits: digits, maximumFractionDigits: digits });
}
