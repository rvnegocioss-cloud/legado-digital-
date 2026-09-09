-- Rafael desligou a decoracao das laterais: sobre o banner de capa as faixas
-- cortavam a imagem nas bordas da tela. A opcao continua existindo no Portal
-- da Familia (pontos / petalas / ambos), so deixa de vir ligada por padrao.
alter table public.homenagens alter column ambiente_lateral set default 'nenhum';

update public.homenagens set ambiente_lateral = 'nenhum' where ambiente_lateral <> 'nenhum';
