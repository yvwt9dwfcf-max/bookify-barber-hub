# Nova Agenda Bookify — idêntica às imagens aprovadas

Reconstruir a agenda do painel para ficar igual às duas imagens aprovadas (Individual e Equipe), mantendo toda a lógica atual: agendamentos, bloqueios, intervalos, status, realtime, permissões e dialogs.

## Visão Individual (imagem 1 — tablet da bancada)

Nova grade contínua vertical que substitui a lista de slots atual:

- Régua de horários fixa à esquerda, marcas de hora cheia mais fortes, meia hora mais suave.
- Cards de agendamento com **altura proporcional à duração real** (não mais linhas fixas de 15 min).
- Card: horário pequeno + nome do cliente em destaque + serviço; canto com status (Confirmado / Em atendimento / Concluído).
- **Linha do "agora"** verde atravessando a grade quando o dia é hoje, com ponto na régua; grade abre já rolada para o horário atual.
- Espaços vagos: toque abre direto "Novo agendamento" naquele horário; gesto longo ou botão discreto oferece "Bloquear horário".
- Intervalo de almoço aparece como faixa hachurada discreta com rótulo "Intervalo".
- Resumo do dia no topo: clientes do dia, faturamento previsto, vagas restantes.

## Visão Equipe (imagem 2 — colunas lado a lado)

Evoluir o `TeamAgendaView` atual para ficar idêntico à imagem:

- Cabeçalho fixo com foto, nome e "Próx. HH:mm" de cada barbeiro.
- Colunas com rolagem horizontal suave; grade compartilhada de 30 min.
- Cards proporcionais à duração, borda sutil, nome do cliente em destaque.
- Linha do "agora" atravessando todas as colunas.
- Intervalo e bloqueios como faixas discretas; slots fora do expediente esmaecidos.

## Visão Semana

- Grade dos próximos 7 dias: colunas por dia, cards compactos por agendamento, toque abre o dia na visão Individual.

## Navegação

- Seletor no topo: **Dia · Equipe · Semana** (segmentado, estilo app nativo), substituindo o seletor atual "Clássica/Equipe".
- Seletor de barbeiro mantido na visão Dia; strip de dias mantido.

## O que NÃO muda

- Busca de dados, realtime, permissões (MASTER/BARBER), dialogs de criar/editar/detalhes/bloqueio, comanda, fidelidade, feriados.
- Tema claro/escuro via tokens existentes; nada de cores fixas fora do padrão do app.

## Arquivos

- Novo: `src/components/painel/agenda/DayTimelineView.tsx` (grade contínua individual).
- Novo: `src/components/painel/agenda/WeekView.tsx`.
- Editado: `src/pages/painel/Agenda.tsx` (navegação Dia/Equipe/Semana), `TeamAgendaView.tsx` (visual da imagem 2).
- `AgendaSlotGrid.tsx` permanece como fallback até a nova grade estar validada; remoção só no final.
