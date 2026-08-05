-- RPCs do sistema de enderecamento (Quadra/Fila/Tumulo). Todas security
-- definer + search_path fixo + revoke de public/anon/authenticated seguido
-- de grant explicito so pro que precisa (padrao ja usado no projeto --
-- pegadinha documentada: recriar funcao restaura GRANT implicito pra
-- PUBLIC, sempre revogar de novo apos create/replace).

-- Helpers puros (sem acesso a tabela) --------------------------------

create or replace function public.distancia_metros(
  p_lat1 double precision, p_lng1 double precision,
  p_lat2 double precision, p_lng2 double precision
) returns double precision
language sql immutable set search_path to 'public' as $$
  select 6371000 * 2 * asin(sqrt(
    sin(radians(p_lat2 - p_lat1) / 2) ^ 2 +
    cos(radians(p_lat1)) * cos(radians(p_lat2)) * sin(radians(p_lng2 - p_lng1) / 2) ^ 2
  ));
$$;

create or replace function public.montar_codigo_tumulo(p_quadra int, p_fila int, p_numero int)
returns text
language sql immutable set search_path to 'public' as $$
  select 'Q' || lpad(p_quadra::text, 2, '0') || '-R' || lpad(p_fila::text, 2, '0') || '-T' || lpad(p_numero::text, 3, '0');
$$;

create or replace function public.comprimento_polilinha(p_coords jsonb)
returns double precision
language plpgsql immutable set search_path to 'public' as $$
declare
  n int := jsonb_array_length(p_coords);
  total double precision := 0;
  i int;
begin
  if n < 2 then return 0; end if;
  for i in 0..n - 2 loop
    total := total + distancia_metros(
      (p_coords -> i ->> 1)::double precision, (p_coords -> i ->> 0)::double precision,
      (p_coords -> (i + 1) ->> 1)::double precision, (p_coords -> (i + 1) ->> 0)::double precision
    );
  end loop;
  return total;
end;
$$;

-- Ponto a fracao [0,1] do comprimento acumulado da polilinha (GeoJSON
-- LineString coordinates, [lng,lat] cada vertice). Suporta mais de 2
-- vertices -- fileira que dobra, cada segmento interpolado por si.
create or replace function public.ponto_na_polilinha(p_coords jsonb, p_fracao double precision)
returns table(lat double precision, lng double precision)
language plpgsql immutable set search_path to 'public' as $$
declare
  n int := jsonb_array_length(p_coords);
  total double precision;
  alvo double precision;
  acumulado double precision := 0;
  i int;
  lat1 double precision; lng1 double precision; lat2 double precision; lng2 double precision;
  seg double precision;
  t double precision;
begin
  if n = 1 then
    lng := (p_coords -> 0 ->> 0)::double precision;
    lat := (p_coords -> 0 ->> 1)::double precision;
    return next;
    return;
  end if;

  total := comprimento_polilinha(p_coords);
  alvo := greatest(0, least(1, p_fracao)) * total;

  for i in 0..n - 2 loop
    lng1 := (p_coords -> i ->> 0)::double precision;
    lat1 := (p_coords -> i ->> 1)::double precision;
    lng2 := (p_coords -> (i + 1) ->> 0)::double precision;
    lat2 := (p_coords -> (i + 1) ->> 1)::double precision;
    seg := distancia_metros(lat1, lng1, lat2, lng2);

    if acumulado + seg >= alvo or i = n - 2 then
      t := case when seg = 0 then 0 else least(1, greatest(0, (alvo - acumulado) / seg)) end;
      lat := lat1 + (lat2 - lat1) * t;
      lng := lng1 + (lng2 - lng1) * t;
      return next;
      return;
    end if;

    acumulado := acumulado + seg;
  end loop;
end;
$$;

revoke execute on function public.distancia_metros(double precision, double precision, double precision, double precision) from public, anon;
revoke execute on function public.montar_codigo_tumulo(int, int, int) from public, anon;
revoke execute on function public.comprimento_polilinha(jsonb) from public, anon;
revoke execute on function public.ponto_na_polilinha(jsonb, double precision) from public, anon;
grant execute on function public.distancia_metros(double precision, double precision, double precision, double precision) to authenticated;
grant execute on function public.montar_codigo_tumulo(int, int, int) to authenticated;
grant execute on function public.comprimento_polilinha(jsonb) to authenticated;
grant execute on function public.ponto_na_polilinha(jsonb, double precision) to authenticated;

-- Distancias ate a entrada -------------------------------------------

create or replace function public.recalcular_distancias_entrada(p_cemiterio_id uuid)
returns void
language plpgsql security definer set search_path to 'public' as $$
declare
  v_lat double precision;
  v_lng double precision;
begin
  if not is_legado_staff() then raise exception 'sem permissao'; end if;

  select coalesce(entrada_latitude, latitude), coalesce(entrada_longitude, longitude)
    into v_lat, v_lng
  from cemiterios where id = p_cemiterio_id;

  if v_lat is null then raise exception 'cemiterio sem coordenada de entrada nem centro'; end if;

  update quadras set distancia_entrada_m = distancia_metros(v_lat, v_lng, centro_latitude, centro_longitude)
  where cemiterio_id = p_cemiterio_id and centro_latitude is not null;

  update filas f set distancia_entrada_m = distancia_metros(
    v_lat, v_lng,
    (f.eixo -> 'coordinates' -> 0 ->> 1)::double precision,
    (f.eixo -> 'coordinates' -> 0 ->> 0)::double precision
  )
  where f.cemiterio_id = p_cemiterio_id and f.eixo is not null;
end;
$$;
revoke execute on function public.recalcular_distancias_entrada(uuid) from public, anon, authenticated;
grant execute on function public.recalcular_distancias_entrada(uuid) to authenticated;

-- Numeracao de quadras --------------------------------------------------

create or replace function public.propor_numeracao_quadras(p_cemiterio_id uuid)
returns table(quadra_id uuid, numero_sugerido int, nome text, distancia_entrada_m double precision)
language plpgsql security definer set search_path to 'public' as $$
begin
  if not is_legado_staff() then raise exception 'sem permissao'; end if;
  perform recalcular_distancias_entrada(p_cemiterio_id);
  return query
    select q.id, row_number() over (order by q.distancia_entrada_m nulls last)::int, q.nome, q.distancia_entrada_m
    from quadras q where q.cemiterio_id = p_cemiterio_id
    order by q.distancia_entrada_m nulls last;
end;
$$;
revoke execute on function public.propor_numeracao_quadras(uuid) from public, anon, authenticated;
grant execute on function public.propor_numeracao_quadras(uuid) to authenticated;

create or replace function public.aplicar_numeracao_quadras(
  p_cemiterio_id uuid, p_ordem uuid[], p_confirmar_recodificacao boolean default false
) returns void
language plpgsql security definer set search_path to 'public' as $$
declare
  v_qtd_vinculada int;
  v_id uuid;
  v_num int;
begin
  if not is_legado_staff() then raise exception 'sem permissao'; end if;

  select count(*) into v_qtd_vinculada
  from lapides l join homenagens h on h.lapide_id = l.id
  where l.quadra_id = any(p_ordem);

  if v_qtd_vinculada > 0 and not p_confirmar_recodificacao then
    raise exception '% tumulo(s) com memorial vinculado terao o codigo alterado -- chame de novo com p_confirmar_recodificacao=true', v_qtd_vinculada;
  end if;

  update quadras set numero = numero + 100000 where cemiterio_id = p_cemiterio_id;

  v_num := 1;
  foreach v_id in array p_ordem loop
    update quadras set numero = v_num, numeracao_origem = 'manual', updated_at = now() where id = v_id;
    v_num := v_num + 1;
  end loop;

  update lapides l set
    codigo_anterior = l.codigo,
    codigo = montar_codigo_tumulo(q.numero, f.numero, l.numero),
    quadra = q.numero::text
  from quadras q, filas f
  where l.quadra_id = q.id and l.fila_id = f.id and q.cemiterio_id = p_cemiterio_id and l.numero is not null;
end;
$$;
revoke execute on function public.aplicar_numeracao_quadras(uuid, uuid[], boolean) from public, anon, authenticated;
grant execute on function public.aplicar_numeracao_quadras(uuid, uuid[], boolean) to authenticated;

-- Numeracao de filas ------------------------------------------------

create or replace function public.propor_numeracao_filas(p_quadra_id uuid)
returns table(fila_id uuid, numero_sugerido int, distancia_entrada_m double precision)
language plpgsql security definer set search_path to 'public' as $$
declare
  v_cemiterio_id uuid;
begin
  if not is_legado_staff() then raise exception 'sem permissao'; end if;
  select cemiterio_id into v_cemiterio_id from quadras where id = p_quadra_id;
  perform recalcular_distancias_entrada(v_cemiterio_id);
  return query
    select f.id, row_number() over (order by f.distancia_entrada_m nulls last)::int, f.distancia_entrada_m
    from filas f where f.quadra_id = p_quadra_id
    order by f.distancia_entrada_m nulls last;
end;
$$;
revoke execute on function public.propor_numeracao_filas(uuid) from public, anon, authenticated;
grant execute on function public.propor_numeracao_filas(uuid) to authenticated;

create or replace function public.aplicar_numeracao_filas(
  p_quadra_id uuid, p_ordem uuid[], p_confirmar_recodificacao boolean default false
) returns void
language plpgsql security definer set search_path to 'public' as $$
declare
  v_qtd_vinculada int;
  v_id uuid;
  v_num int;
  v_quadra_numero int;
begin
  if not is_legado_staff() then raise exception 'sem permissao'; end if;

  select count(*) into v_qtd_vinculada
  from lapides l join homenagens h on h.lapide_id = l.id
  where l.fila_id = any(p_ordem);

  if v_qtd_vinculada > 0 and not p_confirmar_recodificacao then
    raise exception '% tumulo(s) com memorial vinculado terao o codigo alterado -- chame de novo com p_confirmar_recodificacao=true', v_qtd_vinculada;
  end if;

  select numero into v_quadra_numero from quadras where id = p_quadra_id;

  update filas set numero = numero + 100000 where quadra_id = p_quadra_id;

  v_num := 1;
  foreach v_id in array p_ordem loop
    update filas set numero = v_num, numeracao_origem = 'manual', updated_at = now() where id = v_id;
    v_num := v_num + 1;
  end loop;

  update lapides l set
    codigo_anterior = l.codigo,
    codigo = montar_codigo_tumulo(v_quadra_numero, f.numero, l.numero),
    lote = l.numero::text
  from filas f
  where l.fila_id = f.id and f.quadra_id = p_quadra_id and l.numero is not null;
end;
$$;
revoke execute on function public.aplicar_numeracao_filas(uuid, uuid[], boolean) from public, anon, authenticated;
grant execute on function public.aplicar_numeracao_filas(uuid, uuid[], boolean) to authenticated;

-- Gerador de tumulos numerados (o motor do sistema) ------------------

create or replace function public.gerar_lapides_fila(
  p_fila_id uuid, p_quantidade int, p_substituir boolean default false
) returns setof lapides
language plpgsql security definer set search_path to 'public' as $$
declare
  v_fila filas%rowtype;
  v_quadra quadras%rowtype;
  v_existentes int;
  v_coords jsonb;
  v_frac double precision;
  v_lat double precision;
  v_lng double precision;
  i int;
begin
  if not is_legado_staff() then raise exception 'sem permissao'; end if;

  select * into v_fila from filas where id = p_fila_id;
  if not found then raise exception 'fila nao encontrada'; end if;
  if v_fila.eixo is null then raise exception 'fila sem eixo desenhado'; end if;
  if p_quantidade < 1 or p_quantidade > 500 then raise exception 'quantidade invalida (1-500)'; end if;

  select count(*) into v_existentes from lapides where fila_id = p_fila_id;
  if v_existentes > 0 and not p_substituir then
    raise exception 'fila ja tem % tumulo(s) -- passe p_substituir=true pra regerar', v_existentes;
  end if;

  select * into v_quadra from quadras where id = v_fila.quadra_id;

  if v_existentes > 0 and p_substituir then
    if exists (select 1 from lapides l join homenagens h on h.lapide_id = l.id where l.fila_id = p_fila_id) then
      raise exception 'fila tem tumulo com memorial vinculado -- nao da pra regerar sem perder o vinculo';
    end if;
    delete from lapides where fila_id = p_fila_id;
  end if;

  v_coords := v_fila.eixo -> 'coordinates';

  for i in 1..p_quantidade loop
    v_frac := case when p_quantidade = 1 then 0 else (i - 1)::double precision / (p_quantidade - 1) end;
    select p.lat, p.lng into v_lat, v_lng from ponto_na_polilinha(v_coords, v_frac) p;

    insert into lapides (
      cemiterio_id, quadra_id, fila_id, numero, codigo, identificacao, quadra, lote,
      latitude, longitude, coordenada_origem, coordenada_precisao,
      coordenada_atualizada_em, coordenada_atualizada_por
    ) values (
      v_fila.cemiterio_id, v_fila.quadra_id, p_fila_id, i,
      montar_codigo_tumulo(v_quadra.numero, v_fila.numero, i),
      montar_codigo_tumulo(v_quadra.numero, v_fila.numero, i),
      v_quadra.numero::text, i::text,
      v_lat, v_lng, 'ortomosaico', 'interpolada',
      now(), auth.uid()
    );
  end loop;

  update filas set
    quantidade_prevista = p_quantidade,
    comprimento_m = comprimento_polilinha(v_coords),
    espacamento_m = case when p_quantidade > 1 then comprimento_polilinha(v_coords) / (p_quantidade - 1) else null end
  where id = p_fila_id;

  return query select * from lapides where fila_id = p_fila_id order by numero;
end;
$$;
revoke execute on function public.gerar_lapides_fila(uuid, int, boolean) from public, anon, authenticated;
grant execute on function public.gerar_lapides_fila(uuid, int, boolean) to authenticated;

-- GeoJSON completo do cemiterio numa chamada so (evita o teto de 1000
-- linhas do PostgREST em select paginado -- achado real desta sessao) --

create or replace function public.obter_geojson_cemiterio(p_cemiterio_id uuid)
returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  v_parceiro_id uuid;
  v_resultado jsonb;
begin
  select parceiro_id into v_parceiro_id from cemiterios where id = p_cemiterio_id;
  if not (is_legado_staff() or is_own_parceiro(v_parceiro_id)) then
    raise exception 'sem permissao';
  end if;

  select jsonb_build_object(
    'quadras', (
      select jsonb_build_object('type', 'FeatureCollection', 'features', coalesce(jsonb_agg(
        jsonb_build_object(
          'type', 'Feature', 'geometry', q.poligono,
          'properties', jsonb_build_object('id', q.id, 'numero', q.numero, 'nome', q.nome, 'situacao', q.situacao, 'geometria_revisada', q.geometria_revisada)
        )
      ), '[]'::jsonb))
      from quadras q where q.cemiterio_id = p_cemiterio_id and q.poligono is not null
    ),
    'filas', (
      select jsonb_build_object('type', 'FeatureCollection', 'features', coalesce(jsonb_agg(
        jsonb_build_object(
          'type', 'Feature', 'geometry', f.eixo,
          'properties', jsonb_build_object('id', f.id, 'quadra_id', f.quadra_id, 'numero', f.numero, 'quantidade_prevista', f.quantidade_prevista)
        )
      ), '[]'::jsonb))
      from filas f where f.cemiterio_id = p_cemiterio_id and f.eixo is not null
    ),
    'lapides', (
      select jsonb_build_object('type', 'FeatureCollection', 'features', coalesce(jsonb_agg(
        jsonb_build_object(
          'type', 'Feature',
          'geometry', jsonb_build_object('type', 'Point', 'coordinates', jsonb_build_array(l.longitude, l.latitude)),
          'properties', jsonb_build_object(
            'id', l.id, 'codigo', l.codigo, 'numero', l.numero, 'situacao', l.situacao,
            'coordenada_origem', l.coordenada_origem, 'coordenada_precisao', l.coordenada_precisao,
            'tem_memorial', exists(select 1 from homenagens h where h.lapide_id = l.id)
          )
        )
      ), '[]'::jsonb))
      from lapides l where l.cemiterio_id = p_cemiterio_id and l.latitude is not null
    )
  ) into v_resultado;

  return v_resultado;
end;
$$;
revoke execute on function public.obter_geojson_cemiterio(uuid) from public, anon, authenticated;
grant execute on function public.obter_geojson_cemiterio(uuid) to authenticated;
