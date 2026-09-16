aco# Ata Reunião de Sócios — 16/07/2026

Fonte: transcrição Gemini do Google Drive ("Reunião iniciada às 2026_07_16 11_01 GMT-03_00"). Presentes: Rafael Abrão, Pedro Saraiva, Ricardo Rodrigues Alves.

## Decisão importante tomada

**Modelo de negócio definido: parceria só (B2B2C).** Funerárias oferecem o Legado Digital como benefício adicional aos clientes. Monetização via taxa anual integrada aos planos já existentes das funerárias — não é venda direta pra família.

## Próximas etapas — status

### Rafael Abrão
- [x] Menu sanfona (lateral expansível/retrátil)
- [ ] Teste de e-mail depois do domínio definido — domínio (`legadodigital.net`) resolvido, teste ainda falta
- [x] **Corrigir busca familiar no portal com acesso restrito por senha** — diagnosticado e corrigido em 16/09/2026. A busca da tela de login usava a mesma função da busca pública, que esconde memorial com `modo_gate = 'oculto'` ou busca desligada. Resultado: a família que escondia o próprio memorial não conseguia mais achá-lo pra entrar, mesmo sabendo a senha. Agora `/api/familia-login` aceita **nome + senha** (sem slug), procurando sem filtro de privacidade e conferindo a senha — com resposta genérica pra ninguém descobrir memorial escondido testando nomes.
- [x] Cadastro de parceiros com validação via Receita Federal (CNPJ)
- [ ] Landing page separada voltada pra família (estrutura própria, não a principal)
- [x] **Pesquisar alternativa ao Google Maps pro mapeamento interno** — resolvido desde 04/08/2026, só não estava marcado aqui. O projeto **não usa Google Maps em lugar nenhum**: o mapeamento interno roda em **MapLibre GL** com **ortomosaico real de drone** servido em **PMTiles** (arquivo único em storage estático, sem servidor de tiles), mais satélite Esri como fundo quando o cemitério ainda não tem voo. Detalhe técnico em `docs/mapa.md`.
- [ ] Finalizar etapas pendentes antes da readequação visual
- [ ] Ajustar design profissional (depois de finalizar estrutura + computador novo)

### Pedro Saraiva
- [ ] Verificar/analisar página do cemitério
- [ ] Configurar e-mail com domínio oficial escolhido — domínio resolvido, configuração falta

### Ricardo Rodrigues Alves
- [ ] Plano de negócio + precificação + modelos de parceria
- [ ] Validar modelo comercial com parceiros em potencial
- [ ] Agendar reunião presencial dia 24, 08:30-10:00, na empresa

## Ideia solta (Pedro, não é tarefa formal ainda)

Área de "Preferências" no menu do usuário — dados pessoais, e-mail, sair. Ainda não registrada como pendência de verdade.

## O que está no meu alcance pra construir agora

Itens 2, 3, 5, 6 (Rafael) e 9, 10 (Pedro) — todos técnicos, não dependem de decisão de negócio. O resto (Ricardo) é ação dele fora do sistema.
