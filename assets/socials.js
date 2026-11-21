// HRNtrack — réseaux sociaux affichés dans la bourse aux échanges (un champ par réseau dans Mon compte).
// Fonctions pures + petit rendu HTML : utilisé par compte.html (formulaire) et echanges.html (logos cliquables).

const svg = (d) => `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;

// url : lien vers le profil (null = pas d'adresse publique : on copie le pseudo à la place)
export const NETWORKS = [
    { id: 'instagram', label: 'Instagram', color: '#E1306C', placeholder: '@pseudo', icon: svg("M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"), url: (h) => 'https://www.instagram.com/' + encodeURIComponent(h) + '/' },
    { id: 'tiktok', label: 'TikTok', color: '#111111', placeholder: '@pseudo', icon: svg("M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"), url: (h) => 'https://www.tiktok.com/@' + encodeURIComponent(h) },
    { id: 'discord', label: 'Discord', color: '#5865F2', placeholder: 'pseudo', icon: svg("M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 13.46 13.46 0 0 0-.59 1.227 18.324 18.324 0 0 0-7.398 0c-.191-.424-.399-.83-.594-1.227a.072.072 0 0 0-.079-.037A19.736 19.736 0 0 0 1.685 4.37a.068.068 0 0 0-.03.078c-2.096 7.974-.08 14.82 2.766 18.995a.074.074 0 0 0 .077.025 20.077 20.077 0 0 0 6.075-3.058.077.077 0 0 0 .023-.119 14.07 14.07 0 0 1-2.029-1.558.075.075 0 0 1 .015-.125c.196-.094.39-.193.579-.297a.074.074 0 0 1 .078-.008c4.276 1.948 8.89 1.948 13.116 0a.073.073 0 0 1 .078.008c.191.104.385.203.581.297a.075.075 0 0 1 .015.125 14.28 14.28 0 0 1-2.028 1.558.076.076 0 0 0 .023.119 20.024 20.024 0 0 0 6.078 3.058.075.075 0 0 0 .077-.025c2.908-4.305 4.793-11.021 2.709-18.994a.068.068 0 0 0-.03-.078z"), url: null },
    { id: 'facebook', label: 'Facebook', color: '#1877F2', placeholder: 'nom.du.profil', icon: svg("M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"), url: (h) => 'https://www.facebook.com/' + encodeURIComponent(h) },
    { id: 'x', label: 'X (Twitter)', color: '#111111', placeholder: '@pseudo', icon: svg("M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"), url: (h) => 'https://x.com/' + encodeURIComponent(h) },
    { id: 'vinted', label: 'Vinted', color: '#09B1BA', placeholder: 'pseudo', icon: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><text x="12" y="17.5" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="17" font-weight="800" fill="currentColor">V</text></svg>', url: null }
];
const BY_ID = new Map(NETWORKS.map(n => [n.id, n]));

/**
 * Nettoie ce que la personne a tapé : retire @, espaces, et extrait le pseudo d'une adresse collée
 * (ex. « https://www.instagram.com/hirono.fan/ » → « hirono.fan »). Renvoie '' si rien d'utilisable.
 */
export function normalizeHandle(network, raw) {
    let h = String(raw ?? '').trim();
    if (!h) return '';
    const url = h.match(/^(?:https?:\/\/)?(?:www\.|m\.|vm\.)?[a-z0-9.-]+\.[a-z]{2,}\/(.+)$/i);
    if (url) h = url[1].replace(/^(?:@|member\/|profile\.php\?id=)/i, '').split(/[/?#]/)[0];
    h = h.replace(/^@+/, '').replace(/\s+/g, '');
    // Caractères des pseudos des réseaux (Discord autorise aussi « # » pour les anciens pseudos)
    h = h.replace(/[^\p{L}\p{N}._#-]/gu, '');
    return h.slice(0, 40);
}

/** { instagram: '…', … } propre et dans l'ordre de NETWORKS (les réseaux vides sont omis). */
export function cleanContacts(input) {
    const out = {};
    if (!input || typeof input !== 'object') return out;
    for (const n of NETWORKS) {
        const h = normalizeHandle(n.id, input[n.id]);
        if (h) out[n.id] = h;
    }
    return out;
}

/** Réseaux renseignés : [{ network, handle, href|null }]. Accepte l'ancien contact texte (affiché tel quel). */
export function contactEntries(contact) {
    if (typeof contact === 'string') return contact.trim() ? [{ network: null, handle: contact.trim().slice(0, 80), href: null }] : [];
    const c = cleanContacts(contact);
    return Object.entries(c).map(([id, handle]) => {
        const n = BY_ID.get(id);
        return { network: n, handle, href: n.url ? n.url(handle) : null };
    });
}

/** Pastilles cliquables avec logo (lien vers le profil, ou bouton qui copie le pseudo). */
export function contactChipsHtml(contact, esc) {
    return contactEntries(contact).map(({ network: n, handle, href }) => {
        const label = n ? n.label : 'Contact';
        const icon = n ? n.icon : '💬';
        const style = n ? ` style="--net:${n.color}"` : '';
        const shown = (n && (n.id === 'instagram' || n.id === 'tiktok' || n.id === 'x') ? '@' : '') + handle;
        const inner = `<span class="net-ico">${icon}</span><span class="net-handle">${esc(shown)}</span>`;
        return href
            ? `<a class="net-chip" href="${esc(href)}" target="_blank" rel="noopener noreferrer"${style} title="${esc(label)} : ${esc(shown)}" aria-label="${esc(label)} : ${esc(shown)}">${inner}</a>`
            : `<button type="button" class="net-chip" data-copy="${esc(handle)}" data-net="${esc(label)}"${style} title="${esc(label)} : ${esc(shown)}" aria-label="${esc(label)} : ${esc(shown)}">${inner}</button>`;
    }).join('');
}
