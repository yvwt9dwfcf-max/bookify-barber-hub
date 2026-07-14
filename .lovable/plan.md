
# Visão "Todos os Barbeiros" na Agenda

Adicionar um modo de visualização em **colunas lado a lado** (estilo Barber App / Cash Barber / Google Calendar) que o dono pode ativar por um botão de ícone na agenda, mostrando todos os barbeiros ao mesmo tempo no mesmo dia.

## O que muda visualmente

Um novo botão de ícone (grade — `LayoutGrid` do lucide) aparece no header da agenda, ao lado dos ícones "Diário" e "Mensal" que já existem. Aparece **só para o dono** (`canViewOthers` ou `isMaster`).

Quando o dono ativa:

- A tela vira uma grade horizontal com scroll: 
  - **Coluna fixa à esquerda** com os horários do dia (07:00, 07:30, 08:00…)
  - **Uma coluna por barbeiro** ao lado, com o nome + foto no topo (sticky)
  - Cada coluna mostra os agendamentos daquele barbeiro nos horários certos
- Slots vazios continuam clicáveis → abrem o dialog de agendamento manual **já com o barbeiro certo pré-selecionado**
- Cards de agendamento continuam clicáveis → abrem os detalhes / editar / finalizar normalmente
- Bloqueios e intervalos aparecem em cada coluna do barbeiro dono deles

O modo "Só minha agenda" continua sendo o padrão — o modo geral é um recurso extra, não substitui nada.

## Layout esperado (referência visual)

```text
┌──────┬──────────┬──────────┬──────────┐
│      │  João    │  Pedro   │  Lucas   │  ← header sticky com nome+foto
├──────┼──────────┼──────────┼──────────┤
│ 08:00│  [Cliente│          │  [Corte  │
│      │   A]     │          │   Barba] │
│ 08:30│          │  [Cliente│          │
│      │          │   B]     │          │
│ 09:00│  ⊕       │  ⊕       │  [João S]│
│ 09:30│  ⊕       │  ⊕       │          │
└──────┴──────────┴──────────┴──────────┘
     ← scroll horizontal quando tiver muitos barbeiros →
```

No mobile, cada coluna tem largura fixa (~140px) e o usuário desliza pra ver os outros barbeiros. A coluna de horários e o header dos barbeiros ficam fixos enquanto rola.

## Comportamento

- **Criar agendamento**: tocar num slot vazio de uma coluna abre o `ManualAppointmentDialog` já com aquele barbeiro selecionado e horário pré-preenchido
- **Ver/editar**: tocar num card abre o `AppointmentDetailsSheet` normal
- **Trocar de dia**: continua usando a mesma `AgendaDaysStrip` e os controles de dia que já existem
- **Realtime**: atualiza sozinho quando qualquer barbeiro recebe novo agendamento (assinatura ampla, sem filtro de barber_id no modo "todos")
- **Sem barbeiros suficientes**: se a barbearia só tem 1 barbeiro, o botão do modo geral fica escondido (não faz sentido)
- **Não-donos**: barbeiros que não podem ver a agenda dos outros nem enxergam o botão

## Implementação técnica

Arquivos a mexer/criar:

1. `src/components/painel/agenda/agendaUtils.ts` — adicionar `'all'` no tipo `ViewMode` (junto com `'daily'` e `'monthly'`)
2. `src/components/painel/agenda/AgendaHeader.tsx` — adicionar terceiro botão de ícone `LayoutGrid` (visível só quando `canViewOthers && barbers.length > 1`)
3. `src/components/painel/agenda/AllBarbersGrid.tsx` **(novo)** — o componente da grade multi-coluna: recebe `barbers`, `selectedDate`, `getOpeningHoursForDay`, callbacks de clique. Faz uma query única de appointments filtrando por `barbershop_id` e a data, e agrupa em memória por `barber_id`. Também busca blocked_slots de todos os barbeiros de uma vez.
4. `src/pages/painel/Agenda.tsx` — renderizar `<AllBarbersGrid />` quando `viewMode === 'all'`, esconder o seletor de barbeiro nesse modo (não faz sentido), e ao clicar num slot passar `{ time, barberId }` pro dialog manual.
5. `src/components/painel/ManualAppointmentDialog.tsx` — aceitar `preselectedBarberId` opcional pra já vir com o barbeiro certo travado (o dialog já suporta escolher barbeiro quando `canCreateForOthers`; só falta pré-selecionar).

## Regras de negócio preservadas

- Segurança RLS: como o dono já tem acesso a todos os agendamentos da barbearia, a query nova não abre nada novo. Barbeiros comuns nunca acessam esse modo.
- Nada muda no modo diário/mensal que já existe
- Nada muda em criação/edição/exclusão de agendamento — reusa os mesmos diálogos
- Nada muda no banco (nenhuma migration)
- Nada muda em performance na tela normal — o código novo só carrega quando o modo é ativado (lazy import do `AllBarbersGrid`)

## Fora do escopo (não faço agora)

- Arrastar cards entre barbeiros (drag & drop) — pode virar melhoria depois
- Modo semana (7 dias × N barbeiros) — outro passo
- Impressão / exportar agenda do dia — outro pedido

---

Se topar, aprova e eu implemento. Se quiser ajustar (ex: largura das colunas, mostrar ou não a foto do barbeiro no header, ordem dos barbeiros), me fala antes.
