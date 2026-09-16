-- A família passa a nomear o jazigo e escrever quem está nas gavetas que ainda
-- não viraram memorial (2026-09-15, pedido do Rafael) -- a RPC precisa devolver
-- lapides.nome e gavetas.nome_sem_memorial, senão a tela da família abre sempre
-- em branco mesmo com dado salvo.
-- Só acrescenta 2 campos ao JSON; nenhum campo existente muda de nome ou sai.
-- (aplicado via MCP -- este arquivo é o registro)
create or replace function public.obter_jazigo_do_memorial(p_homenagem_id uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  v_lapide record;
  v_resultado jsonb;
begin
  select l.id, l.codigo, l.identificacao, l.nome, l.gestor_homenagem_id,
         c.nome as cemiterio_nome, c.cidade, c.estado, c.id as cemiterio_id
    into v_lapide
    from homenagens h
    join lapides l on l.id = h.lapide_id
    join cemiterios c on c.id = l.cemiterio_id
   where h.id = p_homenagem_id;

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'lapide_id', v_lapide.id,
    'codigo', v_lapide.codigo,
    'identificacao', v_lapide.identificacao,
    'nome', v_lapide.nome,
    'cemiterio_id', v_lapide.cemiterio_id,
    'cemiterio_nome', trim(v_lapide.cemiterio_nome),
    'cidade', trim(v_lapide.cidade),
    'estado', upper(trim(v_lapide.estado)),
    'gestor_homenagem_id', v_lapide.gestor_homenagem_id,
    'gavetas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id,
        'codigo', g.codigo,
        'linha', g.linha,
        'coluna', g.coluna,
        'homenagem_id', g.homenagem_id,
        'nome', h.nome_completo,
        'slug', h.slug,
        'nome_sem_memorial', g.nome_sem_memorial
      ) order by g.linha, g.coluna)
      from gavetas g
      left join homenagens h on h.id = g.homenagem_id
      where g.lapide_id = v_lapide.id
    ), '[]'::jsonb),
    -- Memorial vinculado ao tumulo mas ainda sem gaveta: e o que o cadastro
    -- precisa oferecer, e o que a familia precisa enxergar como pendente.
    'memoriais_sem_gaveta', coalesce((
      select jsonb_agg(jsonb_build_object('id', h.id, 'nome', h.nome_completo, 'slug', h.slug)
             order by h.nome_completo)
      from homenagens h
      where h.lapide_id = v_lapide.id
        and not exists (select 1 from gavetas g where g.homenagem_id = h.id)
    ), '[]'::jsonb)
  ) into v_resultado;

  return v_resultado;
end;
$function$;

-- Recriar funcao restaura o GRANT implicito pra PUBLIC -- pegadinha ja
-- documentada varias vezes neste projeto. So o service_role chama esta RPC
-- (rota /api/familia-jazigo), ninguem mais.
revoke execute on function public.obter_jazigo_do_memorial(uuid) from public;
revoke execute on function public.obter_jazigo_do_memorial(uuid) from anon;
revoke execute on function public.obter_jazigo_do_memorial(uuid) from authenticated;
