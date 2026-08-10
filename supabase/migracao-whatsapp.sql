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
