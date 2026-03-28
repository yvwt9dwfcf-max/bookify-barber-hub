

## Plano: Video Promocional Completo do Bookify

### Problema Atual
O video atual usa apenas 7 dos 14 screenshots (IMG_6912-6918) e mostra somente o fluxo de agendamento online do cliente. As imagens IMG_6904 a IMG_6911 (painel do barbeiro, agenda, relatórios, clientes) não foram usadas.

### Nova Estrutura - 8 Cenas (~30s, 30fps)

| Cena | Frames | Conteudo | Imagens |
|------|--------|----------|---------|
| 1 - Hook | 90f | "Sua barbearia. Online. Agora." - reveal cinematografico | Nenhuma |
| 2 - Painel | 120f | "Gerencie tudo em um só lugar" - dashboard/painel do dono | IMG_6904, IMG_6905 |
| 3 - Agenda | 120f | "Sua agenda sempre organizada" - calendario e agendamentos | IMG_6906, IMG_6907 |
| 4 - Clientes | 100f | "Conheça seus clientes" - lista de clientes/relatórios | IMG_6909, IMG_6910, IMG_6911 |
| 5 - Pagina Publica | 120f | "Seus clientes te encontram online" - pagina publica | IMG_6912-2 |
| 6 - Servicos + Agenda | 120f | "Escolhem, agendam e confirmam" - fluxo completo | IMG_6913, IMG_6914, IMG_6915 |
| 7 - Confirmacao | 100f | "E pronto. Confirmado." - dados + confirmação | IMG_6916, IMG_6917, IMG_6918 |
| 8 - Fechamento | 120f | "Bookify - Mais clientes, menos confusão - 3 dias grátis" | Nenhuma |

Total: ~890f - 7 transições × 20f = ~750f (~25s)

### Mudanças Técnicas

1. **Criar 3 novas cenas**: `PainelScene.tsx`, `AgendaScene.tsx`, `ClientesScene.tsx` usando as imagens não utilizadas (IMG_6904-6911)
2. **Refatorar cenas existentes**: Combinar ServicesScene + ScheduleScene em uma cena mais dinâmica mostrando o fluxo completo do cliente
3. **Atualizar MainVideo.tsx**: Adicionar as novas cenas na TransitionSeries com