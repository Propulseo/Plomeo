-- ============================================================
--  CMS Plomeo — schema complet (singletons + repeatables + buckets)
--  RLS : lecture publique (anon), ecriture reservee aux connectes (Ayoub).
-- ============================================================

-- ---------- 1) Etendre la table realisations ----------
alter table public.realisations
  add column if not exists photo_alt    text,
  add column if not exists localisation text default 'Var (83)',
  add column if not exists description  text;

-- ---------- 2) site_content : cle/valeur pour tous les singletons ----------
create table if not exists public.site_content (
  id         uuid primary key default gen_random_uuid(),
  section    text        not null,
  cle        text        not null,
  valeur     jsonb       not null default '""'::jsonb,
  updated_at timestamptz not null default now(),
  unique (section, cle)
);
alter table public.site_content enable row level security;

drop policy if exists site_content_select_public on public.site_content;
create policy site_content_select_public on public.site_content
  for select to anon, authenticated using (true);

drop policy if exists site_content_write_auth on public.site_content;
create policy site_content_write_auth on public.site_content
  for all to authenticated using (true) with check (true);

-- ---------- 3) Tables repeatable ----------
create table if not exists public.avis (
  id uuid primary key default gen_random_uuid(),
  texte text not null,
  auteur text not null,
  ordre int not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.piliers (
  id uuid primary key default gen_random_uuid(),
  categorie text not null check (categorie in ('plomberie','chauffage','climatisation','piscine')),
  numero text,
  titre text not null,
  description text,
  image_path text,
  image_alt text,
  icone_path text,
  points jsonb not null default '[]'::jsonb,
  cta_texte text,
  cta_lien text,
  ordre int not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.process_etapes (
  id uuid primary key default gen_random_uuid(),
  numero text,
  titre text not null,
  description text,
  ordre int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.communes (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  ordre int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  categorie text,
  numero text,
  titre text not null,
  extrait text,
  meta_lecture text,
  image_path text,
  image_alt text,
  corps_html text,
  lien text,
  ordre int not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.faq (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  reponse text not null,
  ordre int not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.villes_carte (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  style_point text not null default 'simple' check (style_point in ('main','ping','simple')),
  svg_label_x numeric,
  svg_label_y numeric,
  svg_dot_cx numeric,
  svg_dot_cy numeric,
  text_anchor text default 'start',
  ordre int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- 4) RLS des tables repeatable (boucle) ----------
do $$
declare
  t text;
  with_visible    text[] := array['avis','piliers','articles','faq'];
  without_visible text[] := array['process_etapes','communes','villes_carte'];
  all_t           text[] := array['avis','piliers','articles','faq','process_etapes','communes','villes_carte'];
begin
  foreach t in array all_t loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create index if not exists %I on public.%I (ordre)', t||'_ordre_idx', t);
    execute format('drop policy if exists %I on public.%I', t||'_sel_auth', t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', t||'_sel_auth', t);
    execute format('drop policy if exists %I on public.%I', t||'_ins_auth', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (true)', t||'_ins_auth', t);
    execute format('drop policy if exists %I on public.%I', t||'_upd_auth', t);
    execute format('create policy %I on public.%I for update to authenticated using (true) with check (true)', t||'_upd_auth', t);
    execute format('drop policy if exists %I on public.%I', t||'_del_auth', t);
    execute format('create policy %I on public.%I for delete to authenticated using (true)', t||'_del_auth', t);
  end loop;
  foreach t in array with_visible loop
    execute format('drop policy if exists %I on public.%I', t||'_sel_anon', t);
    execute format('create policy %I on public.%I for select to anon using (visible = true)', t||'_sel_anon', t);
  end loop;
  foreach t in array without_visible loop
    execute format('drop policy if exists %I on public.%I', t||'_sel_anon', t);
    execute format('create policy %I on public.%I for select to anon using (true)', t||'_sel_anon', t);
  end loop;
end $$;

-- ---------- 5) Buckets de stockage + politiques unifiees ----------
insert into storage.buckets (id, name, public) values
  ('piliers','piliers',true),
  ('articles','articles',true),
  ('site','site',true)
on conflict (id) do nothing;

-- On remplace les politiques specifiques 'realisations' par des politiques CMS unifiees
drop policy if exists realisations_storage_read   on storage.objects;
drop policy if exists realisations_storage_insert on storage.objects;
drop policy if exists realisations_storage_update on storage.objects;
drop policy if exists realisations_storage_delete on storage.objects;

drop policy if exists cms_storage_read on storage.objects;
create policy cms_storage_read on storage.objects for select to anon, authenticated
  using (bucket_id in ('realisations','piliers','articles','site'));

drop policy if exists cms_storage_insert on storage.objects;
create policy cms_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('realisations','piliers','articles','site'));

drop policy if exists cms_storage_update on storage.objects;
create policy cms_storage_update on storage.objects for update to authenticated
  using (bucket_id in ('realisations','piliers','articles','site'));

drop policy if exists cms_storage_delete on storage.objects;
create policy cms_storage_delete on storage.objects for delete to authenticated
  using (bucket_id in ('realisations','piliers','articles','site'));
