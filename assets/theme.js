// HRNtrack — mode clair / sombre.
// Chargé dans le <head> (script classique, synchrone) pour appliquer le thème AVANT l'affichage, sans flash.
// Par défaut : suit le réglage du système. Un clic sur le bouton fixe le choix (mémorisé sur l'appareil).
(function () {
    var KEY = 'HRN_THEME';
    var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    function stored() {
        try { return localStorage.getItem(KEY); } catch (e) { return null; }
    }
    function current() {
        var s = stored();
        if (s === 'dark' || s === 'light') return s;
        return media && media.matches ? 'dark' : 'light';
    }

    function syncButtons(theme) {
        var label = theme === 'dark' ? 'Passer en mode clair / Switch to light mode' : 'Passer en mode sombre / Switch to dark mode';
        var buttons = document.querySelectorAll('.theme-toggle');
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].setAttribute('aria-label', label);
            buttons[i].setAttribute('title', label);
            buttons[i].setAttribute('aria-pressed', String(theme === 'dark'));
        }
    }

    // Couleurs des graphiques Chart.js (axes, légendes, grilles) selon le thème
    function syncCharts(theme) {
        if (!window.Chart || !window.Chart.defaults) return;
        var dark = theme === 'dark';
        window.Chart.defaults.color = dark ? '#A8A49B' : '#666666';
        window.Chart.defaults.borderColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
        if (window.Chart.instances) {
            Object.values(window.Chart.instances).forEach(function (c) { try { c.update('none'); } catch (e) {} });
        }
    }

    function apply(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        var metas = document.querySelectorAll('meta[name="theme-color"]');
        for (var m = 0; m < metas.length; m++) metas[m].setAttribute('content', theme === 'dark' ? '#161615' : '#F5F5F0');
        syncButtons(theme);
        syncCharts(theme);
        // Prévient les pages (ex. admin) pour qu'elles redessinent leurs graphiques
        document.dispatchEvent(new CustomEvent('hrn:themechange', { detail: theme }));
    }

    window.toggleTheme = function () {
        var next = current() === 'dark' ? 'light' : 'dark';
        var system = media && media.matches ? 'dark' : 'light';
        try {
            // Même thème que le système : on efface le choix pour suivre à nouveau le système ;
            // sinon on le mémorise tel quel (et on le garde même si le système change ensuite).
            if (next === system) localStorage.removeItem(KEY); else localStorage.setItem(KEY, next);
        } catch (e) { /* stockage indisponible : le thème s'applique quand même */ }
        apply(next);
    };
    // Choix fait dans un autre onglet : on suit
    window.addEventListener('storage', function (e) { if (e.key === KEY) apply(current()); });

    // Le système change de thème (ex. passage en mode nuit) : on suit, sauf si un choix a été fait
    if (media) {
        var onChange = function () { if (!stored()) apply(current()); };
        if (media.addEventListener) media.addEventListener('change', onChange); else if (media.addListener) media.addListener(onChange);
    }

    apply(current());
    document.addEventListener('DOMContentLoaded', function () { apply(current()); });
})();
