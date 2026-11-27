// HRNtrack — adresse de la fiche publique de chaque figurine (/figurine/<slug>.html).
// Fonctions pures, partagées par le générateur (tools/build-figures.mjs) et le site (page Marché…).
// L'adresse dépend du nom, de la série et de l'ordre du catalogue : une figurine ajoutée plus tard
// ne change jamais l'adresse des figurines existantes.

export function slugify(text) {
    return String(text || '')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')   // accents
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/** @returns {Map<string, string>} ID → slug (sans « .html »), unique sur tout le catalogue */
export function figureSlugs(catalog) {
    const used = new Set();
    const out = new Map();
    for (const f of catalog) {
        const name = slugify(f.Name) || slugify(f.ID);
        const serie = slugify(f.Serie);
        let slug = serie && !name.includes(serie) ? `${name}-${serie}` : name;
        if (used.has(slug) && String(f['Secret Rare']).toLowerCase() === 'yes') slug += '-secret';
        if (used.has(slug)) slug += '-' + slugify(f.ID);
        let n = 2;
        while (used.has(slug)) slug = `${slug}-${n++}`;
        used.add(slug);
        out.set(String(f.ID), slug);
    }
    return out;
}

/** Adresse relative à la racine du site (les fiches ont <base href="/">). */
export const figureHref = (slug) => `figurine/${slug}.html`;
