-- ============================================================
--  Seed des communes desservies (section .zone__communes) depuis index.html.
--  N'insere que si la table est vide (idempotent).
-- ============================================================
insert into public.communes (nom, ordre)
select v.nom, v.ordre
from (values
  ('Toulon', 0),
  ('La Seyne-sur-Mer', 1),
  ('Hyères', 2),
  ('Fréjus', 3),
  ('Draguignan', 4),
  ('Brignoles', 5),
  ('La Valette', 6),
  ('Six-Fours', 7)
) as v(nom, ordre)
where not exists (select 1 from public.communes);
