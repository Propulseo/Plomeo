-- ============================================================
--  Seed des 4 expertises (section #pil) depuis index.html.
--  N'insere que si la table est vide (idempotent).
-- ============================================================
insert into public.piliers (categorie, numero, titre, description, image_path, image_alt, icone_path, points, cta_texte, cta_lien, ordre, visible)
select v.categorie, v.numero, v.titre, v.description, v.image_path, v.image_alt, v.icone_path, v.points, v.cta_texte, v.cta_lien, v.ordre, true
from (values
  ('plomberie','01',$t$Plomberie$t$,
    $t$De l'installation complète à la rénovation, des réseaux propres et fiables, jusque dans les détails qu'on ne voit plus une fois le chantier fini.$t$,
    'assets/photos/sdb-jacuzzi.jpg','Plomberie','/assets/icons/plomberie-icone.svg',
    $j$["Installation sanitaire complète","Rénovation de salle de bain","Dépannage & recherche de fuite"]$j$::jsonb,
    'Demander un devis','#contact',1),
  ('chauffage','02',$t$Chauffage$t$,
    $t$Pompes à chaleur, chaudières et plancher chauffant, dimensionnés selon votre logement, avec une régulation simple à piloter au quotidien.$t$,
    'assets/photos/pompe-a-chaleur.jpg','Chauffage','/assets/icons/chauffage-icone.svg',
    $j$["Pompes à chaleur","Plancher chauffant","Mise en service & entretien"]$j$::jsonb,
    'Demander un devis','#contact',2),
  ('climatisation','03',$t$Climatisation$t$,
    $t$Gainable ou split, discret et silencieux. Partenaire Mitsubishi pour la climatisation. On vous explique le fonctionnement et l'entretien.$t$,
    'assets/photos/climatisation.jpg','Climatisation','/assets/icons/climatisation-icone.svg',
    $j$["Climatisation réversible","Systèmes gainables","Entretien préventif"]$j$::jsonb,
    'Demander un devis','#contact',3),
  ('piscine','04',$t$Piscine$t$,
    $t$Local technique, raccordements et mise en service de la partie hydraulique, avec des réglages clairs pour un entretien facile au fil des saisons.$t$,
    'assets/photos/piscine-2.jpg','Piscine','/assets/icons/piscine-icone.svg',
    $j$["Local technique & raccordements","Mise en service","Contrôle & entretien"]$j$::jsonb,
    'Demander un devis','#contact',4)
) as v(categorie,numero,titre,description,image_path,image_alt,icone_path,points,cta_texte,cta_lien,ordre)
where not exists (select 1 from public.piliers);
