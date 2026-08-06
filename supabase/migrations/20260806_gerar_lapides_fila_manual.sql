-- Gerador de tumulos a partir de pontos ja ajustados pelo staff (drag
-- individual de cada pre-marcacao no dialogo "Gerar tumulos") em vez de
-- interpolar uniforme como gerar_lapides_fila -- corrige o desvio
-- progressivo quando o comprimento do eixo nao bate exato com a fileira
-- real. p_pontos: array jsonb [{lng, lat, exata}], ja na ordem final.

create or replace function public.gerar_lapides_fila_manual(
  p_fila_id uuid, p_pontos jsonb, p_substituir boolean default false
) returns setof lapides
language plpgsql security definer set search_path to 'public' as $$
declare
  v_fila filas%rowtype;
  v_quadra quadras%rowtype;
  v_existentes int;
  v_quantidade int;
  v_comprimento double precision;
  v_ponto jsonb;
  v_lat double precision;
  v_lng double precision;
  v_exata boolean;
  i int;
begin
  if not is_legado_staff() then raise exception 'sem permissao'; end if;

  select * into v_fila from filas where id = p_fila_id;
  if not found then raise exception 'fila nao encontrada'; end if;
  if v_fila.eixo is null then raise exception 'fila sem eixo desenhado'; end if;

  v_quantidade := jsonb_array_length(p_pontos);
  if v_quantidade < 1 or v_quantidade > 500 then raise exception 'quantidade invalida (1-500)'; end if;

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

  for i in 0..v_quantidade - 1 loop
    v_ponto := p_pontos -> i;
    v_lng := (v_ponto ->> 'lng')::double precision;
    v_lat := (v_ponto ->> 'lat')::double precision;
    v_exata := coalesce((v_ponto ->> 'exata')::boolean, false);

    insert into lapides (
      cemiterio_id, quadra_id, fila_id, numero, codigo, identificacao, quadra, lote,
      latitude, longitude, coordenada_origem, coordenada_precisao,
      coordenada_atualizada_em, coordenada_atualizada_por
    ) values (
      v_fila.cemiterio_id, v_fila.quadra_id, p_fila_id, i + 1,
      montar_codigo_tumulo(v_quadra.numero, v_fila.numero, i + 1),
      montar_codigo_tumulo(v_quadra.numero, v_fila.numero, i + 1),
      v_quadra.numero::text, (i + 1)::text,
      v_lat, v_lng, 'ortomosaico', case when v_exata then 'exata' else 'interpolada' end,
      now(), auth.uid()
    );
  end loop;

  v_comprimento := comprimento_polilinha(v_fila.eixo -> 'coordinates');

  update filas set
    quantidade_prevista = v_quantidade,
    comprimento_m = v_comprimento,
    espacamento_m = case when v_quantidade > 1 then v_comprimento / (v_quantidade - 1) else null end
  where id = p_fila_id;

  return query select * from lapides where fila_id = p_fila_id order by numero;
end;
$$;
revoke execute on function public.gerar_lapides_fila_manual(uuid, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.gerar_lapides_fila_manual(uuid, jsonb, boolean) to authenticated;
