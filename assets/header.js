// HRNtrack — en-tête commun (barre de navigation + tiroir mobile).
// Utilisation, juste après <body> :
//   <script src="assets/header.js" data-active="dashboard"></script>
// Options : data-active = page à souligner (index, dashboard, statistiques, donateurs, contact)
//           data-auth-label = clé de traduction du bouton compte (par défaut "authLogin")
// Le script est synchrone : le menu existe déjà quand les scripts de la page s'exécutent.
(function () {
    const script = document.currentScript;
    const active = script.dataset.active || '';
    const authLabelKey = script.dataset.authLabel || 'authLogin';
    const authLabel = authLabelKey === 'navAccount' ? 'Mon Compte' : 'Connexion';

    const links = [
        { page: 'index', key: 'navHome', label: 'Accueil' },
        { page: 'dashboard', key: 'navCollection', label: 'Collection' },
        { page: 'statistiques', key: 'navStats', label: 'Stats' },
        { page: 'echanges', key: 'navTrade', label: 'Échanges' },
        { page: 'marche', key: 'navMarket', label: 'Marché' },
        { page: 'contact', key: 'navContact', label: 'Contact' }
    ];
    const navLinks = links.map(l =>
        `<a href="${l.page}.html" class="nav-link${l.page === active ? ' active' : ''}"><span data-t="${l.key}">${l.label}</span></a>`
    ).join('\n');

    const langToggle = (suffix) => `
        <button type="button" class="lang-toggle" onclick="window.toggleLanguage()" aria-label="Changer de langue / Switch language">
            <span class="lang-option active" id="lang-fr${suffix}">FR</span>
            <span class="lang-option" id="lang-en${suffix}">EN</span>
        </button>`;

    const supportLink = `
        <a href="https://ko-fi.com/hrntrack" target="_blank" rel="noopener" class="btn-auth-trigger" style="text-decoration:none;">
            <span data-t="navSupport">Soutenir</span>
        </a>`;

    // Bouton clair / sombre (géré par assets/theme.js) : lune en mode clair, soleil en mode sombre
    const themeToggle = `
        <button type="button" class="theme-toggle" onclick="window.toggleTheme && window.toggleTheme()" aria-label="Mode sombre / Dark mode">
            <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path></svg>
        </button>`;

    // Recherche globale (Ctrl + K) : la fenêtre est créée par assets/site.js
    const searchButton = `
        <button type="button" class="theme-toggle search-trigger" onclick="window.openGlobalSearch && window.openGlobalSearch()" aria-label="Rechercher une figurine (Ctrl + K)" title="Rechercher une figurine (Ctrl + K)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
        </button>`;

    script.insertAdjacentHTML('beforebegin', `
    <nav class="top-nav" aria-label="Navigation principale">
        <div class="nav-logo-group">
            <a href="index.html" aria-label="HRNtrack Accueil" style="text-decoration:none; display:flex; align-items:center;">
                <img src="assets/img/logo-blanc.png" class="site-logo" alt="HRNtrack Logo" width="400" height="400">
            </a>
        </div>

        <div class="nav-center">
            ${navLinks}
        </div>

        <div class="nav-right">
            ${supportLink}
            ${searchButton}
            ${themeToggle}
            ${langToggle('')}
            <button id="auth-trigger" class="btn-auth-trigger" onclick="window.toggleAuthModal()">
                <span id="auth-status-text" data-t="${authLabelKey}">${authLabel}</span>
            </button>
        </div>

        <button type="button" class="mobile-menu-btn" onclick="window.toggleMobileMenu()" aria-label="Menu" aria-controls="mobile-drawer" aria-expanded="false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
        </button>
    </nav>

    <div class="mobile-drawer" id="mobile-drawer">
        ${navLinks}
        <div class="mobile-actions">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.82rem; font-weight:600; text-transform:uppercase; color:var(--color-text-sub);">Langue / Language</span>
                ${langToggle('-mob')}
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.82rem; font-weight:600; text-transform:uppercase; color:var(--color-text-sub);">Thème / Theme</span>
                ${themeToggle}
            </div>
            <button type="button" class="btn-auth-trigger" onclick="window.toggleMobileMenu(false); window.openGlobalSearch && window.openGlobalSearch();"><span data-t="searchOpen">🔎 Rechercher une figurine</span></button>
            ${supportLink}
            <button type="button" class="btn-auth-trigger pwa-install" hidden onclick="window.installApp(); window.toggleMobileMenu();">
                <span data-t="installApp">📲 Installer l'appli</span>
            </button>
            <button id="auth-trigger-mob" class="btn-auth-trigger" onclick="window.toggleAuthModal(); window.toggleMobileMenu();">
                <span id="auth-status-text-mob" data-t="${authLabelKey}">${authLabel}</span>
            </button>
        </div>
    </div>`);
})();
