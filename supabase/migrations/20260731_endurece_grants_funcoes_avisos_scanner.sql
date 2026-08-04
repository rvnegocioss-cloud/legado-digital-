-- Limpeza dos avisos WARN do scanner de seguranca (get_advisors) --
-- nenhum era vulnerabilidade ativa (cada um verificado antes de mexer),
-- mas fecha o alerta de verdade em vez de so documentar como aceito.

-- admin_dashboard_metricas sem search_path fixo -- mesmo padrao ja usado
-- em buscar_homenagens_publicas e outras funcoes do projeto.
create or replace function public.admin_dashboard_metricas()
returns jsonb
language sql stable
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'totalVisualizacoes', (select coalesce(sum(visualizacoes), 0) from homenagens),
    'novosMemoriais', (select count(*) from homenagens where created_at > now() - interval '7 days'),
    'topCemiterios', (
      select coalesce(jsonb_agg(jsonb_build_object('nome', nome, 'visualizacoes', total) order by total desc), '[]'::jsonb)
      from (
        select c.nome as nome, sum(h.visualizacoes) as total
        from homenagens h
        join lapides l on l.id = h.lapide_id
        join cemiterios c on c.id = l.cemiterio_id
        group by c.nome
        order by sum(h.visualizacoes) desc
        limit 5
      ) t
    ),
    'topParceiros', (
      select coalesce(jsonb_agg(jsonb_build_object('nome', nome, 'visualizacoes', total) order by total desc), '[]'::jsonb)
      from (
        select coalesce(p.nome_fantasia, p.razao_social) as nome, sum(h.visualizacoes) as total
        from homenagens h
        join parceiros_b2b p on p.id = h.parceiro_id
        group by coalesce(p.nome_fantasia, p.razao_social)
        order by sum(h.visualizacoes) desc
        limit 5
      ) t
    )
  );
$function$;

-- atualizar_pagina_publica_parceiro ja se protege por dentro (checa
-- auth.uid() e o parceiro vinculado, levanta excecao sem sessao valida --
-- anon sempre falha) mas nao tem motivo nenhum pra anon reter EXECUTE:
-- so parceiro autenticado chama isso de verdade (app/parceiro/page.tsx).
revoke execute on function public.atualizar_pagina_publica_parceiro(text, text) from anon;

-- incrementar_visualizacao e obter_localizacao_memorial: a pagina publica
-- (/homenagem/[slug]) le com service role desde a correcao de seguranca
-- desta sessao -- nao existe mais chamada legitima como anon nem
-- authenticated pra essas duas RPCs.
revoke execute on function public.incrementar_visualizacao(text) from anon, authenticated;
revoke execute on function public.obter_localizacao_memorial(text) from anon, authenticated;

-- set_updated_at() e funcao de trigger (homenagens_set_updated_at) --
-- nunca deveria ser chamavel direto via RPC, ninguem no codigo faz isso.
revoke execute on function public.set_updated_at() from anon, authenticated;

-- Mesmo achado do acender_vela nesta sessao: revogar so de anon/authenticated
-- nao bastava porque PUBLIC (grant implicito de quando a funcao foi criada)
-- ainda liberava execucao pra qualquer role, incluindo anon. Fechando de vez.
revoke execute on function public.incrementar_visualizacao(text) from public;
revoke execute on function public.obter_localizacao_memorial(text) from public;
revoke execute on function public.set_updated_at() from public;
revoke execute on function public.atualizar_pagina_publica_parceiro(text, text) from public;

-- atualizar_pagina_publica_parceiro precisa continuar chamavel por
-- authenticated (parceiro de verdade usa via app/parceiro/page.tsx) --
-- reforcando o grant explicito pra garantir que revogar de PUBLIC
-- (que authenticated tambem herdava) nao derrube o acesso real.
grant execute on function public.atualizar_pagina_publica_parceiro(text, text) to authenticated;
