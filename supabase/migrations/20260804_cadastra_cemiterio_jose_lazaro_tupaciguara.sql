-- Cemiterio real onde o drone (Rafael Rassi) voou, em frente ao Forum
-- Adolpho Fidelis dos Santos, Tupaciguara/MG. Coordenada vem do proprio
-- ortomosaico (centro real do voo), mais precisa que geocodificacao de
-- endereco. Nenhum dos 2 cemiterios ja cadastrados (bom pastor, Sao
-- Pedro) fica nessa regiao -- confirmado com o Rafael antes de inserir.
insert into public.cemiterios (nome, tipo, endereco, cidade, estado, latitude, longitude, observacoes)
values (
  'Cemitério Municipal José Lázaro',
  'cemiterio',
  'Rua Padre Simão Janet, Bairro Bom Sucesso (em frente ao Fórum Adolpho Fidélis dos Santos)',
  'Tupaciguara',
  'MG',
  -18.580750,
  -48.713671,
  'Primeiro cemitério mapeado com ortomosaico de drone (2026-08-04, captura de Rafael Rassi).'
);
