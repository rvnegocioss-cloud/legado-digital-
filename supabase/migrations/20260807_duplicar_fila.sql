-- Duplicar fileira -- pedido do Rafael: fileiras dentro de uma quadra sao
-- geralmente paralelas e regulares, duplicar uma ja pronta (eixo + tumulos
-- ja calibrados) pra virar a proxima (ou uma escolhida a dedo, "aquela la
-- na frente") poupa desenhar+gerar+ajustar tudo de novo do zero.
--
-- O cliente manda a geometria FINAL ja transladada (eixo + pontos), o RPC
-- so grava numa transacao -- mesmo padrao ja usado em
-- gerar_lapides_fila_manual (WYSIWYG: o que foi aprovado no preview e
-- literalmente o que fica gravado, servidor nao recalcula por conta
-- propria).
--
-- Trust model (regra do projeto: geometria nova nasce nao-confirmada ate
-- revisao humana): a fileira nova SEMPRE nasce com geometria_revisada=false
-- mesmo copiando de uma origem travada (a copia e HIPOTESE de paralelismo,
-- nao verificacao); os tumulos copiados SEMPRE nascem coordenada_precisao=
-- 'interpolada' e situacao='nao_confirmada' (default da tabela), mesmo se
-- eram 'exata'/'confirmada' na origem -- exatidao foi verificada NAQUELE
-- lugar, nao neste.

create or replace function public.duplicar_fila(
  p_fila_origem_id uuid,
  p_numero_destino int,
  p_eixo jsonb,
  p_pontos jsonb default '[]'::jsonb,
  p_confirmar_preencher_vazia boolean default false
) returns uuid
language plpgsql security definer set search_path to 'public' as $$
declare
  v_origem filas%rowtype;
  v_quadra quadras%rowtype;
  v_destino filas%rowtype;
  v_fila_nova_id uuid;
  v_quantidade int;
  v_comprimento double precision;
  v_ponto jsonb;
  v_lat double precision;
  v_lng double precision;
  i int;
begin
  if not is_legado_staff() then raise exception 'sem permissao'; end if;

  select * into v_origem from filas where id = p_fila_origem_id;
  if not found then raise exception 'fileira de origem nao encontrada'; end if;
  if v_origem.eixo is null then raise exception 'fileira de origem sem eixo desenhado'; end if;

  select * into v_quadra from quadras where id = v_origem.quadra_id;
  if v_quadra.geometria_revisada then
    raise exception 'quadra travada -- destrava pra criar fileira nova';
  end if;

  if p_numero_destino < 1 or p_numero_destino > 999 then
    raise exception 'numero de fileira invalido (1-999)';
  end if;

  if p_eixo is null then raise exception 'eixo de destino nao informado'; end if;

  v_quantidade := jsonb_array_length(coalesce(p_pontos, '[]'::jsonb));
  if v_quantidade > 500 then raise exception 'quantidade invalida (max 500)'; end if;

  select * into v_destino from filas where quadra_id = v_origem.quadra_id and numero = p_numero_destino;

  if found then
    if v_destino.eixo is not null or exists (select 1 from lapides where fila_id = v_destino.id) then
      raise exception 'Fileira % ja existe nessa quadra com geometria/tumulos -- escolhe outro numero', p_numero_destino;
    end if;
    if not p_confirmar_preencher_vazia then
      raise exception 'Fileira % ja existe vazia -- confirme antes de preencher com a copia', p_numero_destino;
    end if;
    v_fila_nova_id := v_destino.id;
  end if;

  v_comprimento := comprimento_polilinha(p_eixo -> 'coordinates');

  if v_fila_nova_id is null then
    insert into filas (cemiterio_id, quadra_id, numero, eixo, comprimento_m, quantidade_prevista, numeracao_origem)
    values (
      v_origem.cemiterio_id, v_origem.quadra_id, p_numero_destino, p_eixo, v_comprimento,
      case when v_quantidade > 0 then v_quantidade else null end, 'manual'
    )
    returning id into v_fila_nova_id;
  else
    update filas set
      eixo = p_eixo,
      comprimento_m = v_comprimento,
      quantidade_prevista = case when v_quantidade > 0 then v_quantidade else null end,
      geometria_revisada = false,
      numeracao_origem = 'manual'
    where id = v_fila_nova_id;
  end if;

  if v_quantidade > 0 then
    for i in 0..v_quantidade - 1 loop
      v_ponto := p_pontos -> i;
      v_lng := (v_ponto ->> 'lng')::double precision;
      v_lat := (v_ponto ->> 'lat')::double precision;

      insert into lapides (
        cemiterio_id, quadra_id, fila_id, numero, codigo, identificacao, quadra, lote,
        latitude, longitude, coordenada_origem, coordenada_precisao,
        coordenada_atualizada_em, coordenada_atualizada_por
      ) values (
        v_origem.cemiterio_id, v_origem.quadra_id, v_fila_nova_id, i + 1,
        montar_codigo_tumulo(v_quadra.numero, p_numero_destino, i + 1),
        montar_codigo_tumulo(v_quadra.numero, p_numero_destino, i + 1),
        v_quadra.numero::text, (i + 1)::text,
        v_lat, v_lng, 'ortomosaico', 'interpolada',
        now(), auth.uid()
      );
    end loop;

    update filas set espacamento_m = case when v_quantidade > 1 then v_comprimento / (v_quantidade - 1) else null end
    where id = v_fila_nova_id;
  end if;

  return v_fila_nova_id;
end;
$$;
revoke execute on function public.duplicar_fila(uuid, int, jsonb, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.duplicar_fila(uuid, int, jsonb, jsonb, boolean) to authenticated;
