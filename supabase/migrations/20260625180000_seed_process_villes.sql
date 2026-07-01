-- ============================================================
--  Seed des listes fixes : process_etapes (3) + villes_carte (6)
--  Valeurs extraites de index.html (section #process + carte SVG #hero).
--  Idempotent : n'insere que si la table est vide (re-execution sans doublon).
-- ============================================================

-- ---------- process_etapes (3 etapes, liste fixe) ----------
insert into public.process_etapes (numero, titre, description, ordre)
select v.numero, v.titre, v.description, v.ordre
from (values
  ('1', 'On échange',          'Vous décrivez votre besoin par téléphone ou via le formulaire. On vous rappelle avec une première orientation claire.', 0),
  ('2', 'Devis gratuit',       'On évalue le chantier sur place si besoin, puis on vous remet un devis détaillé et sans surprise.',                      1),
  ('3', 'Intervention soignée','On réalise le travail proprement, dans les délais convenus, et on vous explique tout avant de partir.',                 2)
) as v(numero, titre, description, ordre)
where not exists (select 1 from public.process_etapes);

-- ---------- villes_carte (6 villes, liste fixe) ----------
-- style_point : 'main' = anneau + gros point | 'ping' = anneau + point | 'simple' = point seul
insert into public.villes_carte (nom, style_point, svg_label_x, svg_label_y, svg_dot_cx, svg_dot_cy, text_anchor, ordre)
select v.nom, v.style_point, v.lx, v.ly, v.cx, v.cy, v.anchor, v.ordre
from (values
  ('Toulon',     'main',   228.9, 741.4, 212.9, 735.4, 'start', 0),
  ('La Seyne',   'simple', 163.7, 783.5, 177.7, 761.5, 'end',   1),
  ('Hyères',     'ping',   385.9, 757.3, 369.9, 739.3, 'start', 2),
  ('Brignoles',  'simple', 333.7, 438.3, 317.7, 432.3, 'start', 3),
  ('Draguignan', 'ping',   650.3, 293.1, 634.3, 287.1, 'start', 4),
  ('Fréjus',     'simple', 862.0, 408.7, 846.0, 402.7, 'start', 5)
) as v(nom, style_point, lx, ly, cx, cy, anchor, ordre)
where not exists (select 1 from public.villes_carte);
