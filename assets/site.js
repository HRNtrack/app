// HRNtrack — script commun (chargé en script classique, avant les modules de la page) :
// menu mobile, bannière cookies et Google Analytics.
(function () {
    const GA_ID = 'G-RFP1HDMW49';
    const CONSENT_MAX_AGE = 395 * 24 * 3600 * 1000; // 13 mois : durée maximale d'un choix cookies (CNIL)

    // Anti-clickjacking : le site refuse d'être affiché dans le cadre (iframe) d'un autre site
    if (window.top !== window.self) {
        document.documentElement.style.display = 'none';
        try { window.top.location = window.location.href; } catch (e) { /* bloqué par le navigateur */ }
    }

    window.toggleMobileMenu = function (forceOpen) {
        const drawer = document.getElementById('mobile-drawer');
        if (!drawer) return;
        const open = drawer.classList.toggle('open', forceOpen);
        const btn = document.querySelector('.mobile-menu-btn');
        if (btn) btn.setAttribute('aria-expanded', String(open));
    };

    // Touche Échap : ferme la fenêtre ouverte (connexion, fiche…) ou le menu mobile
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        const openModal = [...document.querySelectorAll('.modal-overlay')].find(m => getComputedStyle(m).display !== 'none');
        if (openModal) {
            if (openModal.id === 'auth-modal' && window.toggleAuthModal) window.toggleAuthModal(false);
            else openModal.style.display = 'none';
            return;
        }
        const drawer = document.getElementById('mobile-drawer');
        if (drawer && drawer.classList.contains('open')) {
            window.toggleMobileMenu(false);
            const btn = document.querySelector('.mobile-menu-btn');
            if (btn) btn.focus();
        }
    });

    // Page ouverte par double-clic (file://) : le navigateur bloque les modules JavaScript et Firebase,
    // donc le site ne peut pas fonctionner. On l'affiche tout de suite avec une explication au lieu d'un écran blanc.
    if (location.protocol === 'file:') {
        document.addEventListener('DOMContentLoaded', function () {
            document.body.classList.add('ready', 'auth-ready');
            const box = document.createElement('div');
            box.setAttribute('role', 'alert');
            box.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:5000;max-width:640px;margin:0 auto;' +
                'background:#1A1A1A;color:#F5F5F0;padding:16px 20px;font:14px/1.5 Poppins,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.25)';
            box.innerHTML = '<strong>Le site ne peut pas fonctionner ouvert par double-clic.</strong><br>' +
                'Le navigateur bloque les scripts et la connexion pour les fichiers ouverts depuis le disque. ' +
                'Teste-le en ligne, ou lance un serveur local dans ce dossier : ' +
                '<code style="background:#333;padding:2px 6px">python -m http.server 8000</code> ' +
                'puis ouvre <code style="background:#333;padding:2px 6px">http://localhost:8000/dashboard.html</code>';
            document.body.appendChild(box);
        });
    }

    // Filet de sécurité : les pages restent invisibles (opacity 0) tant que Firebase n'a pas répondu.
    // Si Firebase ne charge pas (réseau, bloqueur…), on affiche quand même la page après 4 s.
    setTimeout(function () {
        if (!document.body) return;
        document.body.classList.add('ready', 'auth-ready');
    }, 4000);

    function loadAnalytics() {
        if (document.querySelector(`script[src*="${GA_ID}"]`)) return;
        const script = document.createElement('script');
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
        script.async = true;
        document.head.appendChild(script);
        window.dataLayer = window.dataLayer || [];
        function gtag() { window.dataLayer.push(arguments); }
        gtag('js', new Date());
        gtag('config', GA_ID);
    }

    // Choix mémorisé 13 mois au plus ; au-delà (ou sans date), on redemande.
    function readConsent() {
        try {
            const v = localStorage.getItem('cookieConsent');
            const at = Number(localStorage.getItem('cookieConsentAt'));
            if (v === null) return null;
            if (!at || Date.now() - at > CONSENT_MAX_AGE) {
                localStorage.removeItem('cookieConsent');
                localStorage.removeItem('cookieConsentAt');
                return null;
            }
            return v;
        } catch (e) { return null; }
    }

    // Retrait du consentement : coupe Google Analytics et efface ses cookies (_ga…)
    function stopAnalytics() {
        window['ga-disable-' + GA_ID] = true;
        const host = location.hostname, parts = host.split('.');
        const domains = ['', host, '.' + host, parts.length > 1 ? '.' + parts.slice(-2).join('.') : ''];
        document.cookie.split(';').map(c => c.split('=')[0].trim()).filter(n => /^_ga|^_gid/.test(n)).forEach(name => {
            domains.forEach(d => { document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : ''); });
        });
    }

    window.handleCookie = function (accept) {
        try {
            localStorage.setItem('cookieConsent', accept ? 'true' : 'false');
            localStorage.setItem('cookieConsentAt', String(Date.now()));
        } catch (e) { /* stockage indisponible */ }
        if (accept) { window['ga-disable-' + GA_ID] = false; loadAnalytics(); }
        else stopAnalytics();
        const banner = document.getElementById('cookie-banner');
        if (banner) banner.style.display = 'none';
    };

    // Lien « Gérer les cookies » (footer, page Mentions légales) : rouvre la bannière
    window.openCookieSettings = function () {
        const banner = document.getElementById('cookie-banner');
        if (!banner) return;
        banner.style.display = 'block';
        const btn = banner.querySelector('.btn-accept');
        if (btn) btn.focus();
    };

    // Appelée une fois le footer (qui contient la bannière) injecté dans la page.
    window.initCookieLogic = function () {
        if (window.initInstallButtons) window.initInstallButtons();
        const consent = readConsent();
        const banner = document.getElementById('cookie-banner');
        if (consent === 'true') {
            loadAnalytics();
            if (banner) banner.style.display = 'none';
        } else if (consent === null) {
            if (banner) banner.style.display = 'block';
        } else if (banner) {
            banner.style.display = 'none';
        }
    };

    // --- MESSAGES À L'ÉCRAN (remplacent les alert() du navigateur) ---
    // hrnNotify(message, type?, { flash: true } ?) — type : 'success' | 'error' | 'info' (deviné si absent).
    // flash : le message est gardé pour la page suivante (utile juste avant une redirection).
    function guessType(msg) {
        if (/erreur|error|impossible|incorrect|invalide|invalid|échec|failed|obligatoire|required/i.test(msg)) return 'error';
        if (/succès|success|mis à jour|updated|copié|copied|envoy|sent|créé|created|supprimé|deleted|merci|thank/i.test(msg)) return 'success';
        return 'info';
    }
    function notifyStyles() {
        if (document.getElementById('hrn-notify-style')) return;
        const st = document.createElement('style');
        st.id = 'hrn-notify-style';
        st.textContent =
            '#hrn-notify{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:5000;display:flex;flex-direction:column;gap:8px;width:min(440px,calc(100vw - 32px));pointer-events:none}' +
            '.hrn-note{pointer-events:auto;display:flex;align-items:flex-start;gap:10px;background:var(--color-dark,#1A1A1A);color:var(--color-light,#F5F5F0);border-left:4px solid #9CA3AF;padding:12px 14px;box-shadow:0 10px 30px rgba(0,0,0,.25);font:500 .84rem/1.45 var(--font-sans,sans-serif);white-space:pre-line;word-break:break-word;animation:hrnIn .2s ease}' +
            '.hrn-note.success{border-left-color:#6A8C47}.hrn-note.error{border-left-color:#C0392B}' +
            '.hrn-note .ico{font-weight:800;flex:0 0 auto}.hrn-note .txt{flex:1}' +
            '.hrn-note button{background:none;border:0;color:inherit;opacity:.7;cursor:pointer;font-size:15px;line-height:1;padding:2px 4px}.hrn-note button:hover{opacity:1}' +
            '@keyframes hrnIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}';
        document.head.appendChild(st);
    }
    window.hrnNotify = function (message, type, opts) {
        const msg = String(message == null ? '' : message);
        type = type || guessType(msg);
        if (opts && opts.flash) {
            try { sessionStorage.setItem('hrnFlash', JSON.stringify({ msg: msg, type: type })); } catch (e) { /* stockage indisponible */ }
            return;
        }
        if (!document.body) { document.addEventListener('DOMContentLoaded', function () { window.hrnNotify(msg, type); }); return; }
        notifyStyles();
        let box = document.getElementById('hrn-notify');
        if (!box) {
            box = document.createElement('div');
            box.id = 'hrn-notify';
            box.setAttribute('aria-live', 'polite');
            document.body.appendChild(box);
        }
        const note = document.createElement('div');
        note.className = 'hrn-note ' + type;
        note.setAttribute('role', type === 'error' ? 'alert' : 'status');
        const ico = document.createElement('span'); ico.className = 'ico'; ico.textContent = type === 'success' ? '✓' : type === 'error' ? '!' : 'i';
        const txt = document.createElement('span'); txt.className = 'txt'; txt.textContent = msg;
        const close = document.createElement('button'); close.type = 'button'; close.setAttribute('aria-label', 'Fermer'); close.textContent = '✕';
        close.onclick = function () { note.remove(); };
        note.append(ico, txt, close);
        box.appendChild(note);
        while (box.children.length > 3) box.firstChild.remove();
        setTimeout(function () { note.remove(); }, type === 'error' ? 8000 : 4500);
    };
    // Message laissé par la page précédente (ex. « Compte supprimé » avant le retour à l'accueil)
    document.addEventListener('DOMContentLoaded', function () {
        try {
            const f = sessionStorage.getItem('hrnFlash');
            if (f) { sessionStorage.removeItem('hrnFlash'); const o = JSON.parse(f); window.hrnNotify(o.msg, o.type); }
        } catch (e) { /* rien */ }
    });

    // --- APPLICATION INSTALLABLE (PWA) ---
    const isEn = function () { try { return localStorage.getItem('HRN_LANG') === 'en'; } catch (e) { return false; } };
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
        window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () { /* sans PWA */ }); });
    }
    let installPrompt = null;
    const isStandalone = function () { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; };
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    function refreshInstallButtons() {
        const show = !isStandalone() && (!!installPrompt || isIos);
        document.querySelectorAll('.pwa-install').forEach(function (el) { el.hidden = !show; });
    }
    window.initInstallButtons = refreshInstallButtons;
    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installPrompt = e; refreshInstallButtons(); });
    window.addEventListener('appinstalled', function () {
        installPrompt = null; refreshInstallButtons();
        window.hrnNotify(isEn() ? 'HRNtrack is installed! Find it on your home screen.' : 'HRNtrack est installé ! Retrouvez-le sur votre écran d\'accueil.', 'success');
    });
    window.installApp = async function () {
        if (installPrompt) {
            installPrompt.prompt();
            try { await installPrompt.userChoice; } catch (e) { /* fermé */ }
            installPrompt = null; refreshInstallButtons();
        } else if (isIos) {
            window.hrnNotify(isEn()
                ? 'On iPhone / iPad: tap the Share button (square with an arrow) in Safari, then « Add to Home Screen ».'
                : 'Sur iPhone / iPad : touchez le bouton Partager (carré avec une flèche) dans Safari, puis « Sur l\'écran d\'accueil ».', 'info');
        }
    };
    document.addEventListener('DOMContentLoaded', refreshInstallButtons);

    // Hors ligne : on prévient que les données peuvent dater
    window.addEventListener('offline', function () {
        window.hrnNotify(isEn() ? 'You are offline: data shown may not be up to date.' : 'Vous êtes hors ligne : les données affichées peuvent ne pas être à jour.', 'info');
    });
    window.addEventListener('online', function () { window.hrnNotify(isEn() ? 'Back online.' : 'De retour en ligne.', 'success'); });
    document.addEventListener('DOMContentLoaded', function () {
        if (navigator.onLine === false) window.hrnNotify(isEn() ? 'You are offline: data shown may not be up to date.' : 'Vous êtes hors ligne : les données affichées peuvent ne pas être à jour.', 'info');
    });
})();
