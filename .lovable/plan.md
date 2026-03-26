

# Plano: Relatórios para Funcionários + Abas no Master + Melhorias Extras

## Resumo

Três frentes: (1) desbloquear relatórios para funcionários com visão individual, (2) adicionar abas no relatório do master separando "Barbearia" e "Meu Desempenho", (3) melhorias extras que vão deixar o app mais profissional e vendável.

---

## 1. Relatórios para Funcionários (Barbers)

Hoje o menu "Relatórios" só aparece para o master e a página bloqueia com "Acesso restrito". Vamos:

- Adicionar "Relatórios" no menu lateral para **todos** (não só master) em `Painel.tsx`
- Na página `Relatorios.tsx`, quando `isMaster === false`:
  - Filtrar **todos os dados pelo `barber_id` do funcionário logado**
  - Mostrar: faturamento pessoal, atendimentos, serviços mais realizados por ele, horários de pico dele
  - **Não mostrar**: ranking de barbeiros, meta mensal, dados de outros funcionários
  - Título: "Meu Desempenho" em vez de "Relatórios & Desempenho"
  - Exportar PDF só com os dados dele

---

## 2. Abas no Relatório do Master

Para o master, adicionar `Tabs` com duas abas:

- **"Barbearia"** — visão atual completa (faturamento total, ranking, meta mensal, todos os barbeiros)
- **"Meu Desempenho"** — filtra apenas pelos atendimentos do barber_id do master, mostrando o quanto **ele pessoalmente** faturou e atendeu (mesma estrutura visual do relatório do funcionário)

O `OutletContext` já traz o `barber` com o ID do master, então basta filtrar.

---

## 3. Melhorias Extras para Vender Mais

Ideias que fazem diferença real para 10-30k usuários:

| Melhoria | Impacto |
|---|---|
| **Notificação sonora/visual** quando chega agendamento novo na agenda | Dá sensação de app vivo, profissional |
| **Ticket médio** nos relatórios (faturamento / atendimentos) | Métrica que todo dono de barbearia quer ver |
| **Tempo médio de atendimento** nos relatórios | Ajuda a otimizar agenda |
| **Feedback pós-atendimento** (cliente avalia com estrelas via link) | Diferencial competitivo enorme |
| **Mensagem automática de confirmação** via WhatsApp ao agendar | Feature mais pedida em apps de agendamento |

Neste plano, vou implementar as **duas primeiras** (relatórios) e adicionar **ticket médio** como métrica bônus nos relatórios. As outras ficam como próximos passos.

---

## Arquivos Modificados

1. `src/pages/Painel.tsx` — liberar menu "Relatórios" para barbers
2. `src/pages/painel/Relatorios.tsx` — refatorar com abas (master) e visão individual (barber), adicionar ticket médio

## Detalhes Técnicos

- Usar `Tabs` do Radix já existente em `src/components/ui/tabs.tsx`
- O `OutletContext` já fornece `barber.id` e `isMaster` — sem necessidade de queries extras
- Filtro por barber_id: adicionar `.eq('barber_id', barber.id)` nas queries quando não é master ou na aba "Meu Desempenho"
- Ticket médio = `totalRevenue / totalAppointments` (simples, sem mudança no banco)
- Sem mudanças no banco de dados — tudo usa as tabelas e queries existentes

