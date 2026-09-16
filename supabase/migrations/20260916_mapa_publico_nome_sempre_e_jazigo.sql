-- Mapa público: o card sempre mostra nome e foto, e o jazigo com mais de um
-- memorial passa a se apresentar pelo nome da família (2026-09-16, Rafael).
--
-- Antes, memorial com senha/cadastro/lista de e-mail aparecia como "Memorial
-- protegido", sem nome e sem foto. Isso confundia o propósito das travas: elas
-- existem pra proteger o CONTEÚDO da página (história, fotos, mensagens), não
-- pra esconder de quem é o túmulo -- o nome já está gravado na pedra, a céu
-- aberto, pra quem passar no cemitério.
--
-- O que NÃO muda: 'oculto' continua fora do mapa por completo, e memorial com
-- busca ou link desligado também. Essas 3 são as travas de "não quero
-- aparecer"; as outras são de "não entra sem provar quem é".
--
-- Acrescenta também `jazigo_nome` (lapides.nome) nas properties do pino.
-- (aplicado via MCP -- este arquivo é o registro)
create or replace function public.obter_mapa_publico_cemiterio(p_slug text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
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
            -- Nome do jazigo ("Jazigo Família Saraiva"): com mais de um
            -- memorial no mesmo túmulo, é assim que o card se apresenta.
            'jazigo_nome', l.nome,
            'total', count(h.id),
            'slug', (array_agg(h.slug order by h.nome_completo))[1],
            -- protegido = a página pede senha/cadastro pra abrir. O nome e a
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
        group by l.id, l.codigo, l.nome, l.latitude, l.longitude
        limit 5000
      ) agrupado
    )
  ) into v_resultado;

  return v_resultado;
end;
$function$;

-- Recriar função restaura o GRANT implícito pra PUBLIC -- pegadinha já
-- documentada várias vezes. Esta RPC é o inverso do padrão: quem executa é o
-- visitante anônimo, nunca staff.
revoke execute on function public.obter_mapa_publico_cemiterio(text) from public;
revoke execute on function public.obter_mapa_publico_cemiterio(text) from authenticated;
grant execute on function public.obter_mapa_publico_cemiterio(text) to anon;
