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
        { page: 'donateurs', key: 'navDonors', label: 'Dons' },
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

    script.insertAdjacentHTML('beforebegin', `
    <nav class="top-nav" aria-label="Navigation principale">
        <div class="nav-logo-group">
            <a href="index.html" aria-label="HRNtrack Accueil" style="text-decoration:none; display:flex; align-items:center;">
                <img src="https://i.postimg.cc/yNdVZYsy/logo1-blanc.png" class="site-logo" alt="HRNtrack Logo">
            </a>
        </div>

        <div class="nav-center">
            ${navLinks}
        </div>

        <div class="nav-right">
            ${supportLink}
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
            ${supportLink}
            <button id="auth-trigger-mob" class="btn-auth-trigger" onclick="window.toggleAuthModal(); window.toggleMobileMenu();">
                <span id="auth-status-text-mob" data-t="${authLabelKey}">${authLabel}</span>
            </button>
        </div>
    </div>`);
})();
