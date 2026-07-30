-- Auditoria de seguranca 2026-07-29 (F-9, funcional): parceiros_b2b so tem
-- policy de UPDATE pra staff (is_legado_staff) - o parceiro logado nunca
-- conseguiu salvar a propria pagina publica (logo/descricao), sempre falhava
-- por RLS. Nao da pra so criar policy de UPDATE com is_own_parceiro(id) pra
-- authenticated, porque RLS e por linha, nao por coluna - abriria status_
-- pagamento/plano_contratado/cnpj/email pra escrita do proprio parceiro
-- tambem, sem forma de restringir via GRANT (staff usa o MESMO role
-- authenticated, so diferenciado por RLS, entao GRANT por coluna afetaria
-- os dois igual). Função SECURITY DEFINER estreita em vez disso: so escreve
-- logo_url/descricao_publica, deriva o parceiro do auth.uid() (nao confia
-- em id vindo do client).
create or replace function public.atualizar_pagina_publica_parceiro(p_logo_url text, p_descricao_publica text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parceiro_id uuid;
begin
  select parceiro_id into v_parceiro_id
  from parceiros_usuarios
  where usuario_id = auth.uid()
  limit 1;

  if v_parceiro_id is null then
    raise exception 'Usuário sem parceiro vinculado';
  end if;

  update parceiros_b2b
  set logo_url = p_logo_url,
      descricao_publica = p_descricao_publica,
      updated_at = now()
  where id = v_parceiro_id;
end;
$$;

grant execute on function public.atualizar_pagina_publica_parceiro(text, text) to authenticated;

-- app/parceiro/page.tsx atualizado no mesmo commit pra chamar essa RPC em
-- vez de .from('parceiros_b2b').update(...) direto.
