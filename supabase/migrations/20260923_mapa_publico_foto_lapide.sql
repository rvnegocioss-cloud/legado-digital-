-- Card de jazigo familiar no mapa público (2026-09-23).
--
-- Acrescenta `foto_lapide` (lapides.foto_face_url) às propriedades de cada pino
-- de obter_mapa_publico_cemiterio. O card do jazigo familiar mostra a foto da
-- lápide no topo e, embaixo, um retrato por homenageado; o retorno já trazia o
-- nome do jazigo, a contagem e a lista de homenageados, faltava só a foto.
--
-- Mudança só de FUNÇÃO -- nenhuma tabela/coluna alterada. Continua honrando o
-- mesmo filtro de privacidade de antes (oculto/sem busca/sem link/rascunho
-- nunca entram). CREATE OR REPLACE preserva o ACL: segue executável só por anon,
-- como já era (conferido depois de aplicar).
--
-- Desfazer: backups/rollback-obter_mapa_publico_cemiterio-2026-09-23.sql.

CREATE OR REPLACE FUNCTION public.obter_mapa_publico_cemiterio(p_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_cemiterio record;
  v_resultado jsonb;
begin
  select id, nome, cidade, estado, latitude, longitude,
    coalesce(entrada_latitude, latitude) as entrada_lat,
    coalesce(entrada_longitude, longitude) as entrada_lng,
    ortomosaico_url, ortomosaico_minzoom, ortomosaico_maxzoom, ortomosaico_bounds
  into v_cemiterio
  from cemiterios
  where slug = p_slug and ativo and publico;

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'cemiterio', jsonb_build_object(
      'nome', trim(v_cemiterio.nome),
      'cidade', trim(v_cemiterio.cidade),
      'estado', upper(trim(v_cemiterio.estado)),
      'latitude', v_cemiterio.entrada_lat,
      'longitude', v_cemiterio.entrada_lng,
      'ortomosaico_url', v_cemiterio.ortomosaico_url,
      'ortomosaico_minzoom', v_cemiterio.ortomosaico_minzoom,
      'ortomosaico_maxzoom', v_cemiterio.ortomosaico_maxzoom,
      'ortomosaico_bounds', v_cemiterio.ortomosaico_bounds
    ),
    'memoriais', (
      select jsonb_build_object('type', 'FeatureCollection', 'features', coalesce(jsonb_agg(f), '[]'::jsonb))
      from (
        select jsonb_build_object(
          'type', 'Feature',
          'geometry', jsonb_build_object('type', 'Point', 'coordinates', jsonb_build_array(l.longitude, l.latitude)),
          'properties', jsonb_build_object(
            'lapide_codigo', l.codigo,
            -- Nome do jazigo ("Jazigo Familia Saraiva"): com mais de um
            -- memorial no mesmo tumulo, e assim que o card se apresenta.
            'jazigo_nome', l.nome,
            -- Foto da lapide, pro card de jazigo familiar.
            'foto_lapide', l.foto_face_url,
            'total', count(h.id),
            'slug', (array_agg(h.slug order by h.nome_completo))[1],
            -- protegido = a pagina pede senha/cadastro pra abrir. O nome e a
            -- foto continuam aparecendo no card.
            'protegido', bool_and(coalesce(s.modo_gate, 'aberto') <> 'aberto'),
            'nome', (array_agg(h.nome_completo order by h.nome_completo))[1],
            'foto_url', (array_agg(h.foto_url order by h.nome_completo))[1],
            'memoriais', jsonb_agg(
              jsonb_build_object(
                'slug', h.slug,
                'protegido', coalesce(s.modo_gate, 'aberto') <> 'aberto',
                'nome', h.nome_completo,
                'foto_url', h.foto_url
              ) order by h.nome_completo
            )
          )
        ) as f
        from homenagens h
        join lapides l on l.id = h.lapide_id and l.cemiterio_id = v_cemiterio.id
        left join homenagens_seguranca s on s.homenagem_id = h.id
        where l.latitude is not null and l.longitude is not null
          and h.slug is not null and h.slug not like 'rascunho-%'
          and h.nome_completo is not null and h.nome_completo <> '' and h.nome_completo <> 'Novo memorial'
          and coalesce(s.modo_gate, 'aberto') <> 'oculto'
          and coalesce(s.busca_habilitada, true)
          and coalesce(s.link_habilitado, true)
        group by l.id, l.codigo, l.nome, l.foto_face_url, l.latitude, l.longitude
        limit 5000
      ) agrupado
    )
  ) into v_resultado;

  return v_resultado;
end;
$function$;
