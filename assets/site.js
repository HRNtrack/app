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
})();
