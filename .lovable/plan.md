# Agenda Bookify — cockpit nativo

## Objetivo
Substituir a agenda atual pela experiência aprovada nas imagens, preservando criação, edição, conclusão, exclusão, bloqueios, disponibilidade, permissões e atualização em tempo real.

## O que será construído
1. **Cabeçalho compacto**
   - Nome “Agenda”, profissional atual, avatar, data e resumo real do dia.
   - Controle principal com `Individual`, `Equipe` e `Semana`.
   - `Equipe` aparece somente para quem pode ver outros profissionais.
   - Calendário mensal continua acessível pelo seletor de data.

2. **Linha do tempo única**
   - Régua vertical contínua, cartões com altura proporcional à duração e linha do horário atual.
   - Horários livres tocáveis com “+ Encaixe”.
   - Intervalos e bloqueios hachurados, exibindo o motivo quando existir.
   - Cartões grafite com fitinha lateral, cliente, serviço, valor, horário e indicadores reais de origem/status.
   - Toque abre detalhes; ações existentes de editar, concluir e excluir continuam disponíveis.

3. **Três visualizações**
   - **Individual:** um profissional, leitura confortável para celular e tablet.
   - **Equipe:** profissionais em colunas, com rolagem horizontal e horários sincronizados.
   - **Semana:** sete dias do profissional selecionado, mantendo duração, bloqueios e disponibilidade.

4. **Personalização da agenda**
   - Menu discreto na própria agenda para escolher a paleta das fitinhas e a densidade da grade.
   - Preferência salva no aparelho, sem alterar dados comerciais ou regras da barbearia.
   - Paletas acessíveis e legíveis nos temas claro e escuro.

## Detalhes técnicos
- Criar um núcleo compartilhado para converter horários em posição/altura, usado nas três visualizações.
- Buscar somente o intervalo necessário em cada modo e manter isolamento por barbearia e permissões atuais.
- Não inventar estados vistos nas imagens: “Na cadeira”, “Online” e totais só aparecem quando puderem ser derivados de dados reais.
- Remover os seletores antigos redundantes apenas depois que seus recursos estiverem disponíveis no novo cabeçalho.
- Manter o calendário mensal, aviso de feriado, atualização manual, diálogos e botão de nova ação.

## Validação
- Testes das regras de posicionamento, duração, encaixe e visibilidade de Equipe por permissão.
- Conferência visual em celular, tablet e desktop, incluindo tema claro/escuro e nomes longos.
- Testar Individual, Equipe e Semana com compromissos, intervalos, bloqueios e dias vazios.
- Confirmar compilação e ausência de erros; o fluxo autenticado será validado até onde a conexão externa permitir.
