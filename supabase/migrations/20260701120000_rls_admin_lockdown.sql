-- ============================================================
--  Correctif SÉCURITÉ — verrouillage des écritures aux seuls admins
-- ------------------------------------------------------------
--  Problème corrigé : avec enable_signup = true, les policies d'écriture
--  autorisaient TOUT utilisateur `authenticated`. N'importe qui pouvait
--  s'inscrire via la clé anon publique et modifier/supprimer tout le
--  contenu + le storage.
--
--  Correctif : table `admins` + fonction `is_plomeo_admin()` (SECURITY
--  DEFINER, contourne la RLS pour éviter la récursion), puis réécriture
--  de TOUTES les policies d'écriture en `is_plomeo_admin()`.
--
--  ⚠️ Action manuelle complémentaire (hors migration, sur le Dashboard) :
--     Authentication → couper « Allow new signups »
--     + enable_signup = false dans config.toml.
-- ============================================================

-- ---------- 1) Table des admins ----------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- Aucune policy anon/authenticated : la table n'est ni lisible ni modifiable
-- via l'API publique. Seuls le service_role et la fonction SECURITY DEFINER
-- ci-dessous y accèdent.

-- ---------- 2) Auto-seed d'Ayoub par email ----------
-- Casse insensible (le compte peut avoir ete cree en 'Admin@Plomeo.fr') et
-- seulement des comptes REELLEMENT connectables (confirmes, non bannis) : sinon
-- on seed un admin qui n'aura jamais de session => is_plomeo_admin() toujours
-- false => lockout malgre le garde-fou.
insert into public.admins (user_id)
select id from auth.users
where lower(email) = 'admin@plomeo.fr'
  and email_confirmed_at is not null
  and (banned_until is null or banned_until < now())
on conflict (user_id) do nothing;

-- ---------- 3) Garde-fou anti-lockout ----------
-- Si aucun admin n'a été trouvé (email absent, compte pas encore créé),
-- on ABANDONNE la migration entière : mieux vaut rollback que se verrouiller
-- dehors avec des policies que plus personne ne peut satisfaire.
do $$
begin
  if not exists (select 1 from public.admins) then
    raise exception 'Aucun admin dans public.admins — migration abandonnée pour éviter le lockout. Créez le compte admin@plomeo.fr (ou ajustez l''email seed) avant de rejouer.';
  end if;
end $$;

-- ---------- 4) Fonction helper (SECURITY DEFINER, contourne la RLS) ----------
create or replace function public.is_plomeo_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admins where user_id = auth.uid()
  );
$$;
revoke all on function public.is_plomeo_admin() from public;
grant execute on function public.is_plomeo_admin() to authenticated;

-- ---------- 5) Réécriture des policies d'écriture ----------

-- 5a) realisations
drop policy if exists realisations_insert_auth on public.realisations;
create policy realisations_insert_auth on public.realisations
  for insert to authenticated with check (public.is_plomeo_admin());

drop policy if exists realisations_update_auth on public.realisations;
create policy realisations_update_auth on public.realisations
  for update to authenticated
  using (public.is_plomeo_admin()) with check (public.is_plomeo_admin());

drop policy if exists realisations_delete_auth on public.realisations;
create policy realisations_delete_auth on public.realisations
  for delete to authenticated using (public.is_plomeo_admin());

-- 5b) site_content (l'ancienne policy `for all` couvrait aussi le select ;
--      le select public reste assuré par site_content_select_public).
drop policy if exists site_content_write_auth on public.site_content;
drop policy if exists site_content_insert_admin on public.site_content;
create policy site_content_insert_admin on public.site_content
  for insert to authenticated with check (public.is_plomeo_admin());
drop policy if exists site_content_update_admin on public.site_content;
create policy site_content_update_admin on public.site_content
  for update to authenticated
  using (public.is_plomeo_admin()) with check (public.is_plomeo_admin());
drop policy if exists site_content_delete_admin on public.site_content;
create policy site_content_delete_admin on public.site_content
  for delete to authenticated using (public.is_plomeo_admin());

-- 5c) Tables repeatable (mêmes noms de policies que le schéma d'origine)
do $$
declare
  t text;
  all_t text[] := array['avis','piliers','articles','faq','process_etapes','communes','villes_carte'];
begin
  foreach t in array all_t loop
    execute format('drop policy if exists %I on public.%I', t||'_ins_auth', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_plomeo_admin())', t||'_ins_auth', t);
    execute format('drop policy if exists %I on public.%I', t||'_upd_auth', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_plomeo_admin()) with check (public.is_plomeo_admin())', t||'_upd_auth', t);
    execute format('drop policy if exists %I on public.%I', t||'_del_auth', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_plomeo_admin())', t||'_del_auth', t);
  end loop;
end $$;

-- 5d) storage.objects (buckets CMS)
drop policy if exists cms_storage_insert on storage.objects;
create policy cms_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('realisations','piliers','articles','site') and public.is_plomeo_admin());

drop policy if exists cms_storage_update on storage.objects;
create policy cms_storage_update on storage.objects for update to authenticated
  using (bucket_id in ('realisations','piliers','articles','site') and public.is_plomeo_admin());

drop policy if exists cms_storage_delete on storage.objects;
create policy cms_storage_delete on storage.objects for delete to authenticated
  using (bucket_id in ('realisations','piliers','articles','site') and public.is_plomeo_admin());
