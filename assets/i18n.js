// HRNtrack — textes communs à toutes les pages (menu, connexion, footer, cookies).
// Chaque page fusionne ce dictionnaire avec le sien via withCommon() ;
// une clé définie par la page remplace la valeur commune.
export const commonTranslations = {
    fr: {
        // Menu
        navHome: "Accueil",
        navCollection: "Collection",
        navStats: "Stats",
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
        cookieText: "Nous utilisons Google Analytics pour améliorer le site anonymement. C'est OK pour vous ?",
        cookieDecline: "Non merci",
        cookieAccept: "Accepter"
    },
    en: {
        // Menu
        navHome: "Home",
        navCollection: "Collection",
        navStats: "Stats",
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
        cookieText: "We use Google Analytics to silently improve the website. Is it OK for you?",
        cookieDecline: "No thanks",
        cookieAccept: "Accept"
    }
};

/** Met en surbrillance FR ou EN dans les sélecteurs de langue (en-tête + menu mobile). */
export function syncLangToggle(lang) {
    // Langue déclarée de la page : utilisée par les lecteurs d'écran et la traduction automatique
    document.documentElement.lang = lang === 'en' ? 'en' : 'fr';
    for (const suffix of ['', '-mob']) {
        const fr = document.getElementById('lang-fr' + suffix);
        const en = document.getElementById('lang-en' + suffix);
        if (fr) fr.classList.toggle('active', lang === 'fr');
        if (en) en.classList.toggle('active', lang !== 'fr');
    }
}

/** Fusionne les textes communs avec ceux propres à la page. */
export function withCommon(pageTranslations) {
    const out = {};
    for (const lang of Object.keys(commonTranslations)) {
        out[lang] = { ...commonTranslations[lang], ...(pageTranslations[lang] || {}) };
    }
    return out;
}
