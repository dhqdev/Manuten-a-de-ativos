-- ============================================================================
--  MIGRAÇÃO DE DESEMPENHO — rode no Supabase → SQL Editor
--
--  Antes, cada clique no menu disparava 5 consultas em SEQUÊNCIA ao banco
--  (perfil → membros → organização → lista de empresas → contagem de alertas).
--  Com ~400 ms de latência por consulta, só isso já segurava a tela por ~2 s.
--
--  Esta função devolve tudo de uma vez. Pode rodar mais de uma vez sem risco.
--  (Já está incluída no schema.sql — este arquivo é só o pedaço novo.)
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
