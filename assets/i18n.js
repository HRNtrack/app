// HRNtrack — textes communs à toutes les pages (menu, connexion, footer, cookies).
// Chaque page fusionne ce dictionnaire avec le sien via withCommon() ;
// une clé définie par la page remplace la valeur commune.
export const commonTranslations = {
    fr: {
        // Menu
        navHome: "Accueil",
        navCollection: "Collection",
        navStats: "Stats",
        navTrade: "Échanges",
        navMarket: "Marché",
        searchOpen: "🔎 Rechercher une figurine",
        navDonors: "Dons",
        navContact: "Contact",
        navSupport: "Soutenir",
        navReleases: "Mises à jour",
        // Connexion
        authLogin: "Connexion",
        authAccount: "Mon Compte",
        authDesc: "Sauvegardez votre collection dans le cloud.",
        btnLogin: "Se connecter",
        btnRegister: "Créer un compte (Email)",
        btnCancel: "Annuler",
        btnGoogle: "Continuer avec Google",
        btnForgot: "Mot de passe oublié ?",
        // Footer
        footerDesc: "L'outil de référence pour gérer, estimer et compléter votre collection de figurines Hirono. Fait par un fan, pour les fans.",
        footerNav: "Navigation",
        footerDisclaimer: "Ce site est un projet de fan (Fanmade). Nous ne sommes pas affiliés à POP MART.",
        legalMainTitle: "Mentions Légales",
        footerLegalTitle: "Infos Légales",
        // Cookies
        cookieTitle: "🍪 Cookies ?",
        cookieText: "Nous aimerions utiliser Google Analytics pour mesurer l'audience et améliorer le site. Rien n'est déposé sans votre accord, et vous pouvez changer d'avis à tout moment via « Gérer les cookies ».",
        cookieManage: "Gérer les cookies",
        installApp: "📲 Installer l'appli",
        lblEmail: "Email",
        lblPassword: "Mot de passe",
        cookieDecline: "Non merci",
        cookieAccept: "Accepter"
    },
    en: {
        // Menu
        navHome: "Home",
        navCollection: "Collection",
        navStats: "Stats",
        navTrade: "Trading",
        navMarket: "Market",
        searchOpen: "🔎 Search a figure",
        navDonors: "Donations",
        navContact: "Contact",
        navSupport: "Support",
        navReleases: "Updates",
        // Connexion
        authLogin: "Login",
        authAccount: "My Account",
        authDesc: "Save your collection to the cloud.",
        btnLogin: "Log In",
        btnRegister: "Sign Up (Email)",
        btnCancel: "Cancel",
        btnGoogle: "Continue with Google",
        btnForgot: "Forgot password?",
        // Footer
        footerDesc: "The ultimate tool to manage, estimate and complete your Hirono figure collection.",
        footerNav: "Navigation",
        footerDisclaimer: "This is a fanmade project. Not affiliated with POP MART.",
        legalMainTitle: "Legal Mentions",
        footerLegalTitle: "Legal Info",
        // Cookies
        cookieTitle: "🍪 Cookies ?",
        cookieText: "We would like to use Google Analytics to measure traffic and improve the site. Nothing is stored without your consent, and you can change your mind at any time via “Manage cookies”.",
        cookieManage: "Manage cookies",
        installApp: "📲 Install the app",
        lblEmail: "Email",
        lblPassword: "Password",
        cookieDecline: "No thanks",
        cookieAccept: "Accept"
    }
};

/** Met en surbrillance FR ou EN dans les sélecteurs de langue (en-tête + menu mobile). */
// --- LANGUES DU SITE ---
// fr et en sont écrits dans chaque page ; es, de et zh viennent d'un fichier par langue (assets/lang/xx.js),
// chargé seulement quand cette langue est choisie. Un texte absent d'une traduction s'affiche en anglais.
export const LANGS = ['fr', 'en', 'es', 'de', 'zh'];
export const LOCALES = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES', de: 'de-DE', zh: 'zh-CN' };
const EXTRA_LANGS = ['es', 'de', 'zh'];
export const siteLang = (() => { try { const l = localStorage.getItem('HRN_LANG'); return LANGS.includes(l) ? l : 'fr'; } catch (e) { return 'fr'; } })();
let pack = null;
if (EXTRA_LANGS.includes(siteLang)) {
    try { pack = (await import('./lang/' + siteLang + '.js')).default; } catch (e) { console.warn('Traduction indisponible :', siteLang, e); }
}
globalThis.HRN_PACK = pack;
// Identifiant de la page (nom du fichier sans .html) : choisit la partie « pages » du paquet de traduction
const pageId = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';

export function syncLangToggle(lang) {
    // Langue déclarée de la page : utilisée par les lecteurs d'écran et la traduction automatique
    document.documentElement.lang = LANGS.includes(lang) ? (lang === 'zh' ? 'zh-Hans' : lang) : 'fr';
    document.querySelectorAll('.lang-select').forEach(s => { s.value = LANGS.includes(lang) ? lang : 'fr'; });
}

/** Fusionne les textes communs avec ceux propres à la page ; ajoute es / de / zh (repli : anglais). */
export function withCommon(pageTranslations) {
    const out = {};
    for (const lang of Object.keys(commonTranslations)) {
        out[lang] = { ...commonTranslations[lang], ...(pageTranslations[lang] || {}) };
    }
    for (const lang of EXTRA_LANGS) {
        const own = lang === siteLang && pack ? { ...(pack.common || {}), ...((pack.pages || {})[pageId] || {}) } : {};
        out[lang] = new Proxy(own, {
            get: (t, k) => (k in t ? t[k] : out.en[k]),
            has: (t, k) => k in t || k in out.en
        });
    }
    return out;
}
