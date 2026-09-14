# Performance de imagens, salvamento e Agenda

## Objetivo
Acelerar a percepção dos uploads, tornar o salvamento automático confiável e permitir atualização manual da Agenda, sem alterar regras ou o visual aprovado.

## Implementação
1. Criar um utilitário compartilhado para validar, redimensionar e comprimir imagens no navegador até 1600px, JPEG/WebP em aproximadamente 80%.
2. Aplicar prévia local imediata e compressão nos uploads de capa, logo, galeria, foto da barbearia e avatares; substituir a prévia pela imagem definitiva ao concluir e restaurar a anterior em caso de erro.
3. Estabilizar o salvamento automático do Perfil Público e dos campos que já usam auto-save: debounce de 1000ms, estados persistentes de salvando/salvo/erro, proteção contra respostas antigas e mensagem clara em falhas.
4. Adicionar um botão discreto de atualizar à Agenda, atualizando compromissos e disponibilidade sem apagar os dados atuais nem provocar piscadas.
5. Aplicar apenas otimizações pontuais comprovadas, como evitar busca duplicada da Agenda e upload sequencial desnecessário da galeria.

## Validação
- Confirmar compilação sem erros.
- Testar prévias locais, estados de upload, indicador de salvamento e botão de atualização em telas móveis.
- Confirmar que falhas preservam a imagem anterior e exibem retorno claro.
