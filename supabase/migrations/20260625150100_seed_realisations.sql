-- ============================================================
--  Seed des 6 realisations actuelles (depuis index.html #work + pmDescs main.js)
--  photo_path = chemin asset local pour l'instant ; les futurs uploads iront dans Storage.
--  N'insere que si la table est vide (idempotent).
-- ============================================================
insert into public.realisations (titre, categorie, photo_path, photo_alt, localisation, description, ordre, visible)
select v.titre, v.categorie, v.photo_path, v.photo_alt, v.localisation, v.description, v.ordre, true
from (values
  ($txt$Rénovation de douche$txt$,      'plomberie',     'assets/photos/douche-avant-apres.jpg', $txt$Rénovation de douche — chantier Ploméo dans le Var$txt$,      'Var (83)', $txt$Réseaux propres et fiables, finitions soignées, du dépannage à la rénovation complète, jusque dans les détails qu'on ne voit plus une fois le chantier fini.$txt$, 1),
  ($txt$Salle de bain complète$txt$,     'plomberie',     'assets/photos/salle-de-bain.jpg',      $txt$Salle de bain complète — chantier Ploméo dans le Var$txt$,     'Var (83)', $txt$Réseaux propres et fiables, finitions soignées, du dépannage à la rénovation complète, jusque dans les détails qu'on ne voit plus une fois le chantier fini.$txt$, 2),
  ($txt$Piscine & local technique$txt$,  'piscine',       'assets/photos/piscine.jpg',            $txt$Piscine et local technique — chantier Ploméo dans le Var$txt$, 'Var (83)', $txt$Local technique, raccordements et mise en service de la partie hydraulique, avec des réglages clairs pour un entretien facile au fil des saisons.$txt$, 3),
  ($txt$Pompe à chaleur$txt$,            'chauffage',     'assets/photos/pompe-a-chaleur.jpg',    $txt$Pompe à chaleur — chantier Ploméo dans le Var$txt$,           'Var (83)', $txt$Installation et mise en service d'une solution performante, dimensionnée selon le logement, avec une régulation simple à piloter au quotidien.$txt$, 4),
  ($txt$Climatisation gainable$txt$,     'climatisation', 'assets/photos/climatisation.jpg',      $txt$Climatisation gainable — chantier Ploméo dans le Var$txt$,    'Var (83)', $txt$Une climatisation discrète et silencieuse, posée dans les règles. On vous explique le fonctionnement et l'entretien avant de partir.$txt$, 5),
  ($txt$Salle de bain travertin$txt$,    'plomberie',     'assets/photos/sdb-jacuzzi.jpg',        $txt$Salle de bain travertin — chantier Ploméo dans le Var$txt$,   'Var (83)', $txt$Réseaux propres et fiables, finitions soignées, du dépannage à la rénovation complète, jusque dans les détails qu'on ne voit plus une fois le chantier fini.$txt$, 6)
) as v(titre, categorie, photo_path, photo_alt, localisation, description, ordre)
where not exists (select 1 from public.realisations);
