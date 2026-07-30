-- Achado na auditoria sistematica 2026-07-30 (C3): /admin baixava a tabela
-- homenagens inteira (sem limit) + lapides + parceiros_b2b inteiras pro
-- navegador so pra somar visualizacoes em JS. Funciona com poucos registros,
-- vira payload de megabytes em escala. Agregacao movida pro Postgres.
create or replace function public.admin_dashboard_metricas()
returns jsonb
language sql
stable
as $$
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
$$;

grant execute on function public.admin_dashboard_metricas() to authenticated;
