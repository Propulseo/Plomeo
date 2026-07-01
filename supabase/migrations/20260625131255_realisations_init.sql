-- ============================================================
--  Phase 1 — Réalisations (galerie #work du site Plomeo)
--  Gérées en autonomie par Ayoub via l'admin.
--  Lecture publique (site + build), écriture réservée aux connectés.
-- ============================================================

-- ---------- Table ----------
create table if not exists public.realisations (
  id          uuid primary key default gen_random_uuid(),
  titre       text        not null,
  categorie   text        not null
              check (categorie in ('plomberie','chauffage','climatisation','piscine')),
  photo_path  text,                                  -- chemin de la photo dans le bucket Storage
  ordre       integer     not null default 0,        -- pour réordonner l'affichage
  visible     boolean     not null default true,     -- masquer sans supprimer
  created_at  timestamptz not null default now()
);

create index if not exists realisations_ordre_idx on public.realisations (ordre);

-- ---------- RLS (Row Level Security) ----------
alter table public.realisations enable row level security;

-- Lecture : le public (anon) ne voit que les réalisations visibles…
drop policy if exists realisations_select_anon on public.realisations;
create policy realisations_select_anon
  on public.realisations for select
  to anon
  using (visible = true);

-- …et Ayoub connecté voit tout (y compris les masquées).
drop policy if exists realisations_select_auth on public.realisations;
create policy realisations_select_auth
  on public.realisations for select
  to authenticated
  using (true);

-- Écriture (ajout / modif / suppression) : uniquement connecté.
drop policy if exists realisations_insert_auth on public.realisations;
create policy realisations_insert_auth
  on public.realisations for insert
  to authenticated
  with check (true);

drop policy if exists realisations_update_auth on public.realisations;
create policy realisations_update_auth
  on public.realisations for update
  to authenticated
  using (true) with check (true);

drop policy if exists realisations_delete_auth on public.realisations;
create policy realisations_delete_auth
  on public.realisations for delete
  to authenticated
  using (true);

-- ---------- Stockage des photos ----------
-- Bucket public (lecture libre des images, comme aujourd'hui dans assets/photos).
insert into storage.buckets (id, name, public)
values ('realisations', 'realisations', true)
on conflict (id) do nothing;

-- Lecture publique des fichiers du bucket.
drop policy if exists realisations_storage_read on storage.objects;
create policy realisations_storage_read
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'realisations');

-- Envoi / modif / suppression de fichiers : uniquement connecté (Ayoub).
drop policy if exists realisations_storage_insert on storage.objects;
create policy realisations_storage_insert
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'realisations');

drop policy if exists realisations_storage_update on storage.objects;
create policy realisations_storage_update
  on storage.objects for update
  to authenticated
  using (bucket_id = 'realisations');

drop policy if exists realisations_storage_delete on storage.objects;
create policy realisations_storage_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'realisations');
