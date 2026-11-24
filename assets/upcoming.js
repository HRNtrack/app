// HRNtrack — calendrier des sorties Hirono À VENIR (section « À venir » de la page Nouveautés).
// À tenir à jour à chaque annonce de POP MART : n'ajouter QUE des sorties officiellement annoncées.
// Une sortie dont le mois est passé disparaît toute seule de la page ; elle peut ensuite être retirée d'ici.
//
// Champs :
//   name   : nom de la série ou de l'édition (obligatoire)
//   date   : 'AAAA-MM' (mois seulement) ou 'AAAA-MM-JJ' (jour précis)       (obligatoire)
//   type   : 'serie' | 'special' | 'collab' | 'autre'                       (facultatif, 'serie' par défaut)
//   note   : précision courte, ex. « 12 figurines + 1 secrète »            (facultatif, en français)
//   noteEn : la même précision en anglais                                   (facultatif)
//   image  : adresse d'une image (https://…)                                (facultatif)
//   link   : adresse de l'annonce officielle (https://…)                    (facultatif)
export const UPCOMING = [
    // Exemple :
    // { name: 'Hirono Nouvelle Série', date: '2027-01', type: 'serie', note: '12 figurines + 1 secrète', noteEn: '12 figures + 1 secret', link: 'https://…' },
    { name: 'Hirono Between Places', date: '2026-11-27', type: 'serie' },
];
