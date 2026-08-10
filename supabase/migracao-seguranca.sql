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
