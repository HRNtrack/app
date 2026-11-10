// HRNtrack — script commun (chargé en script classique, avant les modules de la page) :
// menu mobile, bannière cookies et Google Analytics.
(function () {
    const GA_ID = 'G-RFP1HDMW49';

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

    function readConsent() {
        try { return localStorage.getItem('cookieConsent'); } catch (e) { return null; }
    }

    window.handleCookie = function (accept) {
        try { localStorage.setItem('cookieConsent', accept ? 'true' : 'false'); } catch (e) { /* stockage indisponible */ }
        if (accept) loadAnalytics();
        const banner = document.getElementById('cookie-banner');
        if (banner) banner.style.display = 'none';
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
