# Reunião 04/09/2026 (Rafael + Pedro) — ajustes a executar

> Extraído da transcrição (Gemini). Um item por vez, marca `[x]` só depois de feito e confirmado.

## Landing page

1. [x] Padronizar menu e rodapé em todas as seções (hoje quebra a navegação ao entrar em cemitérios/sub-páginas)
2. [x] Corrigir alinhamento do rodapé e menu principal — centralizar conteúdo responsivo (achado ao vivo: "rodapé tá estrangulado")
3. [x] Destacar o mapa: imagem representativa do mapa de cemitérios + link de acesso direto na landing
4. [x] Reformular Área Restrita: remover "Legado Central", virar botão único "Área Restrita" → escolha entre funerária/parceiro ou família
5. [x] Separar login de cadastro: página única de acesso dividida (portal do parceiro vs formulário de captação de lead pro Ricardo)
6. [x] Manter menu/rodapé do site principal nas páginas de cemitério (não sumir a navegação ao entrar lá)

## Página do memorial

7. [ ] Galeria de fotos e vídeos no topo do memorial, ao lado do rosto (**vídeo em loop foi descartado pelo Rafael em 08/09** — não é isso)
8. [ ] Redimensionar campos de mídia pra acomodar vídeo/slide automático — substituir a galeria lateral por espaço visual centralizado
9. [ ] Ajustar texto: corrigir extensão pra caber nos componentes, implementar "ver mais" em vez de cortar/estourar
10. [ ] Adicionar indicação de usuário logado na interface (mostrar quem é o responsável pela sessão)
11. [ ] **Aguardando Pedro**: wireframe do posicionamento de rota/mapa/textos na tela principal do memorial — não mexe até o wireframe chegar

18. [ ] "Como Chegar" ficou escondido demais (lá embaixo) — subir um atalho pra ele mais perto do topo (só um botão que desce até a seção, ou destaca ela — **não mexe na lógica interna do mapa/rota**, regra 17, só a posição/visibilidade do link)

19. [ ] **Banner / fundo personalizado no perfil do memorial** (00:42:36) — Pedro sugeriu; Rafael ponderou a dificuldade de manter responsivo com imagem de tamanho variado. *(faltava na lista, achado na revisão de 08/09)*
20. [ ] **Galeria de mídia integrada** (00:45:05) — foto abrindo em pop-up maior e vídeo tocando sem poluir a interface; unificar foto+vídeo numa galeria só. *(faltava na lista)*
21. [ ] **Guia de navegação dentro do mapa de cemitérios** (01:09:35) — o visitante precisa entender como achar e acessar o túmulo da própria família. *(faltava na lista)*
22. [ ] **Cuidado de performance no mapa** (00:19:01) — destacar o mapa na landing sem carregar o mapa toda hora e pesar o servidor. *(faltava na lista — resolvido por enquanto: a landing usa imagem, não o mapa ao vivo)*

## Storytelling (direção de conteúdo, não tarefa fechada)

- Pedro (00:23:00): o site inteiro deve girar em torno de **"toda família tem uma história que deve ser eterna"**, misturando o visual com informação prática sobre cemitérios e memoriais. A landing já abre com "Toda Família Tem Uma História" — usar isso como régua ao escrever qualquer texto novo.
- Pedro (00:08:36): as imagens da landing focavam demais em público mais velho, podem ser adaptadas. *(várias já trocadas em 08/09)*

## Tarefas do Pedro (não são minhas)

- Enviar o wireframe da tela do memorial (trava o item 11)
- Testar geolocalização em campo no cemitério, calibrando a navegação por GPS
- Testar com 3 memoriais reais no fim de semana

## Debatido, sem decisão (não construir)

- Unificar Portal da Família dentro do mesmo painel do staff/parceiro (login único, perfil "família" com campos travados tipo QR Code) — Pedro sugeriu, Rafael ponderou que hoje tem coisa staff-only lá dentro que precisaria travar por perfil. **Não decidido**, ficou pra próxima conversa.

## Jazigos e gavetas (Portal da Família)

12. [ ] Jazigo + gavetas 3D visíveis no Portal da Família — **só visualização** (confirmado 08/09: quem cadastra é o parceiro) e no Portal do Parceiro
13. [ ] Restringir cadastro de gaveta: só aparecem memoriais já vinculados ao jazigo selecionado (esconder campo irrelevante)
14. [ ] Atalho direto no mapa → cadastro de gavetas no Portal da Família
15. [ ] Regra de vínculo: quem cria o 1º memorial daquele jazigo vira o gestor de todos os memoriais vinculados a ele
16. [x] Túmulo com múltiplos memoriais: hover no mapa mostra cartão com nome+foto de todos os homenageados daquele jazigo
17. [ ] Checar performance: visualizador 3D de gavetas deixa a página pesada?

## Combinado, sem ação de código agora

- Manter os 2 ambientes do sistema como já estão configurados (decisão explícita, não mexer)
- Pedro testa com 3 memoriais reais no fim de semana, aplica o wireframe proposto
- Reunião com Ricardo agendada pra semana que vem
