-- ============================================================
--  Seed des avis clients (marquee #reaTrack) depuis assets/js/main.js.
--  N'insere que si la table est vide (idempotent).
-- ============================================================
insert into public.avis (texte, auteur, ordre, visible)
select v.texte, v.auteur, v.ordre, true
from (values
  ($t$Travail soigné, propre, dans les délais. Je recommande.$t$, 'François R.', 0),
  ($t$Super plombier, efficace et de bon conseil. Merci !$t$,      'Manon S.',    1),
  ($t$Réponse rapide, prix justes, chantier nickel.$t$,            'Camille L.',  2),
  ($t$Intervention propre, tout bien expliqué.$t$,                 'Karim B.',    3)
) as v(texte, auteur, ordre)
where not exists (select 1 from public.avis);
