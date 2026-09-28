# Serviços da Equipe — handoff

Módulo novo (v126, branch `develop`) pra equipe lançar serviços extras feitos, a admin aprovar e pagar tudo de uma vez por mês de vigência. A lógica veio do protótipo `prototipos/servicos-equipe.html` (standalone, dados só no navegador — bom pra testar fluxo sem tocar em banco nenhum).

## Onde está

- `index.html`: botão no menu (logo abaixo de Extras), painel `#panel-servicosequipe` e os modais (`modal-servico-equipe`, `modal-se-relatorio`, `modal-se-pagar`, `modal-se-recusar`, `modal-se-pessoa`).
- `js/app.js`: bloco `SERVIÇOS DA EQUIPE` (logo antes de `PERSISTÊNCIA`). Entrada: `renderServicosEquipePanel()`, chamada pelo `showPanel('servicosequipe')`.
- `css/styles.css`: bloco `SERVIÇOS DA EQUIPE` no fim.
- `backend/app/merge.py`: as 4 listas entraram em `MERGE_POR_ID` (precisa do restart do serviço, que o auto-deploy já faz quando `backend/` muda).

## Fluxo

1. Qualquer pessoa ligada ao cadastro lança um serviço (data, mês de vigência, tipo da tabela de preços ou "Outro", imóvel, qtd, valor). Entra como **pendente**. Lançado pela admin já entra **aprovado**.
2. A admin aprova/recusa (com motivo; a pessoa vê o motivo e, se editar, volta pra pendente).
3. **Fechamento**: escolhe o mês de vigência → total por pessoa, com PIX → relatório geral / um extrato por pessoa (impressão/PDF, WhatsApp) → **Registrar pagamento** marca tudo como pago num lote (dá pra desfazer em Pagamentos).
4. **Previsão de pagamento** = dia X (padrão 15) do mês seguinte à vigência. Configurável na aba Tabela de Preços. `dataPrevista` só é gravada quando a admin muda na mão; vazia = segue a regra.

## Dados (chaves de sync)

| Chave | Conteúdo |
|---|---|
| `nx_servicos_equipe` | lançamentos `{id, data, mesVigente, dataPrevista, membroId, tipoId, tipoNome, descricao, imovelNome, qtd, valorUnit, obs, status, motivoRecusa, criadoPor, criadoEm, aprovadoPor, aprovadoEm, pagamentoId}` |
| `nx_servicos_pessoas` | cadastro `{id, nome, funcao, telefone, documento, email, attId, pixTipo, pixChave, banco, agencia, conta, obs, ativo}` |
| `nx_servicos_tipos` | tabela de preços `{id, nome, valor, unidade}` (começa vazia) |
| `nx_servicos_pagamentos` | lotes `{id, dataPagamento, periodo:{modo,mes\|ini,fim}, dataPrevista, itens:[ids], totais:{pessoaId:valor}, total, obs, criadoEm}` |
| `nx_servicos_diapag` | número (dia do pagamento) |

- As 4 listas estão em `_MERGE_POR_ID_KEYS` (app.js) e `MERGE_POR_ID` (merge.py).
- **Ids**: tombstones são globais por id (valem pra todas as coleções), então pessoa semeada usa `pes_<attId>` e pessoa nova `pes_<timestamp>` — nunca o id cru da atendente.
- Atendentes (`ATTS`) viram pessoas automaticamente quando a admin abre o módulo (`_seSemearPessoasDasAtendentes`).

## Quem vê o quê

- Admin (`isAdmin()`): tudo, e é a única que aprova, fecha e paga.
- Login → pessoa: por `u.attId === pessoa.attId` (atendente) ou `u.email === pessoa.email` (qualquer outro login; campo "E-mail de login" no cadastro).
- Atendente com `attId` acessa o módulo sem precisar marcar em Usuários (mesma regra de Tarefas). Os outros perfis precisam do módulo marcado em Usuários **e** do e-mail no cadastro de pessoas.
- Quem não é admin só vê os próprios lançamentos e pagamentos (e o próprio extrato).

## Pendências / pra decidir

- **Dados sensíveis**: CPF e chave PIX ficam em `nx_servicos_pessoas`, que (como todo o blob) é baixado por qualquer login. A tela esconde de quem não é admin, mas o dado chega no navegador. Se for problema, esse cadastro devia sair do blob e ir pra um endpoint só-admin.
- **Permissão só no front**: aprovar/pagar é bloqueado na interface, não no servidor (igual ao resto do app hoje).
- **Notificações**: nada ainda. Gatilhos que fazem sentido: lançamento novo pendente (pra admin), recusado (pra pessoa), previsão de pagamento chegando/atrasada.
- Os valores são livres (sem ligação com KPI/Controle). Se quiser que o total pago entre em algum KPI ou no Controle, falta ligar.
- Testado localmente com sync desligado (fluxo completo + persistência após recarregar). Falta testar no staging com dois aparelhos (merge por id entre admin e atendente ao mesmo tempo).
