-- ============================================================
--  Communes : coordonnées + liste réelle de la zone d'intervention.
--
--  La carte du hero place chaque commune d'après sa position et en déduit son
--  palier de délai depuis sa distance à Toulon. Il faut donc lat/lon en base,
--  sinon la carte et le back-office divergent (une commune ajoutée dans /admin
--  n'apparaîtrait jamais sur la carte).
--
--  Le seed d'origine listait Fréjus, Draguignan et Brignoles : hors de la zone
--  réellement couverte par le client, elles sont retirées ici.
-- ============================================================

alter table public.communes add column if not exists lat double precision;
alter table public.communes add column if not exists lon double precision;

comment on column public.communes.lat is 'Latitude WGS84. Requise pour l''affichage sur la carte.';
comment on column public.communes.lon is 'Longitude WGS84. Requise pour l''affichage sur la carte.';

with reelles(nom, lat, lon, ordre) as (values
  ('Toulon',                 43.1258, 5.9304,  0),
  ('La Valette-du-Var',      43.1372, 5.9853,  1),
  ('La Seyne-sur-Mer',       43.1000, 5.8831,  2),
  ('Saint-Mandrier-sur-Mer', 43.0781, 5.9300,  3),
  ('Le Revest-les-Eaux',     43.1764, 5.9167,  4),
  ('La Garde',               43.1250, 6.0111,  5),
  ('Ollioules',              43.1400, 5.8478,  6),
  ('Le Pradet',              43.1058, 6.0231,  7),
  ('Six-Fours-les-Plages',   43.0942, 5.8400,  8),
  ('La Farlède',             43.1667, 6.0433,  9),
  ('Sanary-sur-Mer',         43.1194, 5.8000, 10),
  ('Solliès-Ville',          43.1822, 6.0367, 11),
  ('Solliès-Pont',           43.1911, 6.0433, 12),
  ('La Crau',                43.1500, 6.0733, 13),
  ('La Moutonne',            43.1630, 6.0830, 14),
  ('Solliès-Toucas',         43.2111, 6.0433, 15),
  ('Bandol',                 43.1353, 5.7533, 16),
  ('Belgentier',             43.2433, 6.0111, 17),
  ('Hyères',                 43.1203, 6.1286, 18),
  ('Cuers',                  43.2378, 6.0708, 19),
  ('Garéoult',               43.3250, 6.0433, 20),
  ('Rocbaron',               43.3100, 6.0867, 21),
  ('Le Lavandou',            43.1372, 6.3667, 22)
)
-- 1. Met à jour celles déjà présentes (par nom exact).
, maj as (
  update public.communes c
     set lat = r.lat, lon = r.lon, ordre = r.ordre
    from reelles r
   where c.nom = r.nom
  returning c.nom
)
-- 2. Insère celles qui manquent.
insert into public.communes (nom, lat, lon, ordre)
select r.nom, r.lat, r.lon, r.ordre
  from reelles r
 where not exists (select 1 from public.communes c where c.nom = r.nom);

-- 3. Retire les anciens noms raccourcis et les communes hors zone.
delete from public.communes
 where nom in ('La Valette', 'Six-Fours', 'Fréjus', 'Draguignan', 'Brignoles');
