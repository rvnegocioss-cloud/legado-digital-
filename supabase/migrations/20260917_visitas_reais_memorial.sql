-- Visitas reais nos memoriais (2026-09-17, pedido do Rafael: "números têm que ser verdadeiros").
-- Antes: +1 a cada carregamento da página (recarregar, robô, prévia de link, automação)
-- -> Carlos Saraiva chegou a 27.648 em 31 dias. Agora: 1 visita por visitante, por
-- memorial, por dia. O visitante é só um código HMAC (IP + navegador + dia), gerado
-- no servidor; IP e nome nunca são guardados.

create table if not exists public.memorial_visitas (
  homenagem_id uuid not null references public.homenagens(id) on delete cascade,
  dia date not null,
  visitante text not null,
  primary key (homenagem_id, dia, visitante)
);
alter table public.memorial_visitas enable row level security;
-- sem policy: só service_role (página do memorial no servidor) escreve/lê
revoke all on public.memorial_visitas from anon, authenticated, public;

create or replace function public.registrar_visita(p_slug text, p_visitante text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
  v_novo int;
begin
  select id into v_id from homenagens where slug = p_slug;
  if v_id is null or coalesce(p_visitante, '') = '' then
    return;
  end if;
  insert into memorial_visitas (homenagem_id, dia, visitante)
  values (v_id, (now() at time zone 'America/Sao_Paulo')::date, p_visitante)
  on conflict do nothing;
  get diagnostics v_novo = row_count;
  if v_novo > 0 then
    update homenagens set visualizacoes = coalesce(visualizacoes, 0) + 1 where id = v_id;
  end if;
end;
$$;
revoke execute on function public.registrar_visita(text, text) from public, anon, authenticated;

-- Contador antigo (contava recarregamento) aposentado: sem chamador legítimo.
revoke execute on function public.incrementar_visualizacao(text) from public, anon, authenticated;

-- Dashboard: todo cemitério aparece, mesmo sem memorial (0 visitas); rascunho
-- ("Novo memorial" / slug rascunho-) não conta como memorial novo.
create or replace function public.admin_dashboard_metricas()
returns jsonb
language sql
stable
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'totalVisualizacoes', (select coalesce(sum(visualizacoes), 0) from homenagens),
    'novosMemoriais', (
      select count(*) from homenagens
      where created_at > now() - interval '7 days'
        and coalesce(slug, '') not like 'rascunho-%'
        and nome_completo <> 'Novo memorial'
    ),
    'topCemiterios', (
      select coalesce(jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'visualizacoes', total) order by total desc, nome), '[]'::jsonb)
      from (
        select c.id, c.nome, coalesce(sum(h.visualizacoes), 0) as total
        from cemiterios c
        left join lapides l on l.cemiterio_id = c.id
        left join homenagens h on h.lapide_id = l.id
        group by c.id, c.nome
      ) t
    ),
    'topParceiros', (
      select coalesce(jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'visualizacoes', total) order by total desc, nome), '[]'::jsonb)
      from (
        select p.id, coalesce(p.nome_fantasia, p.razao_social) as nome, coalesce(sum(h.visualizacoes), 0) as total
        from parceiros_b2b p
        left join homenagens h on h.parceiro_id = p.id
        group by p.id, coalesce(p.nome_fantasia, p.razao_social)
      ) t
    )
  );
$function$;
revoke execute on function public.admin_dashboard_metricas() from public, anon;
grant execute on function public.admin_dashboard_metricas() to authenticated;

-- Zera o contador inflado (backup feito antes: legado-digital-2026-09-17T12-04-05.sql).
update public.homenagens set visualizacoes = 0 where visualizacoes <> 0;
