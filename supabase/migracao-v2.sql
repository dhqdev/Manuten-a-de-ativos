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
