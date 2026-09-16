# Identidade editorial do Financeiro

## Objetivo
Atualizar somente a apresentação das telas financeiras indicadas para a identidade editorial já adotada no app. Preservar integralmente consultas, cálculos, dados, permissões, PDF, metas, comissões, vendas e interações existentes. A única mudança funcional será a série diária do gráfico mensal em Relatórios.

## Execução por blocos seguros

1. **Caixa**
   - Aplicar fundo e superfícies editoriais, bordas finas e tipografia de papel.
   - Usar Playfair Display nos saldos e valores principais; IBM Plex Mono nos rótulos.
   - Remover gradientes, sombras coloridas e fundos coloridos dos ícones.
   - Trocar negativos e alertas para o bordô editorial e deixar as barras finas, sólidas.
   - Aplicar `.btn-primary-solid` às ações principais.

2. **Despesas**
   - Redesenhar cabeçalho, resumo, gráfico por categoria, filtros, agrupamentos, listas e janela de cadastro com o mesmo padrão.
   - Manter cores de categorias apenas onde distinguem dados; negativos e exclusões usam o bordô editorial.
   - Preservar filtros, recorrência, paginação, edição e exclusão sem mudanças.

3. **Comissões**
   - Transformar resumo, cartões por profissional, métricas, campos de percentual e detalhes por serviço para a linguagem editorial.
   - Números principais em Playfair, rótulos em mono, ícones discretos e barra de margem fina sem gradiente.
   - Preservar percentuais padrão, exceções e salvamento exatamente como estão.

4. **Metas em Financeiro**
   - Atualizar os dois blocos de metas e suas janelas de edição.
   - Usar valores em Playfair, rótulos mono, progresso sólido de 3–4 px e `.btn-primary-solid` para salvar.
   - Não alterar fórmulas, consultas ou comportamento das metas.

5. **Produtos**
   - Aplicar o padrão editorial ao cabeçalho, indicadores, catálogo, alertas de estoque, insights, vendas recentes, formulário e carrinho flutuante.
   - Manter fotos, estoque, carrinho, upload, venda e exclusão exatamente iguais.

6. **Relatórios — gráfico mensal**
   - Remover o agrupamento especial que transforma o mês inteiro em uma barra.
   - Gerar, com `eachDayOfInterval`, um ponto para cada dia do intervalo mensal e somar o faturamento pela data do atendimento, incluindo dias sem vendas com valor zero.
   - Não alterar PDF, metas, filtros, demais gráficos ou cálculos.

## Regras visuais
- Reutilizar os tokens existentes para carvão, papel, verde e bordô; não introduzir cores avulsas nos componentes.
- Playfair Display apenas nos grandes números de destaque; conteúdo corrente continua legível e funcional.
- IBM Plex Mono em labels e categorias uppercase.
- Cartões sem gradiente ou brilho, com borda fina de papel translúcido.
- Ícones sem chips coloridos; botões principais com `.btn-primary-solid`.
- Manter a experiência móvel e os tamanhos de toque atuais.

## Validação
- Concluir e validar cada tela na ordem solicitada antes de avançar.
- Conferir compilação após os blocos e corrigir qualquer erro antes de parar.
- Verificar em viewport móvel Caixa, Despesas, Comissões, Metas e Produtos.
- Confirmar no gráfico de “Mês” que há uma barra por dia, sem regressão em “Hoje” e “7 dias”.
