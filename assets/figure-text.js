// HRNtrack — textes des fiches figurines (fr / en). Partagés par le générateur (texte vu par Google, en français)
// et par la page (assets/figure-page.js). es / de / zh : assets/lang/*.js → pages.figurine.
export const FIG_TEXT = {
    fr: {
        crumbHome: "Accueil", crumbMarket: "Marché", crumbCollection: "Collection", crumbsAria: "Fil d'Ariane",
        seriesOpen: "Voir la série dans ma collection →", secretSr: "Secrète :",
        tagSecret: "★ Secrète", tagSerie: "Série", tagSpecial: "Édition spéciale", tagAccessory: "Accessoire",
        coteLabel: "Cote actuelle", coteNone: "Pas encore de cote",
        coteHint: "Prix médian payé par les collectionneurs HRNtrack, en euros.",
        trend: "{s}{n} % sur {m} mois",
        ownedBy: "Possédée par {p} % des collectionneurs", wantedBy: "Recherchée par {p} % des collectionneurs",
        rarityNone: "La rareté de cette figurine n'est pas encore connue.",
        btnAdd: "Ajouter à ma collection", btnTrade: "Trouver un échange", btnShare: "Partager",
        copied: "Lien copié !", copyPrompt: "Copiez ce lien :",
        histTitle: "Évolution de la cote", histSub: "6 derniers mois",
        histNone: "Pas encore assez d'achats datés pour tracer l'évolution de cette figurine.",
        seriesTitle: "Toute la série", seriesSum: "{n} figurines · {k} secrète(s)", seriesAvg: "Cote moyenne : {c}",
        noCote: "pas de cote", prev: "Précédente", next: "Suivante",
        aboutTitle: "À propos",
        aboutSerie: "{name} est une figurine Hirono{secret} de la série {serie}, éditée par POP MART. La série compte {n} figurines, dont {k} secrète(s). Avec HRNtrack, ajoutez-la à votre collection ou à votre wishlist, suivez sa cote calculée par la communauté et trouvez des collectionneurs pour l'échanger.",
        aboutSpecial: "{name} est une édition Hirono de la catégorie {serie}{secret}, éditée par POP MART. Avec HRNtrack, ajoutez-la à votre collection ou à votre wishlist, suivez sa cote calculée par la communauté et trouvez des collectionneurs pour l'échanger.",
        secretWord: " secrète", secretSpecial: " (version secrète)",
        method: "Cote : prix médian payé par les collectionneurs HRNtrack qui ont renseigné un prix, hors valeurs aberrantes, converti en euros. Rareté : part des collectionneurs HRNtrack qui possèdent ou recherchent la figurine. Aucune donnée personnelle n'est publiée."
    },
    en: {
        crumbHome: "Home", crumbMarket: "Market", crumbCollection: "Collection", crumbsAria: "Breadcrumb",
        seriesOpen: "See the series in my collection →", secretSr: "Secret:",
        tagSecret: "★ Secret", tagSerie: "Series", tagSpecial: "Special edition", tagAccessory: "Accessory",
        coteLabel: "Current value", coteNone: "No value yet",
        coteHint: "Median price paid by HRNtrack collectors, in US dollars at today's rate.",
        trend: "{s}{n}% over {m} months",
        ownedBy: "Owned by {p}% of collectors", wantedBy: "Wanted by {p}% of collectors",
        rarityNone: "This figure's rarity isn't known yet.",
        btnAdd: "Add to my collection", btnTrade: "Find a trade", btnShare: "Share",
        copied: "Link copied!", copyPrompt: "Copy this link:",
        histTitle: "Value over time", histSub: "last 6 months",
        histNone: "Not enough dated purchases yet to chart this figure.",
        seriesTitle: "The whole series", seriesSum: "{n} figures · {k} secret(s)", seriesAvg: "Average value: {c}",
        noCote: "no value", prev: "Previous", next: "Next",
        aboutTitle: "About",
        aboutSerie: "{name} is a{secret} Hirono figure from the {serie} series by POP MART. The series has {n} figures, including {k} secret(s). With HRNtrack, add it to your collection or wishlist, follow its community market value and find collectors to trade with.",
        aboutSpecial: "{name} is a Hirono edition from the {serie} category{secret}, by POP MART. With HRNtrack, add it to your collection or wishlist, follow its community market value and find collectors to trade with.",
        secretWord: " secret", secretSpecial: " (secret version)",
        method: "Value: median price paid by HRNtrack collectors who entered a price, outliers excluded, converted to US dollars. Rarity: share of HRNtrack collectors who own or want the figure. No personal data is published."
    }
};

/** Type d'une figurine : vraie série, édition spéciale / limitée, ou accessoire */
export function figureKind(serie) {
    if (/^accessor/i.test(serie)) return 'accessory';
    if (/^(special|limited)\b/i.test(serie)) return 'special';
    return 'serie';
}

/** Remplit un modèle « {clé} » */
export const fill = (tpl, vars) => String(tpl).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

/** Paragraphe « À propos » dans la langue du dictionnaire T */
export function aboutText(T, { name, serie, secret, kind, count, secrets }) {
    if (kind === 'serie') return fill(T.aboutSerie, { name, serie, secret: secret ? T.secretWord : '', n: count, k: secrets });
    return fill(T.aboutSpecial, { name, serie, secret: secret ? T.secretSpecial : '' });
}
