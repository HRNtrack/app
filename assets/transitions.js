// HRNtrack — navigation fluide entre les listes (Collection, Nouveautés, Marché, Statistiques) et les fiches figurines.
// À inclure dans le <head> (script classique, synchrone) : les écouteurs pageswap / pagereveal doivent exister
// avant le premier affichage. Tout est une amélioration progressive : sans prise en charge, navigation normale.
//  1. Transitions entre pages (@view-transition), sauf si l'appareil demande moins d'animations.
//  2. La photo de la carte cliquée « vole » vers la grande photo de la fiche (nom partagé : fig-photo),
//     et revient vers sa carte au retour si la liste est déjà affichée (cache du navigateur).
//  3. Préchargement des fiches au survol (ou à l'appui sur mobile) : speculation rules.
(function () {
    // 1. Activation des transitions (même règle que assets/figure.css, sur les pages de liste)
    var css = document.createElement('style');
    css.textContent = '@view-transition { navigation: auto; }' +
        '@media (prefers-reduced-motion: reduce) { @view-transition { navigation: none; } }' +
        '.top-nav { view-transition-name: top-nav; }' +
        '::view-transition-group(fig-photo) { animation-duration: 0.35s; animation-timing-function: cubic-bezier(.2,.7,.2,1); }';
    document.head.appendChild(css);

    function quiet(vt) { if (vt) { vt.ready.catch(function () {}); vt.finished.catch(function () {}); } }
    function samePath(a, b) {
        try { return decodeURIComponent(new URL(a, location.href).pathname) === decodeURIComponent(new URL(b, location.href).pathname); }
        catch (e) { return false; }
    }
    /** Image de la carte qui mène à cette fiche (lien de carte ou vignette) */
    function cardImageFor(url) {
        var links = document.querySelectorAll('a[href*="figurine/"]');
        for (var i = 0; i < links.length; i++) {
            if (!samePath(links[i].href, url)) continue;
            var card = links[i].closest('.card, .row, .rare-card, .journal-fig, .top-list-item') || links[i];
            var img = card.querySelector('img');
            if (img && img.getBoundingClientRect().height > 0) return img;
        }
        return null;
    }
    function nameFor(img, vt) {
        if (!img || !vt) return;
        img.style.viewTransitionName = 'fig-photo';
        // Le nom est retiré à la fin (sinon il gênerait la prochaine navigation et le cache du navigateur)
        vt.finished.finally(function () { img.style.viewTransitionName = ''; }).catch(function () {});
    }

    // 2a. On part vers une fiche : la photo de la carte cliquée devient « fig-photo »
    window.addEventListener('pageswap', function (e) {
        quiet(e.viewTransition);
        if (!e.viewTransition || !e.activation || !e.activation.entry) return;
        var url = e.activation.entry.url;
        if (!/\/figurine\//.test(url)) return;
        nameFor(cardImageFor(url), e.viewTransition);
    });

    // 2b. On revient d'une fiche : si la liste est déjà prête (cache du navigateur), la photo rejoint sa carte ;
    //     sinon (page encore vide, en cours de chargement), pas de transition plutôt qu'un fondu vers une page blanche.
    window.addEventListener('pagereveal', function (e) {
        quiet(e.viewTransition);
        if (!e.viewTransition) return;
        var body = document.body;
        var ready = body && getComputedStyle(body).opacity !== '0';
        if (!ready) { e.viewTransition.skipTransition(); return; }
        var from = window.navigation && navigation.activation && navigation.activation.from;
        if (from && /\/figurine\//.test(from.url)) nameFor(cardImageFor(from.url), e.viewTransition);
    });

    // 3. Préchargement des fiches (survol ~200 ms, ou appui sur mobile)
    if (HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')) {
        var rules = document.createElement('script');
        rules.type = 'speculationrules';
        rules.textContent = JSON.stringify({ prefetch: [{ where: { href_matches: '/figurine/*' }, eagerness: 'moderate' }] });
        document.head.appendChild(rules);
    }
})();
