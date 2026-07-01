-- ============================================================
--  Seed des articles (section #blog) depuis index.html.
--  N'insere que si la table est vide (idempotent).
--  lien = '#blog' : pas de page article detaillee (hors perimetre CMS).
-- ============================================================
insert into public.articles (categorie, numero, titre, extrait, meta_lecture, image_path, image_alt, lien, ordre, visible)
select v.categorie, v.numero, v.titre, v.extrait, v.meta_lecture, v.image_path, v.image_alt, v.lien, v.ordre, true
from (values
  ('Plomberie','01',
    $t$Pourquoi une installation bien faite dure vraiment plus longtemps$t$,
    $t$Matériel, pose, finitions : ce qui fait la différence entre une réparation qui tient et une intervention à refaire.$t$,
    '5 min de lecture',
    'https://images.pexels.com/photos/7227624/pexels-photo-7227624.jpeg?auto=compress&cs=tinysrgb&w=800', '',
    '#blog', 0),
  ('Chauffage','02',
    $t$Bien choisir entre pompe à chaleur, chaudière et plancher chauffant$t$,
    $t$Un comparatif simple pour choisir la solution adaptée à votre logement et votre budget.$t$,
    '7 min de lecture',
    'assets/photos/pompe-a-chaleur.jpg', '',
    '#blog', 1),
  ('Climatisation','03',
    $t$Gainable ou split : comment bien rafraîchir sa maison$t$,
    $t$Les options pour rester au frais l'été, discrètement, sans faire exploser sa facture.$t$,
    '6 min de lecture',
    'assets/photos/climatisation.jpg', '',
    '#blog', 2)
) as v(categorie, numero, titre, extrait, meta_lecture, image_path, image_alt, lien, ordre)
where not exists (select 1 from public.articles);
