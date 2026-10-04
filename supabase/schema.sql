-- ============================================================================
--  GESTÃO DE MANUTENÇÃO DE ATIVOS — SCHEMA COMPLETO
--  Cole este arquivo inteiro no Supabase → SQL Editor → Run
--  Pode ser executado mais de uma vez (é idempotente).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. TIPOS (ENUMS)
-- ============================================================================

do $$ begin
  create type public.papel_membro as enum ('proprietario', 'gestor', 'tecnico', 'leitor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.unidade_periodicidade as enum ('dias', 'meses', 'horas');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.status_ativo as enum ('ativo', 'manutencao', 'inativo', 'baixado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tipo_manutencao as enum ('preventiva', 'corretiva', 'preditiva', 'inspecao', 'melhoria');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- 2. TABELAS
-- ============================================================================

-- Empresa / workspace ---------------------------------------------------------
create table if not exists public.organizacoes (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  cnpj        text,
  telefone    text,
  endereco    text,
  logo_url    text,
  criado_por  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Perfil do usuário -----------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nome        text,
  email       text,
  telefone    text,
  cargo       text,
  avatar_url  text,
  org_atual   uuid references public.organizacoes (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Membros da empresa (quem enxerga os dados) ----------------------------------
create table if not exists public.org_membros (
  org_id     uuid not null references public.organizacoes (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  papel      public.papel_membro not null default 'gestor',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- Categorias (as "pastas": Caminhões, Hidráulicos, Máquinas...) ---------------
create table if not exists public.categorias (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizacoes (id) on delete cascade,
  nome       text not null,
  descricao  text,
  cor        text not null default '#2563eb',
  icone      text not null default 'package',
  ordem      int  not null default 0,
  created_at timestamptz not null default now(),
  unique (org_id, nome)
);

-- Ativos / equipamentos -------------------------------------------------------
create table if not exists public.ativos (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizacoes (id) on delete cascade,
  categoria_id    uuid not null references public.categorias (id) on delete restrict,
  nome            text not null,
  modelo          text,
  marca           text,
  identificacao   text,                       -- placa / nº de série / patrimônio
  ano             int,
  data_cadastro   date not null default current_date,
  horimetro_atual numeric(12,2) not null default 0,
  status          public.status_ativo not null default 'ativo',
  foto_url        text,
  observacoes     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Planos de manutenção periódica / preventiva ---------------------------------
create table if not exists public.planos_manutencao (
  id                      uuid primary key default gen_random_uuid(),
  org_id                  uuid not null references public.organizacoes (id) on delete cascade,
  ativo_id                uuid not null references public.ativos (id) on delete cascade,
  tipo                    text not null,      -- ex.: "Troca de óleo", "Revisão dos freios"
  descricao               text,
  periodicidade_valor     int  not null check (periodicidade_valor > 0),
  periodicidade_unidade   public.unidade_periodicidade not null default 'meses',
  proxima_data            date,
  proximo_horimetro       numeric(12,2),
  alerta_antecedencia_dias  int not null default 7,
  alerta_antecedencia_horas numeric(12,2) not null default 50,
  ultima_data             date,
  ultimo_horimetro        numeric(12,2),
  responsavel             text,
  custo_estimado          numeric(12,2),
  ativo                   boolean not null default true,
  observacoes             text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- Histórico de manutenções realizadas -----------------------------------------
create table if not exists public.manutencoes (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizacoes (id) on delete cascade,
  ativo_id        uuid not null references public.ativos (id) on delete cascade,
  plano_id        uuid references public.planos_manutencao (id) on delete set null,
  tipo            public.tipo_manutencao not null default 'corretiva',
  data_manutencao date not null default current_date,
  descricao       text not null,
  pecas           text,                        -- peças / materiais utilizados
  valor           numeric(12,2) not null default 0,
  responsavel     text,
  empresa         text,                        -- prestador de serviço
  nota_fiscal     text,
  garantia_dias   int not null default 0,
  garantia_ate    date generated always as (data_manutencao + garantia_dias) stored,
  horimetro       numeric(12,2),
  observacoes     text,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now()
);

-- Anexos / fotos das manutenções ----------------------------------------------
create table if not exists public.manutencao_anexos (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizacoes (id) on delete cascade,
  manutencao_id uuid not null references public.manutencoes (id) on delete cascade,
  nome          text not null,
  path          text not null,                 -- caminho dentro do bucket "manutencoes"
  tipo_mime     text,
  tamanho       bigint,
  created_at    timestamptz not null default now()
);

-- ============================================================================
-- 3. ÍNDICES
-- ============================================================================

create index if not exists idx_categorias_org       on public.categorias (org_id);
create index if not exists idx_ativos_org           on public.ativos (org_id);
create index if not exists idx_ativos_categoria     on public.ativos (categoria_id);
create index if not exists idx_planos_org           on public.planos_manutencao (org_id);
create index if not exists idx_planos_ativo         on public.planos_manutencao (ativo_id);
create index if not exists idx_planos_proxima       on public.planos_manutencao (proxima_data);
create index if not exists idx_manut_org            on public.manutencoes (org_id);
create index if not exists idx_manut_ativo          on public.manutencoes (ativo_id);
create index if not exists idx_manut_data           on public.manutencoes (data_manutencao desc);
create index if not exists idx_anexos_manutencao    on public.manutencao_anexos (manutencao_id);
create index if not exists idx_org_membros_user     on public.org_membros (user_id);

-- ============================================================================
-- 4. FUNÇÕES AUXILIARES
-- ============================================================================

-- Retorna os IDs das empresas do usuário logado.
-- SECURITY DEFINER evita recursão infinita nas policies de RLS.
create or replace function public.user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.org_membros where user_id = auth.uid();
$$;

grant execute on function public.user_org_ids() to authenticated;

-- Empresas em que o usuário é proprietário ou gestor (pode mexer na equipe).
-- Também é SECURITY DEFINER: sem isso, uma policy de org_membros que consultasse
-- a própria org_membros entraria em recursão infinita.
create or replace function public.user_admin_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.org_membros
   where user_id = auth.uid() and papel in ('proprietario', 'gestor');
$$;

grant execute on function public.user_admin_org_ids() to authenticated;

-- Cria as categorias padrão pedidas no projeto
create or replace function public.seed_categorias_padrao(p_org uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categorias (org_id, nome, descricao, cor, icone, ordem) values
    (p_org, 'Caminhões',           'Frota de caminhões e veículos pesados',      '#2563eb', 'truck',       1),
    (p_org, 'Hidráulicos',         'Sistemas e componentes hidráulicos',         '#0891b2', 'droplets',    2),
    (p_org, 'Máquinas',            'Máquinas industriais e de produção',         '#7c3aed', 'cog',         3),
    (p_org, 'Empilhadeiras',       'Empilhadeiras e equipamentos de movimentação','#ea580c', 'forklift',    4),
    (p_org, 'Equipamentos',        'Equipamentos diversos',                      '#16a34a', 'wrench',      5),
    (p_org, 'Manutenções gerais',  'Serviços gerais e predial',                  '#db2777', 'hard-hat',    6)
  on conflict (org_id, nome) do nothing;
end;
$$;

-- Atualiza updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_ativos_updated on public.ativos;
create trigger trg_ativos_updated before update on public.ativos
  for each row execute function public.set_updated_at();

drop trigger if exists trg_planos_updated on public.planos_manutencao;
create trigger trg_planos_updated before update on public.planos_manutencao
  for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 5. NOVO USUÁRIO → cria perfil + empresa + categorias padrão
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org     uuid;
  v_nome    text;
  v_empresa text;
begin
  v_nome    := coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(new.email, '@', 1));
  v_empresa := coalesce(nullif(new.raw_user_meta_data ->> 'empresa', ''), 'Minha Empresa');

  insert into public.organizacoes (nome, criado_por)
  values (v_empresa, new.id)
  returning id into v_org;

  insert into public.profiles (id, nome, email, telefone, org_atual)
  values (new.id, v_nome, new.email, nullif(new.raw_user_meta_data ->> 'telefone', ''), v_org)
  on conflict (id) do update set org_atual = excluded.org_atual;

  insert into public.org_membros (org_id, user_id, papel)
  values (v_org, new.id, 'proprietario')
  on conflict do nothing;

  perform public.seed_categorias_padrao(v_org);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Rede de segurança: se o usuário foi criado ANTES de você rodar este SQL,
-- o app chama esta função para montar a empresa dele.
create or replace function public.criar_workspace(p_nome text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org  uuid;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Usuário não autenticado';
  end if;

  select org_id into v_org from public.org_membros where user_id = v_user limit 1;
  if v_org is not null then
    return v_org;
  end if;

  insert into public.organizacoes (nome, criado_por)
  values (coalesce(nullif(p_nome, ''), 'Minha Empresa'), v_user)
  returning id into v_org;

  insert into public.org_membros (org_id, user_id, papel) values (v_org, v_user, 'proprietario');

  insert into public.profiles (id, nome, email, org_atual)
  select v_user, coalesce(u.raw_user_meta_data ->> 'nome', split_part(u.email, '@', 1)), u.email, v_org
    from auth.users u where u.id = v_user
  on conflict (id) do update set org_atual = coalesce(public.profiles.org_atual, excluded.org_atual);

  perform public.seed_categorias_padrao(v_org);
  return v_org;
end;
$$;

grant execute on function public.criar_workspace(text) to authenticated;

-- A empresa alvo é SEMPRE passada pelo app (a mesma que está aberta na tela).
-- Nada de "adivinhar" a empresa: se o usuário não for administrador dela, falha.
create or replace function public.pode_gerenciar_equipe(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.org_membros
     where org_id = p_org and user_id = auth.uid()
       and papel in ('proprietario', 'gestor')
  );
$$;

grant execute on function public.pode_gerenciar_equipe(uuid) to authenticated;

-- Versões antigas, que deduziam a empresa sozinhas, ficavam ambíguas para quem
-- participa de mais de uma empresa. Removidas.
drop function if exists public.adicionar_membro(text, public.papel_membro);
drop function if exists public.remover_membro(uuid);
drop function if exists public.org_administrada();

-- Adiciona à empresa um usuário que já tem conta no sistema.
create or replace function public.adicionar_membro(
  p_org   uuid,
  p_email text,
  p_papel public.papel_membro default 'tecnico'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alvo uuid;
begin
  if not public.pode_gerenciar_equipe(p_org) then
    raise exception 'Você não tem permissão para gerenciar a equipe desta empresa.';
  end if;

  if p_papel = 'proprietario' then
    raise exception 'Não é possível criar outro proprietário.';
  end if;

  select id into v_alvo from auth.users where lower(email) = lower(trim(p_email)) limit 1;

  if v_alvo is null then
    raise exception 'Nenhum usuário com este e-mail. Peça para a pessoa criar a conta primeiro.';
  end if;

  if exists (select 1 from public.org_membros where org_id = p_org and user_id = v_alvo) then
    raise exception 'Este usuário já faz parte da equipe.';
  end if;

  insert into public.org_membros (org_id, user_id, papel) values (p_org, v_alvo, p_papel);
  update public.profiles set org_atual = coalesce(org_atual, p_org) where id = v_alvo;

  return 'ok';
end;
$$;

grant execute on function public.adicionar_membro(uuid, text, public.papel_membro) to authenticated;

-- Remove um membro da empresa (o proprietário não pode ser removido).
create or replace function public.remover_membro(p_org uuid, p_user uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_papel   public.papel_membro;
  v_apagados int;
begin
  if not public.pode_gerenciar_equipe(p_org) then
    raise exception 'Você não tem permissão para gerenciar a equipe desta empresa.';
  end if;

  select papel into v_papel from public.org_membros where org_id = p_org and user_id = p_user;

  if v_papel is null then
    raise exception 'Esta pessoa não faz parte da equipe desta empresa.';
  end if;

  if v_papel = 'proprietario' then
    raise exception 'O proprietário da empresa não pode ser removido.';
  end if;

  delete from public.org_membros where org_id = p_org and user_id = p_user;
  get diagnostics v_apagados = row_count;

  if v_apagados = 0 then
    raise exception 'Nada foi removido.';
  end if;

  -- Se a pessoa estava atuando nesta empresa, joga-a para outra de que participe.
  update public.profiles
     set org_atual = (select org_id from public.org_membros where user_id = p_user order by created_at limit 1)
   where id = p_user and org_atual = p_org;

  return 'ok';
end;
$$;

grant execute on function public.remover_membro(uuid, uuid) to authenticated;

-- ============================================================================
-- 6. AO REGISTRAR UMA MANUTENÇÃO, AVANÇA O PLANO PREVENTIVO
-- ============================================================================

create or replace function public.avancar_plano_manutencao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.planos_manutencao%rowtype;
begin
  -- mantém o horímetro do ativo sempre com o maior valor conhecido
  if new.horimetro is not null then
    update public.ativos
       set horimetro_atual = greatest(horimetro_atual, new.horimetro)
     where id = new.ativo_id;
  end if;

  if new.plano_id is null then
    return new;
  end if;

  select * into p from public.planos_manutencao where id = new.plano_id;
  if not found then
    return new;
  end if;

  update public.planos_manutencao
     set ultima_data      = new.data_manutencao,
         ultimo_horimetro = coalesce(new.horimetro, p.ultimo_horimetro),
         proxima_data = case p.periodicidade_unidade
           when 'dias'  then new.data_manutencao + p.periodicidade_valor
           when 'meses' then (new.data_manutencao + (p.periodicidade_valor || ' months')::interval)::date
           else p.proxima_data
         end,
         proximo_horimetro = case
           when p.periodicidade_unidade = 'horas'
             then coalesce(new.horimetro, p.ultimo_horimetro, 0) + p.periodicidade_valor
           else p.proximo_horimetro
         end
   where id = p.id;

  return new;
end;
$$;

drop trigger if exists trg_avancar_plano on public.manutencoes;
create trigger trg_avancar_plano
  after insert on public.manutencoes
  for each row execute function public.avancar_plano_manutencao();

-- ============================================================================
-- 7. PERMISSÕES + ROW LEVEL SECURITY
--    Regra geral: o usuário só enxerga linhas da(s) empresa(s) de que é membro.
--    Os GRANTs abrem a porta; quem filtra as linhas é o RLS abaixo.
-- ============================================================================

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on
  public.organizacoes,
  public.profiles,
  public.org_membros,
  public.categorias,
  public.ativos,
  public.planos_manutencao,
  public.manutencoes,
  public.manutencao_anexos
to authenticated;

alter table public.organizacoes      enable row level security;
alter table public.profiles          enable row level security;
alter table public.org_membros       enable row level security;
alter table public.categorias        enable row level security;
alter table public.ativos            enable row level security;
alter table public.planos_manutencao enable row level security;
alter table public.manutencoes       enable row level security;
alter table public.manutencao_anexos enable row level security;

-- organizacoes ---------------------------------------------------------------
drop policy if exists org_select on public.organizacoes;
create policy org_select on public.organizacoes for select to authenticated
  using (id in (select public.user_org_ids()));

drop policy if exists org_update on public.organizacoes;
create policy org_update on public.organizacoes for update to authenticated
  using (id in (select public.user_org_ids()))
  with check (id in (select public.user_org_ids()));

drop policy if exists org_insert on public.organizacoes;
create policy org_insert on public.organizacoes for insert to authenticated
  with check (criado_por = auth.uid());

-- profiles -------------------------------------------------------------------
drop policy if exists profile_select on public.profiles;
create policy profile_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or id in (select user_id from public.org_membros where org_id in (select public.user_org_ids()))
  );

drop policy if exists profile_update on public.profiles;
create policy profile_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profile_insert on public.profiles;
create policy profile_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());

-- org_membros ----------------------------------------------------------------
drop policy if exists membros_select on public.org_membros;
create policy membros_select on public.org_membros for select to authenticated
  using (org_id in (select public.user_org_ids()));

-- Escrita separada por comando (nunca FOR ALL: isso também pegaria o SELECT
-- e criaria recursão com a policy de leitura acima).
drop policy if exists membros_write on public.org_membros;

drop policy if exists membros_insert on public.org_membros;
create policy membros_insert on public.org_membros for insert to authenticated
  with check (org_id in (select public.user_admin_org_ids()));

drop policy if exists membros_update on public.org_membros;
create policy membros_update on public.org_membros for update to authenticated
  using (org_id in (select public.user_admin_org_ids()))
  with check (org_id in (select public.user_admin_org_ids()));

drop policy if exists membros_delete on public.org_membros;
create policy membros_delete on public.org_membros for delete to authenticated
  using (org_id in (select public.user_admin_org_ids()));

-- Policies das tabelas de dados (mesmo padrão para todas) ---------------------
do $$
declare t text;
begin
  foreach t in array array['categorias', 'ativos', 'planos_manutencao', 'manutencoes', 'manutencao_anexos']
  loop
    execute format('drop policy if exists %I_rw on public.%I', t, t);
    execute format($f$
      create policy %I_rw on public.%I for all to authenticated
        using (org_id in (select public.user_org_ids()))
        with check (org_id in (select public.user_org_ids()))
    $f$, t, t);
  end loop;
end $$;

-- ============================================================================
-- 8. STORAGE — bucket privado para fotos e anexos das manutenções
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('manutencoes', 'manutencoes', false, 26214400)   -- 25 MB por arquivo
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

-- Caminho dos arquivos: {org_id}/{manutencao_id}/{arquivo}
drop policy if exists anexos_select on storage.objects;
create policy anexos_select on storage.objects for select to authenticated
  using (
    bucket_id = 'manutencoes'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids())
  );

drop policy if exists anexos_insert on storage.objects;
create policy anexos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'manutencoes'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids())
  );

drop policy if exists anexos_update on storage.objects;
create policy anexos_update on storage.objects for update to authenticated
  using (
    bucket_id = 'manutencoes'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids())
  );

drop policy if exists anexos_delete on storage.objects;
create policy anexos_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'manutencoes'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids())
  );

-- ============================================================================
-- 9. VIEWS DE APOIO (dashboard, alertas e relatórios)
-- ============================================================================

-- Situação de cada plano preventivo: em_dia | proxima | atrasada | inativo
create or replace view public.vw_planos_status
with (security_invoker = on) as
select
  p.*,
  a.nome            as ativo_nome,
  a.identificacao   as ativo_identificacao,
  a.horimetro_atual,
  a.categoria_id,
  c.nome            as categoria_nome,
  c.cor             as categoria_cor,
  (p.proxima_data - current_date) as dias_restantes,
  case when p.periodicidade_unidade = 'horas'
       then p.proximo_horimetro - a.horimetro_atual end as horas_restantes,
  case
    when not p.ativo then 'inativo'
    when p.periodicidade_unidade = 'horas' then
      case
        when p.proximo_horimetro is null then 'em_dia'
        when a.horimetro_atual >= p.proximo_horimetro then 'atrasada'
        when a.horimetro_atual >= p.proximo_horimetro - p.alerta_antecedencia_horas then 'proxima'
        else 'em_dia'
      end
    else
      case
        when p.proxima_data is null then 'em_dia'
        when p.proxima_data < current_date then 'atrasada'
        when p.proxima_data <= current_date + p.alerta_antecedencia_dias then 'proxima'
        else 'em_dia'
      end
  end as situacao
from public.planos_manutencao p
join public.ativos     a on a.id = p.ativo_id
join public.categorias c on c.id = a.categoria_id;

-- Histórico achatado, pronto para relatórios
create or replace view public.vw_manutencoes_completo
with (security_invoker = on) as
select
  m.*,
  a.nome          as ativo_nome,
  a.identificacao as ativo_identificacao,
  a.marca         as ativo_marca,
  a.modelo        as ativo_modelo,
  c.id            as categoria_id,
  c.nome          as categoria_nome,
  c.cor           as categoria_cor,
  (select count(*) from public.manutencao_anexos an where an.manutencao_id = m.id) as total_anexos
from public.manutencoes m
join public.ativos     a on a.id = m.ativo_id
join public.categorias c on c.id = a.categoria_id;

grant select on public.vw_planos_status        to authenticated;
grant select on public.vw_manutencoes_completo to authenticated;

-- ============================================================================
-- 10. RPC — resumo do dashboard em uma única chamada
-- ============================================================================

create or replace function public.dashboard_resumo(p_org uuid)
returns json
language sql
stable
security invoker
set search_path = public
as $$
  select json_build_object(
    'total_ativos',      (select count(*) from public.ativos where org_id = p_org and status <> 'baixado'),
    'total_categorias',  (select count(*) from public.categorias where org_id = p_org),
    'gasto_mes',         (select coalesce(sum(valor), 0) from public.manutencoes
                            where org_id = p_org and data_manutencao >= date_trunc('month', current_date)),
    'gasto_ano',         (select coalesce(sum(valor), 0) from public.manutencoes
                            where org_id = p_org and data_manutencao >= date_trunc('year', current_date)),
    'manutencoes_mes',   (select count(*) from public.manutencoes
                            where org_id = p_org and data_manutencao >= date_trunc('month', current_date)),
    'alertas_proximas',  (select count(*) from public.vw_planos_status
                            where org_id = p_org and situacao = 'proxima'),
    'alertas_atrasadas', (select count(*) from public.vw_planos_status
                            where org_id = p_org and situacao = 'atrasada')
  );
$$;

grant execute on function public.dashboard_resumo(uuid) to authenticated;

-- ============================================================================
-- FIM
-- ============================================================================

-- ============================================================================
-- 11. CONTEXTO DO USUÁRIO EM UMA ÚNICA CHAMADA
--     Antes o app fazia 5 consultas em sequência a cada navegação (perfil,
--     membros, organização, lista de empresas e contagem de alertas). Com a
--     latência normal do Supabase isso somava segundos. Aqui tudo vem junto.
-- ============================================================================

create or replace function public.contexto_usuario()
returns json
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_org   uuid;
  v_papel public.papel_membro;
begin
  if v_user is null then
    return null;
  end if;

  -- empresa que o usuário escolheu (profiles.org_atual), se ainda for membro dela
  select m.org_id, m.papel into v_org, v_papel
    from public.org_membros m
    join public.profiles p on p.id = v_user and p.org_atual = m.org_id
   where m.user_id = v_user;

  -- caso contrário, a associação mais antiga
  if v_org is null then
    select org_id, papel into v_org, v_papel
      from public.org_membros
     where user_id = v_user
     order by created_at
     limit 1;
  end if;

  if v_org is null then
    return null;   -- sem empresa: o app chama criar_workspace()
  end if;

  return json_build_object(
    'perfil',      (select row_to_json(p) from public.profiles p where p.id = v_user),
    'org_id',      v_org,
    'papel',       v_papel,
    'organizacao', (select row_to_json(o) from public.organizacoes o where o.id = v_org),
    'empresas',    coalesce((
                     select json_agg(json_build_object('id', o.id, 'nome', o.nome) order by o.nome)
                       from public.org_membros m
                       join public.organizacoes o on o.id = m.org_id
                      where m.user_id = v_user
                   ), '[]'::json),
    'alertas',     (select count(*) from public.vw_planos_status
                     where org_id = v_org and situacao in ('proxima', 'atrasada'))
  );
end;
$$;

grant execute on function public.contexto_usuario() to authenticated;
-- ============================================================================
--  MIGRAÇÃO — NOTIFICAÇÕES POR WHATSAPP (Evolution API)
--  Rode no Supabase → SQL Editor. Pode rodar mais de uma vez.
-- ============================================================================

-- Uma conexão de WhatsApp por empresa -----------------------------------------
create table if not exists public.whatsapp_conexoes (
  org_id            uuid primary key references public.organizacoes (id) on delete cascade,
  instancia         text not null unique,          -- nome da instância na Evolution
  numero            text,                          -- número conectado (só dígitos)
  nome_perfil       text,
  status            text not null default 'desconectado',  -- desconectado | conectando | conectado
  notificar         boolean not null default true,
  dias_antecedencia int not null default 3 check (dias_antecedencia between 0 and 60),
  incluir_atrasadas boolean not null default true,
  ultimo_envio      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Evita mandar o mesmo resumo duas vezes no mesmo dia -------------------------
create table if not exists public.whatsapp_envios (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizacoes (id) on delete cascade,
  data_referencia  date not null default current_date,
  quantidade       int  not null default 0,
  sucesso          boolean not null default true,
  detalhe          text,
  enviado_em       timestamptz not null default now(),
  unique (org_id, data_referencia)
);

create index if not exists idx_whatsapp_envios_org on public.whatsapp_envios (org_id, data_referencia desc);

drop trigger if exists trg_whatsapp_updated on public.whatsapp_conexoes;
create trigger trg_whatsapp_updated before update on public.whatsapp_conexoes
  for each row execute function public.set_updated_at();

-- Permissões + RLS ------------------------------------------------------------
grant select, insert, update, delete on public.whatsapp_conexoes, public.whatsapp_envios to authenticated;

alter table public.whatsapp_conexoes enable row level security;
alter table public.whatsapp_envios   enable row level security;

drop policy if exists whatsapp_conexoes_rw on public.whatsapp_conexoes;
create policy whatsapp_conexoes_rw on public.whatsapp_conexoes for all to authenticated
  using (org_id in (select public.user_org_ids()))
  with check (org_id in (select public.user_org_ids()));

drop policy if exists whatsapp_envios_ro on public.whatsapp_envios;
create policy whatsapp_envios_ro on public.whatsapp_envios for select to authenticated
  using (org_id in (select public.user_org_ids()));

-- ============================================================================
--  Quem deve receber resumo hoje, e o que entra nele.
--  Usada pela rotina diária (que roda com a chave de serviço).
-- ============================================================================

create or replace function public.whatsapp_pendencias(p_org uuid)
returns table (
  plano_id     uuid,
  ativo_nome   text,
  identificacao text,
  tipo         text,
  categoria    text,
  situacao     text,
  proxima_data date,
  dias_restantes int,
  proximo_horimetro numeric,
  horimetro_atual   numeric,
  unidade      public.unidade_periodicidade
)
language sql
stable
security definer
set search_path = public
as $$
  select
    v.id, v.ativo_nome, v.ativo_identificacao, v.tipo, v.categoria_nome,
    v.situacao, v.proxima_data, v.dias_restantes,
    v.proximo_horimetro, v.horimetro_atual, v.periodicidade_unidade
  from public.vw_planos_status v
  join public.whatsapp_conexoes c on c.org_id = v.org_id
  where v.org_id = p_org
    and v.ativo
    and (
      (v.situacao = 'atrasada' and c.incluir_atrasadas)
      or (v.situacao = 'proxima')
      or (v.periodicidade_unidade <> 'horas'
          and v.proxima_data is not null
          and v.proxima_data <= current_date + c.dias_antecedencia)
    )
  order by
    case v.situacao when 'atrasada' then 0 when 'proxima' then 1 else 2 end,
    v.proxima_data nulls last;
$$;

grant execute on function public.whatsapp_pendencias(uuid) to authenticated, service_role;
-- ============================================================================
--  MIGRAÇÃO DE SEGURANÇA — rode no Supabase → SQL Editor
--  Pode rodar mais de uma vez.
--
--  1. whatsapp_pendencias era SECURITY DEFINER sem checar quem chamava:
--     qualquer usuário logado poderia passar o id de OUTRA empresa e ler as
--     manutenções dela. Vira SECURITY INVOKER, e aí o RLS filtra.
--  2. No PostgreSQL, toda função nasce executável por PUBLIC. Isso deixava
--     funções internas ao alcance de qualquer um. Revogamos e liberamos só o
--     necessário.
--  3. Restringe os tipos de arquivo aceitos no bucket de anexos.
--  4. Adiciona a exclusão de conta pelo próprio usuário.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Fecha o vazamento entre empresas
-- ---------------------------------------------------------------------------
create or replace function public.whatsapp_pendencias(p_org uuid)
returns table (
  plano_id      uuid,
  ativo_nome    text,
  identificacao text,
  tipo          text,
  categoria     text,
  situacao      text,
  proxima_data  date,
  dias_restantes int,
  proximo_horimetro numeric,
  horimetro_atual   numeric,
  unidade       public.unidade_periodicidade
)
language sql
stable
security invoker          -- <<< era DEFINER; agora o RLS de quem chama vale
set search_path = public
as $$
  select
    v.id, v.ativo_nome, v.ativo_identificacao, v.tipo, v.categoria_nome,
    v.situacao, v.proxima_data, v.dias_restantes,
    v.proximo_horimetro, v.horimetro_atual, v.periodicidade_unidade
  from public.vw_planos_status v
  join public.whatsapp_conexoes c on c.org_id = v.org_id
  where v.org_id = p_org
    and v.ativo
    and (
      (v.situacao = 'atrasada' and c.incluir_atrasadas)
      or (v.situacao = 'proxima')
      or (v.periodicidade_unidade <> 'horas'
          and v.proxima_data is not null
          and v.proxima_data <= current_date + c.dias_antecedencia)
    )
  order by
    case v.situacao when 'atrasada' then 0 when 'proxima' then 1 else 2 end,
    v.proxima_data nulls last;
$$;

-- ---------------------------------------------------------------------------
-- 2. Menor privilégio nas funções
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;

-- Usadas dentro das policies de RLS: sem EXECUTE, ninguém lê nada.
grant execute on function public.user_org_ids()       to authenticated;
grant execute on function public.user_admin_org_ids() to authenticated;

-- Chamadas pelo aplicativo
grant execute on function public.contexto_usuario()                                   to authenticated;
grant execute on function public.dashboard_resumo(uuid)                               to authenticated;
grant execute on function public.criar_workspace(text)                                to authenticated;
grant execute on function public.pode_gerenciar_equipe(uuid)                          to authenticated;
grant execute on function public.adicionar_membro(uuid, text, public.papel_membro)    to authenticated;
grant execute on function public.remover_membro(uuid, uuid)                           to authenticated;
grant execute on function public.whatsapp_pendencias(uuid)                            to authenticated, service_role;

-- seed_categorias_padrao continua sem grant: é chamada só por outras funções
-- (SECURITY DEFINER), nunca direto pelo usuário.

-- ---------------------------------------------------------------------------
-- 3. Bucket aceita só imagem e PDF
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'storage' and table_name = 'buckets'
       and column_name = 'allowed_mime_types'
  ) then
    execute $q$
      update storage.buckets
         set allowed_mime_types = array[
               'image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'
             ],
             file_size_limit = 26214400
       where id = 'manutencoes'
    $q$;
  else
    update storage.buckets set file_size_limit = 26214400 where id = 'manutencoes';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Exclusão de conta pelo próprio usuário
--
--    Regras:
--    - empresa em que a pessoa é a ÚNICA integrante  -> a empresa inteira é
--      apagada (ativos, manutenções, planos e anexos vão junto por cascade);
--    - empresa com outras pessoas, sendo ela proprietária -> promove a próxima
--      pessoa mais antiga a proprietária e sai;
--    - demais empresas -> apenas sai.
--
--    Devolve os caminhos dos arquivos a remover do Storage e os ids das
--    instâncias de WhatsApp a desconectar — o app cuida disso antes de apagar
--    o usuário no Auth.
-- ---------------------------------------------------------------------------
create or replace function public.excluir_minha_conta()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user        uuid := auth.uid();
  v_org         uuid;
  v_outros      int;
  v_sucessor    uuid;
  v_orgs_apagadas uuid[] := '{}';
  v_arquivos    text[]   := '{}';
  v_instancias  text[]   := '{}';
begin
  if v_user is null then
    raise exception 'Usuário não autenticado';
  end if;

  for v_org in select org_id from public.org_membros where user_id = v_user loop
    select count(*) into v_outros
      from public.org_membros where org_id = v_org and user_id <> v_user;

    if v_outros = 0 then
      -- Última pessoa da empresa: leva tudo junto.
      v_arquivos := v_arquivos || coalesce(
        (select array_agg(path) from public.manutencao_anexos where org_id = v_org), '{}');
      v_instancias := v_instancias || coalesce(
        (select array_agg(instancia) from public.whatsapp_conexoes where org_id = v_org), '{}');

      v_orgs_apagadas := v_orgs_apagadas || v_org;
      delete from public.organizacoes where id = v_org;
    else
      -- Se era proprietária, passa o bastão antes de sair.
      if exists (
        select 1 from public.org_membros
         where org_id = v_org and user_id = v_user and papel = 'proprietario'
      ) then
        select user_id into v_sucessor
          from public.org_membros
         where org_id = v_org and user_id <> v_user
         order by case papel when 'gestor' then 0 when 'tecnico' then 1 else 2 end, created_at
         limit 1;

        update public.org_membros
           set papel = 'proprietario'
         where org_id = v_org and user_id = v_sucessor;
      end if;

      delete from public.org_membros where org_id = v_org and user_id = v_user;
    end if;
  end loop;

  delete from public.profiles where id = v_user;

  return json_build_object(
    'orgs_apagadas', to_json(v_orgs_apagadas),
    'arquivos',      to_json(v_arquivos),
    'instancias',    to_json(v_instancias)
  );
end;
$$;

grant execute on function public.excluir_minha_conta() to authenticated;


-- ============================================================================
-- 12. MIGRAÇÃO v2 (papéis, convites, horário do WhatsApp, pneus)
--     Conteúdo idêntico a supabase/migracao-v2.sql.
-- ============================================================================

-- ============================================================================
--  MIGRAÇÃO v2 — rode no Supabase → SQL Editor. Pode rodar mais de uma vez.
--  (Já está incluída no final do schema.sql — este arquivo é só o pedaço novo.)
--
--  1. Papéis passam a valer no banco. Antes qualquer membro, até o "leitor",
--     podia criar, editar e excluir tudo, e mudar os dados da empresa.
--       proprietário / gestor -> tudo
--       técnico               -> registra manutenções, anexos e movimenta pneus
--       leitor                -> só consulta
--  2. Usuários criados pelo gestor entram direto na empresa (sem ganhar uma
--     empresa vazia própria), e quem é adicionado passa a abrir a empresa
--     que o adicionou.
--  3. Horário do resumo diário do WhatsApp por empresa.
--  4. Estoque de pneus com histórico de movimentações.
--  5. Exclusão de conta também devolve as fotos dos ativos para limpeza.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PERMISSÕES POR PAPEL
-- ---------------------------------------------------------------------------

-- Empresas em que o usuário pode registrar coisas (todos menos o leitor).
create or replace function public.user_org_ids_escrita()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.org_membros
   where user_id = auth.uid() and papel in ('proprietario', 'gestor', 'tecnico');
$$;

-- Cadastros (categorias, ativos, periódicas): leitura para todos, escrita só
-- para proprietário e gestor.
do $$
declare t text;
begin
  foreach t in array array['categorias', 'ativos', 'planos_manutencao'] loop
    execute format('drop policy if exists %I_rw on public.%I', t, t);
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format('drop policy if exists %I_insert on public.%I', t, t);
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format('drop policy if exists %I_delete on public.%I', t, t);

    execute format($f$create policy %I_select on public.%I for select to authenticated
      using (org_id in (select public.user_org_ids()))$f$, t, t);
    execute format($f$create policy %I_insert on public.%I for insert to authenticated
      with check (org_id in (select public.user_admin_org_ids()))$f$, t, t);
    execute format($f$create policy %I_update on public.%I for update to authenticated
      using (org_id in (select public.user_admin_org_ids()))
      with check (org_id in (select public.user_admin_org_ids()))$f$, t, t);
    execute format($f$create policy %I_delete on public.%I for delete to authenticated
      using (org_id in (select public.user_admin_org_ids()))$f$, t, t);
  end loop;
end $$;

-- Manutenções: técnico registra e corrige; apagar histórico é do gestor.
drop policy if exists manutencoes_rw     on public.manutencoes;
drop policy if exists manutencoes_select on public.manutencoes;
drop policy if exists manutencoes_insert on public.manutencoes;
drop policy if exists manutencoes_update on public.manutencoes;
drop policy if exists manutencoes_delete on public.manutencoes;

create policy manutencoes_select on public.manutencoes for select to authenticated
  using (org_id in (select public.user_org_ids()));
create policy manutencoes_insert on public.manutencoes for insert to authenticated
  with check (org_id in (select public.user_org_ids_escrita()));
create policy manutencoes_update on public.manutencoes for update to authenticated
  using (org_id in (select public.user_org_ids_escrita()))
  with check (org_id in (select public.user_org_ids_escrita()));
create policy manutencoes_delete on public.manutencoes for delete to authenticated
  using (org_id in (select public.user_admin_org_ids()));

-- Anexos: quem registra manutenção também anexa e remove fotos.
drop policy if exists manutencao_anexos_rw     on public.manutencao_anexos;
drop policy if exists manutencao_anexos_select on public.manutencao_anexos;
drop policy if exists manutencao_anexos_write  on public.manutencao_anexos;
drop policy if exists manutencao_anexos_insert on public.manutencao_anexos;
drop policy if exists manutencao_anexos_update on public.manutencao_anexos;
drop policy if exists manutencao_anexos_delete on public.manutencao_anexos;

create policy manutencao_anexos_select on public.manutencao_anexos for select to authenticated
  using (org_id in (select public.user_org_ids()));
create policy manutencao_anexos_insert on public.manutencao_anexos for insert to authenticated
  with check (org_id in (select public.user_org_ids_escrita()));
create policy manutencao_anexos_update on public.manutencao_anexos for update to authenticated
  using (org_id in (select public.user_org_ids_escrita()))
  with check (org_id in (select public.user_org_ids_escrita()));
create policy manutencao_anexos_delete on public.manutencao_anexos for delete to authenticated
  using (org_id in (select public.user_org_ids_escrita()));

-- Dados da empresa: só proprietário e gestor alteram.
drop policy if exists org_update on public.organizacoes;
create policy org_update on public.organizacoes for update to authenticated
  using (id in (select public.user_admin_org_ids()))
  with check (id in (select public.user_admin_org_ids()));

-- WhatsApp: todos veem o status; só proprietário e gestor conectam e configuram.
drop policy if exists whatsapp_conexoes_rw     on public.whatsapp_conexoes;
drop policy if exists whatsapp_conexoes_select on public.whatsapp_conexoes;
drop policy if exists whatsapp_conexoes_insert on public.whatsapp_conexoes;
drop policy if exists whatsapp_conexoes_update on public.whatsapp_conexoes;
drop policy if exists whatsapp_conexoes_delete on public.whatsapp_conexoes;

create policy whatsapp_conexoes_select on public.whatsapp_conexoes for select to authenticated
  using (org_id in (select public.user_org_ids()));
create policy whatsapp_conexoes_insert on public.whatsapp_conexoes for insert to authenticated
  with check (org_id in (select public.user_admin_org_ids()));
create policy whatsapp_conexoes_update on public.whatsapp_conexoes for update to authenticated
  using (org_id in (select public.user_admin_org_ids()))
  with check (org_id in (select public.user_admin_org_ids()));
create policy whatsapp_conexoes_delete on public.whatsapp_conexoes for delete to authenticated
  using (org_id in (select public.user_admin_org_ids()));

-- Storage: leitor só vê; os demais enviam e apagam arquivos da própria empresa.
drop policy if exists anexos_insert on storage.objects;
create policy anexos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'manutencoes'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids_escrita())
  );

drop policy if exists anexos_update on storage.objects;
create policy anexos_update on storage.objects for update to authenticated
  using (
    bucket_id = 'manutencoes'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids_escrita())
  );

drop policy if exists anexos_delete on storage.objects;
create policy anexos_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'manutencoes'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids_escrita())
  );

-- ---------------------------------------------------------------------------
-- 2. EQUIPE
-- ---------------------------------------------------------------------------

-- Quem é adicionado passa a abrir a empresa que o adicionou. Antes ficava na
-- empresa vazia criada no próprio cadastro, e parecia que o acesso não valia.
create or replace function public.adicionar_membro(
  p_org   uuid,
  p_email text,
  p_papel public.papel_membro default 'tecnico'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alvo uuid;
begin
  if not public.pode_gerenciar_equipe(p_org) then
    raise exception 'Você não tem permissão para gerenciar a equipe desta empresa.';
  end if;

  if p_papel = 'proprietario' then
    raise exception 'Não é possível criar outro proprietário.';
  end if;

  select id into v_alvo from auth.users where lower(email) = lower(trim(p_email)) limit 1;

  if v_alvo is null then
    raise exception 'Nenhum usuário com este e-mail. Use "Criar usuário" para cadastrar a pessoa.';
  end if;

  if exists (select 1 from public.org_membros where org_id = p_org and user_id = v_alvo) then
    raise exception 'Este usuário já faz parte da equipe.';
  end if;

  insert into public.org_membros (org_id, user_id, papel) values (p_org, v_alvo, p_papel);
  update public.profiles set org_atual = p_org where id = v_alvo;

  return 'ok';
end;
$$;

-- Troca o papel de alguém da equipe. O proprietário não muda por aqui.
create or replace function public.alterar_papel_membro(
  p_org   uuid,
  p_user  uuid,
  p_papel public.papel_membro
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_atual public.papel_membro;
begin
  if not public.pode_gerenciar_equipe(p_org) then
    raise exception 'Você não tem permissão para gerenciar a equipe desta empresa.';
  end if;

  if p_user = auth.uid() then
    raise exception 'Você não pode alterar o próprio papel.';
  end if;

  if p_papel = 'proprietario' then
    raise exception 'Não é possível criar outro proprietário.';
  end if;

  select papel into v_atual from public.org_membros where org_id = p_org and user_id = p_user;

  if v_atual is null then
    raise exception 'Esta pessoa não faz parte da equipe desta empresa.';
  end if;

  if v_atual = 'proprietario' then
    raise exception 'O papel do proprietário não pode ser alterado.';
  end if;

  update public.org_membros set papel = p_papel where org_id = p_org and user_id = p_user;
  return 'ok';
end;
$$;

-- Cadastro: quem foi criado pelo gestor (convite gravado em app_metadata, que
-- só a chave de serviço consegue definir) entra direto na empresa. Os demais
-- seguem como antes e ganham a própria empresa.
--
-- NUNCA ler o convite de raw_user_meta_data: esse campo vem do formulário de
-- cadastro e qualquer pessoa poderia se colocar dentro de outra empresa.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org     uuid;
  v_nome    text;
  v_empresa text;
  v_convite uuid;
  v_papel   public.papel_membro;
begin
  v_nome := coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(new.email, '@', 1));

  begin
    v_convite := nullif(new.raw_app_meta_data ->> 'convite_org', '')::uuid;
    v_papel   := coalesce(nullif(new.raw_app_meta_data ->> 'convite_papel', ''), 'tecnico')::public.papel_membro;
  exception when others then
    v_convite := null;
  end;

  if v_convite is not null and v_papel <> 'proprietario'
     and exists (select 1 from public.organizacoes where id = v_convite) then
    insert into public.profiles (id, nome, email, org_atual)
    values (new.id, v_nome, new.email, v_convite)
    on conflict (id) do update set org_atual = excluded.org_atual;

    insert into public.org_membros (org_id, user_id, papel)
    values (v_convite, new.id, v_papel)
    on conflict do nothing;

    return new;
  end if;

  v_empresa := coalesce(nullif(new.raw_user_meta_data ->> 'empresa', ''), 'Minha Empresa');

  insert into public.organizacoes (nome, criado_por)
  values (v_empresa, new.id)
  returning id into v_org;

  insert into public.profiles (id, nome, email, telefone, org_atual)
  values (new.id, v_nome, new.email, nullif(new.raw_user_meta_data ->> 'telefone', ''), v_org)
  on conflict (id) do update set org_atual = excluded.org_atual;

  insert into public.org_membros (org_id, user_id, papel)
  values (v_org, new.id, 'proprietario')
  on conflict do nothing;

  perform public.seed_categorias_padrao(v_org);

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. HORÁRIO DO RESUMO DO WHATSAPP (hora cheia, horário de Brasília)
-- ---------------------------------------------------------------------------
alter table public.whatsapp_conexoes
  add column if not exists horario_envio smallint not null default 8;

do $$ begin
  alter table public.whatsapp_conexoes
    add constraint whatsapp_horario_valido check (horario_envio between 0 and 23);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 4. ESTOQUE DE PNEUS
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.status_pneu as enum ('estoque', 'em_uso', 'recapagem', 'descartado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tipo_mov_pneu as enum
    ('entrada', 'instalacao', 'remocao', 'recapagem', 'retorno', 'inspecao', 'descarte');
exception when duplicate_object then null; end $$;

create table if not exists public.pneus (
  id                   uuid primary key default gen_random_uuid(),
  org_id               uuid not null references public.organizacoes (id) on delete cascade,
  numero_fogo          text not null,               -- marcação gravada no pneu
  marca                text not null,
  modelo               text,
  medida               text not null,               -- ex.: 295/80 R22.5
  dot                  text,                        -- semana/ano de fabricação (ex.: 2324)
  condicao             text not null default 'novo' check (condicao in ('novo', 'recapado', 'usado')),
  status               public.status_pneu not null default 'estoque',
  ativo_id             uuid references public.ativos (id) on delete set null,
  posicao              text,                        -- ex.: "Eixo 2 · Direito externo"
  horimetro_instalacao numeric(12,2),               -- KM/horímetro do veículo ao montar
  km_rodados           numeric(12,2) not null default 0,
  sulco_inicial_mm     numeric(5,2),
  sulco_atual_mm       numeric(5,2),
  pressao_psi          numeric(6,1),
  recapagens           int not null default 0,
  data_compra          date,
  valor_compra         numeric(12,2),
  fornecedor           text,
  nota_fiscal          text,
  localizacao          text,                        -- depósito / prateleira
  observacoes          text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (org_id, numero_fogo)
);

create table if not exists public.pneu_movimentacoes (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizacoes (id) on delete cascade,
  pneu_id     uuid not null references public.pneus (id) on delete cascade,
  tipo        public.tipo_mov_pneu not null,
  data        date not null default current_date,
  ativo_id    uuid references public.ativos (id) on delete set null,
  posicao     text,
  horimetro   numeric(12,2),                        -- KM/horímetro do veículo no momento
  sulco_mm    numeric(5,2),
  valor       numeric(12,2),                        -- custo (recapagem, conserto...)
  observacoes text,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_pneus_org        on public.pneus (org_id);
create index if not exists idx_pneus_ativo      on public.pneus (ativo_id);
create index if not exists idx_pneu_mov_pneu    on public.pneu_movimentacoes (pneu_id, data desc);
create index if not exists idx_pneu_mov_org     on public.pneu_movimentacoes (org_id);

drop trigger if exists trg_pneus_updated on public.pneus;
create trigger trg_pneus_updated before update on public.pneus
  for each row execute function public.set_updated_at();

-- Cada movimentação atualiza a situação do pneu. Roda como dono da tabela para
-- que o técnico possa montar/desmontar sem poder editar o cadastro do pneu.
create or replace function public.aplicar_movimentacao_pneu()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p        public.pneus%rowtype;
  v_rodado numeric(12,2) := 0;
begin
  select * into p from public.pneus where id = new.pneu_id for update;

  if not found or p.org_id <> new.org_id then
    raise exception 'Pneu não encontrado nesta empresa.';
  end if;

  if new.ativo_id is not null
     and not exists (select 1 from public.ativos where id = new.ativo_id and org_id = new.org_id) then
    raise exception 'Veículo não encontrado nesta empresa.';
  end if;

  if p.status = 'descartado' and new.tipo <> 'inspecao' then
    raise exception 'Este pneu já foi descartado.';
  end if;

  -- KM rodado desde a montagem, para quem está saindo do veículo.
  if p.status = 'em_uso' and new.tipo in ('remocao', 'recapagem', 'descarte')
     and new.horimetro is not null and p.horimetro_instalacao is not null then
    v_rodado := greatest(new.horimetro - p.horimetro_instalacao, 0);
  end if;

  if new.tipo = 'instalacao' then
    if new.ativo_id is null then
      raise exception 'Informe o veículo em que o pneu foi montado.';
    end if;
    if p.status = 'em_uso' then
      raise exception 'Este pneu já está montado. Registre a remoção antes.';
    end if;
    if p.status = 'recapagem' then
      raise exception 'Este pneu está na recapagem. Registre o retorno antes.';
    end if;
    if nullif(trim(new.posicao), '') is not null and exists (
      select 1 from public.pneus
       where org_id = new.org_id and ativo_id = new.ativo_id and status = 'em_uso'
         and lower(trim(posicao)) = lower(trim(new.posicao)) and id <> p.id
    ) then
      raise exception 'Já existe um pneu montado nessa posição deste veículo.';
    end if;

    update public.pneus
       set status = 'em_uso', ativo_id = new.ativo_id, posicao = nullif(trim(new.posicao), ''),
           horimetro_instalacao = new.horimetro,
           sulco_atual_mm = coalesce(new.sulco_mm, sulco_atual_mm)
     where id = p.id;

  elsif new.tipo = 'remocao' then
    if p.status <> 'em_uso' then
      raise exception 'Este pneu não está montado.';
    end if;
    new.ativo_id := coalesce(new.ativo_id, p.ativo_id);
    new.posicao  := coalesce(new.posicao, p.posicao);

    update public.pneus
       set status = 'estoque', ativo_id = null, posicao = null, horimetro_instalacao = null,
           km_rodados = km_rodados + v_rodado,
           sulco_atual_mm = coalesce(new.sulco_mm, sulco_atual_mm)
     where id = p.id;

  elsif new.tipo = 'recapagem' then
    if p.status = 'recapagem' then
      raise exception 'Este pneu já está na recapagem.';
    end if;
    new.ativo_id := coalesce(new.ativo_id, p.ativo_id);

    update public.pneus
       set status = 'recapagem', ativo_id = null, posicao = null, horimetro_instalacao = null,
           km_rodados = km_rodados + v_rodado,
           sulco_atual_mm = coalesce(new.sulco_mm, sulco_atual_mm)
     where id = p.id;

  elsif new.tipo = 'retorno' then
    if p.status <> 'recapagem' then
      raise exception 'Este pneu não está na recapagem.';
    end if;

    update public.pneus
       set status = 'estoque', condicao = 'recapado', recapagens = recapagens + 1,
           sulco_atual_mm = coalesce(new.sulco_mm, sulco_atual_mm)
     where id = p.id;

  elsif new.tipo = 'descarte' then
    new.ativo_id := coalesce(new.ativo_id, p.ativo_id);

    update public.pneus
       set status = 'descartado', ativo_id = null, posicao = null, horimetro_instalacao = null,
           km_rodados = km_rodados + v_rodado,
           sulco_atual_mm = coalesce(new.sulco_mm, sulco_atual_mm)
     where id = p.id;

  elsif new.tipo = 'inspecao' then
    update public.pneus
       set sulco_atual_mm = coalesce(new.sulco_mm, sulco_atual_mm)
     where id = p.id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_aplicar_movimentacao_pneu on public.pneu_movimentacoes;
create trigger trg_aplicar_movimentacao_pneu
  before insert on public.pneu_movimentacoes
  for each row execute function public.aplicar_movimentacao_pneu();

grant select, insert, update, delete on public.pneus, public.pneu_movimentacoes to authenticated;

alter table public.pneus              enable row level security;
alter table public.pneu_movimentacoes enable row level security;

drop policy if exists pneus_select on public.pneus;
drop policy if exists pneus_insert on public.pneus;
drop policy if exists pneus_update on public.pneus;
drop policy if exists pneus_delete on public.pneus;

create policy pneus_select on public.pneus for select to authenticated
  using (org_id in (select public.user_org_ids()));
create policy pneus_insert on public.pneus for insert to authenticated
  with check (org_id in (select public.user_admin_org_ids()));
create policy pneus_update on public.pneus for update to authenticated
  using (org_id in (select public.user_admin_org_ids()))
  with check (org_id in (select public.user_admin_org_ids()));
create policy pneus_delete on public.pneus for delete to authenticated
  using (org_id in (select public.user_admin_org_ids()));

drop policy if exists pneu_mov_select on public.pneu_movimentacoes;
drop policy if exists pneu_mov_insert on public.pneu_movimentacoes;
drop policy if exists pneu_mov_delete on public.pneu_movimentacoes;

create policy pneu_mov_select on public.pneu_movimentacoes for select to authenticated
  using (org_id in (select public.user_org_ids()));
create policy pneu_mov_insert on public.pneu_movimentacoes for insert to authenticated
  with check (org_id in (select public.user_org_ids_escrita()));
create policy pneu_mov_delete on public.pneu_movimentacoes for delete to authenticated
  using (org_id in (select public.user_admin_org_ids()));

-- ---------------------------------------------------------------------------
-- 5. EXCLUSÃO DE CONTA: também devolve as fotos dos ativos
-- ---------------------------------------------------------------------------
create or replace function public.excluir_minha_conta()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user        uuid := auth.uid();
  v_org         uuid;
  v_outros      int;
  v_sucessor    uuid;
  v_orgs_apagadas uuid[] := '{}';
  v_arquivos    text[]   := '{}';
  v_instancias  text[]   := '{}';
begin
  if v_user is null then
    raise exception 'Usuário não autenticado';
  end if;

  for v_org in select org_id from public.org_membros where user_id = v_user loop
    select count(*) into v_outros
      from public.org_membros where org_id = v_org and user_id <> v_user;

    if v_outros = 0 then
      v_arquivos := v_arquivos
        || coalesce((select array_agg(path) from public.manutencao_anexos where org_id = v_org), '{}')
        || coalesce((select array_agg(foto_url) from public.ativos
                      where org_id = v_org and foto_url is not null), '{}');
      v_instancias := v_instancias || coalesce(
        (select array_agg(instancia) from public.whatsapp_conexoes where org_id = v_org), '{}');

      v_orgs_apagadas := v_orgs_apagadas || v_org;
      delete from public.organizacoes where id = v_org;
    else
      if exists (
        select 1 from public.org_membros
         where org_id = v_org and user_id = v_user and papel = 'proprietario'
      ) then
        select user_id into v_sucessor
          from public.org_membros
         where org_id = v_org and user_id <> v_user
         order by case papel when 'gestor' then 0 when 'tecnico' then 1 else 2 end, created_at
         limit 1;

        update public.org_membros
           set papel = 'proprietario'
         where org_id = v_org and user_id = v_sucessor;
      end if;

      delete from public.org_membros where org_id = v_org and user_id = v_user;
    end if;
  end loop;

  delete from public.profiles where id = v_user;

  return json_build_object(
    'orgs_apagadas', to_json(v_orgs_apagadas),
    'arquivos',      to_json(v_arquivos),
    'instancias',    to_json(v_instancias)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. MENOR PRIVILÉGIO NAS FUNÇÕES NOVAS
--    Toda função nasce executável por PUBLIC; fecha e libera só o necessário.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;

grant execute on function public.user_org_ids()                                       to authenticated;
grant execute on function public.user_admin_org_ids()                                 to authenticated;
grant execute on function public.user_org_ids_escrita()                               to authenticated;
grant execute on function public.contexto_usuario()                                   to authenticated;
grant execute on function public.dashboard_resumo(uuid)                               to authenticated;
grant execute on function public.criar_workspace(text)                                to authenticated;
grant execute on function public.pode_gerenciar_equipe(uuid)                          to authenticated;
grant execute on function public.adicionar_membro(uuid, text, public.papel_membro)    to authenticated;
grant execute on function public.alterar_papel_membro(uuid, uuid, public.papel_membro) to authenticated;
grant execute on function public.remover_membro(uuid, uuid)                           to authenticated;
grant execute on function public.whatsapp_pendencias(uuid)                            to authenticated, service_role;
grant execute on function public.excluir_minha_conta()                                to authenticated;
