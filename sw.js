// HRNtrack — service worker (application installable + mode hors ligne).
// Stratégies :
//  - pages, scripts, styles, data.js : RÉSEAU D'ABORD (toujours la dernière version en ligne), copie en cache pour le hors-ligne ;
//  - images et polices : CACHE D'ABORD puis mise à jour en arrière-plan ;
//  - Firebase, Google, statistiques : jamais interceptés (Firestore a son propre cache hors ligne).
// Changer VERSION quand la liste PRECACHE change : les anciens caches sont alors supprimés.
const VERSION = 'v3';
const CODE = 'hrn-code-' + VERSION;
const MEDIA = 'hrn-media-' + VERSION;
const MEDIA_MAX = 600;   // nombre maximum d'images gardées

const PRECACHE = [
    '/', '/index.html', '/dashboard.html', '/nouveautes.html', '/statistiques.html', '/releases.html',
    '/share.html', '/echanges.html', '/compte.html', '/privacy.html', '/contact.html', '/donateurs.html', '/offline.html', '/footer.html',
    '/manifest.webmanifest',
    '/assets/common.css', '/assets/fonts.css', '/assets/theme.js', '/assets/site.js', '/assets/header.js',
    '/assets/firebase.js', '/assets/db.js', '/assets/auth.js', '/assets/i18n.js', '/assets/activity.js',
    '/assets/collection-stats.js', '/assets/public-profile.js', '/assets/search.js', '/assets/cote-chart.js', '/assets/story.js', '/assets/trade.js', '/assets/socials.js',
    '/assets/fonts/poppins-400-latin.woff2', '/assets/fonts/poppins-500-latin.woff2', '/assets/fonts/poppins-600-latin.woff2',
    '/assets/fonts/poppins-700-latin.woff2', '/assets/fonts/poppins-800-latin.woff2',
    '/assets/img/logo-blanc.png', '/assets/img/favicon.png', '/assets/img/icon-192.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CODE);
        // Un fichier manquant ne doit pas bloquer l'installation : on les ajoute un par un
        await Promise.all(PRECACHE.map(url => cache.add(new Request(url, { cache: 'reload' })).catch(() => {})));
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keep = [CODE, MEDIA];
        for (const key of await caches.keys()) if (!keep.includes(key)) await caches.delete(key);
        await self.clients.claim();
    })());
});

async function trimMedia() {
    const cache = await caches.open(MEDIA);
    const keys = await cache.keys();
    for (let i = 0; i < keys.length - MEDIA_MAX; i++) await cache.delete(keys[i]);
}

// Réseau d'abord ; hors ligne : la copie en cache, puis la page « hors ligne » pour une navigation
async function networkFirst(request, isPage) {
    const cache = await caches.open(CODE);
    try {
        const res = await fetch(request);
        if (res.ok && res.type === 'basic') cache.put(request, res.clone());
        return res;
    } catch (e) {
        const hit = await cache.match(request) || (isPage && await cache.match(request, { ignoreSearch: true }));
        if (hit) return hit;
        if (isPage) return (await cache.match('/offline.html')) || Response.error();
        return Response.error();
    }
}

// Cache d'abord, mise à jour en arrière-plan
async function staleWhileRevalidate(request, fetchUrl) {
    const cache = await caches.open(MEDIA);
    const hit = await cache.match(request);
    const update = fetch(fetchUrl || request).then(res => {
        if (res.ok) { cache.put(request, res.clone()); trimMedia(); }
        return res;
    }).catch(() => null);
    return hit || (await update) || Response.error();
}

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);

    // Images du catalogue écrites en https://hrntrack.app/image/… : servies depuis l'origine du site
    // (évite la redirection 301 vers www et permet de les garder hors ligne)
    if (url.hostname === 'hrntrack.app' && url.pathname.startsWith('/image/') && self.location.hostname !== 'hrntrack.app') {
        const local = new URL(url.pathname, self.location.origin).href;
        event.respondWith(staleWhileRevalidate(new Request(local), local));
        return;
    }
    if (url.origin !== self.location.origin) return;   // Firebase, Google, CDN : non interceptés
    if (url.pathname.startsWith('/admin')) return;       // page admin : toujours en direct

    if (req.mode === 'navigate') { event.respondWith(networkFirst(req, true)); return; }
    if (/\.(png|jpe?g|webp|gif|svg|ico|woff2?)$/i.test(url.pathname)) { event.respondWith(staleWhileRevalidate(req)); return; }
    event.respondWith(networkFirst(req, false));
});
