# Correção do gráfico e clareza financeira

## Objetivo
Restaurar a leitura diária do faturamento mensal e melhorar a compreensão das telas financeiras sem mudar o visual existente ou as regras de negócio.

## Implementação
1. **Relatórios**
   - Remover o agrupamento especial que transforma o mês inteiro em uma única barra.
   - Gerar todos os dias do intervalo com `eachDayOfInterval`, incluindo dias sem faturamento com valor zero.

2. **Caixa**
   - Preservar o saldo como informação principal.
   - Unificar a ordem visual das movimentações por horário mais recente, sem alterar os dados ou cálculos.
   - Manter mensagem clara quando o dia não possuir movimentações.

3. **Despesas**
   - Dar maior destaque ao total de despesas do mês dentro do resumo existente.
   - Manter valores em real, listas em ordem decrescente de data e melhorar a mensagem vazia conforme os filtros aplicados.

4. **Produtos**
   - Priorizar itens com estoque baixo na lista, mantendo os demais em ordem alfabética.
   - Preservar o resumo e o estado vazio existentes, reforçando a leitura dos números com formatação estável.

5. **Comissões**
   - Destacar o total de comissões como número principal da tela.
   - Manter faturamento bruto, líquido da casa e atendimentos como contexto secundário.
   - Exibir uma mensagem clara quando há profissionais, mas ainda não há atendimentos concluídos no mês.

6. **Metas**
   - Tornar explícitos o progresso atual, o valor restante e o estado sem meta definida.
   - Manter os mesmos cards, barras, diálogos e comportamento de edição.

## Validação
- Confirmar compilação sem erros.
- Verificar que o filtro “Mês” gera um ponto/barra para cada dia do intervalo.
- Conferir telas financeiras em largura móvel, sem cortes ou mudança do padrão visual atual.
- Confirmar que cálculos, permissões, cadastros e edições continuam inalterados.
