-- Liste commune « Nos biens » pour https://lm28000.github.io/immobilier-tool/
-- À coller dans Supabase > SQL Editor > New query, puis « Run ».
create table if not exists public.biens (
  id uuid primary key default gen_random_uuid(),
  groupe text not null check (length(groupe) >= 12),
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists biens_groupe_idx on public.biens (groupe);

alter table public.biens enable row level security;

-- Seules les lignes dont le « groupe » est égal au code envoyé par la page (en-tête x-groupe) sont visibles et modifiables.
create or replace function public.code_groupe() returns text language sql stable as $$
  select coalesce(current_setting('request.headers', true)::json->>'x-groupe', '')
$$;

drop policy if exists "lecture du groupe" on public.biens;
drop policy if exists "ajout dans le groupe" on public.biens;
drop policy if exists "modification du groupe" on public.biens;
drop policy if exists "suppression du groupe" on public.biens;
create policy "lecture du groupe" on public.biens for select to anon using (groupe = public.code_groupe());
create policy "ajout dans le groupe" on public.biens for insert to anon with check (groupe = public.code_groupe());
create policy "modification du groupe" on public.biens for update to anon using (groupe = public.code_groupe()) with check (groupe = public.code_groupe());
create policy "suppression du groupe" on public.biens for delete to anon using (groupe = public.code_groupe());

grant select, insert, update, delete on public.biens to anon;

-- ============ Novembre 2026 : à coller à son tour dans SQL Editor puis « Run » (sans risque pour les lignes existantes) ============

-- 1. « Nos biens » : forme et taille bornées pour les nouvelles écritures (NOT VALID : les lignes déjà là ne sont pas contrôlées)
alter table public.biens drop constraint if exists biens_data_objet;
alter table public.biens add constraint biens_data_objet check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 60000) not valid;
alter table public.biens drop constraint if exists biens_groupe_forme;
alter table public.biens add constraint biens_groupe_forme check (length(groupe) between 12 and 80) not valid;
-- au plus 500 biens par groupe : un inconnu qui devinerait un code ne peut pas remplir la base sans fin
create or replace function public.biens_quota() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.biens where groupe = new.groupe) >= 500 then
    raise exception 'quota de 500 biens atteint pour ce groupe';
  end if;
  return new;
end $$;
drop trigger if exists biens_quota on public.biens;
create trigger biens_quota before insert on public.biens for each row execute function public.biens_quota();
-- date de modification posée par la base, pas par le navigateur
create or replace function public.biens_maj() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists biens_maj on public.biens;
create trigger biens_maj before update on public.biens for each row execute function public.biens_maj();

-- 2. Annonces relevées chaque soir, lisibles seulement avec le code du groupe (plus besoin de les publier dans le dépôt public)
--    clés : ads (annonces du jour), hist (historique des prix), ficx (champs de calcul), fiches-<ville> (fiches complètes)
create table if not exists public.annonces (
  groupe text not null check (length(groupe) between 12 and 80),
  cle text not null check (cle ~ '^[a-z0-9-]{2,40}$'),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  maj timestamptz not null default now(),
  primary key (groupe, cle)
);
alter table public.annonces enable row level security;
drop policy if exists "annonces : lecture du groupe" on public.annonces;
drop policy if exists "annonces : écriture du groupe" on public.annonces;
drop policy if exists "annonces : mise à jour du groupe" on public.annonces;
create policy "annonces : lecture du groupe" on public.annonces for select to anon using (groupe = public.code_groupe());
create policy "annonces : écriture du groupe" on public.annonces for insert to anon with check (groupe = public.code_groupe());
create policy "annonces : mise à jour du groupe" on public.annonces for update to anon using (groupe = public.code_groupe()) with check (groupe = public.code_groupe());
grant select, insert, update on public.annonces to anon;
