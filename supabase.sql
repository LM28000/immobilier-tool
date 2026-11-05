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
