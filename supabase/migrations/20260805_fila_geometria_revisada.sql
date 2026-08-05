-- Mesma trava de quadras.geometria_revisada, agora por fila -- pedido do
-- Rafael: trava fileira por fileira enquanto revisa (marca uma, trava,
-- passa pra proxima), nao só a quadra inteira no final. Menos risco de
-- perder trabalho -- e serve pra bloquear "Regerar tumulos" (que apaga e
-- recria tudo da fila) numa fila ja revisada/arrumada na mao.
alter table filas add column if not exists geometria_revisada boolean not null default false;
