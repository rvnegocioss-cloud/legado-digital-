-- Renumera uma quadra pro número REAL que o cemitério usa (o São Pedro tem
-- numeração própria da prefeitura -- 01-85 -- que não bate com a ordem em
-- que a gente descobre/desenha as quadras).
--
-- Não é só trocar quadras.numero: o número entra no código de todo túmulo
-- da quadra (Q02-R01-T005 -> Q36-R01-T005), então tem que regerar
-- codigo/identificacao/quadra de cada lápide junto, na mesma transação.
--
-- UNIQUE(cemiterio_id, numero) existe, então renumerar pra um número já
-- ocupado faz TROCA entre as duas quadras (via número negativo temporário,
-- que nunca colide) em vez de falhar -- é o caso normal quando se está
-- corrigindo a numeração inteira pro padrão oficial.
create or replace function public.renumerar_quadra(
  p_quadra_id uuid,
  p_numero_novo int,
  p_confirmar_recodificacao boolean default false
)
returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  v_quadra quadras%rowtype;
  v_outra quadras%rowtype;
  v_com_memorial int;
  v_afetadas int;
begin
  if not is_legado_staff() then raise exception 'sem permissao'; end if;
  if p_numero_novo is null or p_numero_novo < 1 then
    raise exception 'numero invalido';
  end if;

  select * into v_quadra from quadras where id = p_quadra_id;
  if not found then raise exception 'quadra nao encontrada'; end if;
  if v_quadra.numero = p_numero_novo then
    return jsonb_build_object('ok', true, 'trocou_com', null, 'lapides_recodificadas', 0);
  end if;

  select * into v_outra
  from quadras
  where cemiterio_id = v_quadra.cemiterio_id and numero = p_numero_novo;

  -- Túmulo já vinculado a memorial muda de código -> exige confirmação
  -- explícita (mesmo padrão de gerar_lapides_fila).
  select count(*) into v_com_memorial
  from lapides l
  join homenagens h on h.lapide_id = l.id
  where l.quadra_id = p_quadra_id
     or (v_outra.id is not null and l.quadra_id = v_outra.id);

  if v_com_memorial > 0 and not p_confirmar_recodificacao then
    raise exception 'RECODIFICACAO_EXIGE_CONFIRMACAO: % tumulo(s) com memorial vinculado mudam de codigo', v_com_memorial;
  end if;

  if v_outra.id is not null then
    -- Número negativo temporário: fora do CHECK de uso real, nunca colide.
    update quadras set numero = -v_quadra.numero where id = v_outra.id;
    update quadras set numero = p_numero_novo where id = p_quadra_id;
    update quadras set numero = v_quadra.numero where id = v_outra.id;
  else
    update quadras set numero = p_numero_novo where id = p_quadra_id;
  end if;

  -- Regera código das lápides das quadras afetadas. Só as que estão numa
  -- fileira com número -- lápide avulsa (fila_id/numero nulos) não tem
  -- código derivado, fica como está.
  with alvo as (
    select l.id, q.numero as q_num, f.numero as f_num, l.numero as t_num,
           coalesce(l.codigo, l.identificacao) as codigo_antigo
    from lapides l
    join quadras q on q.id = l.quadra_id
    join filas f on f.id = l.fila_id
    where l.quadra_id = p_quadra_id
       or (v_outra.id is not null and l.quadra_id = v_outra.id)
  )
  update lapides l set
    codigo_anterior = alvo.codigo_antigo,
    codigo = montar_codigo_tumulo(alvo.q_num, alvo.f_num, alvo.t_num),
    identificacao = montar_codigo_tumulo(alvo.q_num, alvo.f_num, alvo.t_num),
    quadra = alvo.q_num::text,
    lote = alvo.t_num::text
  from alvo
  where l.id = alvo.id;

  get diagnostics v_afetadas = row_count;

  return jsonb_build_object(
    'ok', true,
    'trocou_com', case when v_outra.id is not null then v_outra.numero else null end,
    'lapides_recodificadas', v_afetadas
  );
end;
$$;
revoke execute on function public.renumerar_quadra(uuid, int, boolean) from public, anon, authenticated;
grant execute on function public.renumerar_quadra(uuid, int, boolean) to authenticated;
