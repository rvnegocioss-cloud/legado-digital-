-- Arvore Quadra->Fileira com contagem, pra pagina de lapides nova (colunas
-- de quadra lado a lado, fileiras retrateis dentro). RPC em vez de
-- select(...).lapides(count) do PostgREST -- mesmo padrao ja usado e testado
-- em obter_geojson_cemiterio nesta sessao, evita depender de um recurso do
-- PostgREST nao validado ainda. So contagens aqui -- os tumulos de uma
-- fileira especifica sao buscados so quando o staff expande ela (select
-- direto, bate no indice idx_lapides_fila).
--
-- Tambem devolve as 3 categorias de "fora de fileira" (achado real: 1
-- tumulo sem fileira com 3 memoriais vinculados -- essa distincao existe
-- pra sinalizar o caso mais arriscado primeiro).

create or replace function public.obter_arvore_lapides_cemiterio(p_cemiterio_id uuid)
returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  v_resultado jsonb;
begin
  if not pode_ver_cemiterio(p_cemiterio_id) then
    raise exception 'sem permissao';
  end if;

  select jsonb_build_object(
    'quadras', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', q.id, 'numero', q.numero, 'nome', q.nome, 'geometria_revisada', q.geometria_revisada,
          'filas', (
            select coalesce(jsonb_agg(
              jsonb_build_object(
                'id', f.id, 'numero', f.numero, 'geometria_revisada', f.geometria_revisada,
                'total_tumulos', (select count(*) from lapides l where l.fila_id = f.id)
              ) order by f.numero
            ), '[]'::jsonb)
            from filas f where f.quadra_id = q.id
          )
        ) order by q.numero
      ), '[]'::jsonb)
      from quadras q where q.cemiterio_id = p_cemiterio_id
    ),
    'fora_de_fileira', jsonb_build_object(
      'com_memorial', (
        select count(distinct l.id) from lapides l join homenagens h on h.lapide_id = l.id
        where l.cemiterio_id = p_cemiterio_id and l.fila_id is null
      ),
      'com_coordenada', (
        select count(*) from lapides l
        where l.cemiterio_id = p_cemiterio_id and l.fila_id is null and l.latitude is not null
        and not exists (select 1 from homenagens h where h.lapide_id = l.id)
      ),
      'sem_coordenada', (
        select count(*) from lapides l
        where l.cemiterio_id = p_cemiterio_id and l.fila_id is null and l.latitude is null
        and not exists (select 1 from homenagens h where h.lapide_id = l.id)
      )
    )
  ) into v_resultado;

  return v_resultado;
end;
$$;
revoke execute on function public.obter_arvore_lapides_cemiterio(uuid) from public, anon, authenticated;
grant execute on function public.obter_arvore_lapides_cemiterio(uuid) to authenticated;
