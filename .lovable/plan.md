# Aparência e galeria do Perfil Público

## Objetivo
Criar, somente na tela de edição do Perfil Público, uma área editorial para configurar aparência e administrar fotos. A página pública continuará visualmente e funcionalmente inalterada nesta etapa.

## Alterações
- Adicionar ao perfil público as preferências `theme_style`, `font_style`, `accent_color` e `gallery_enabled`, com padrões seguros e validação dos valores.
- Criar a seção **Aparência** com:
  - dois cartões de estilo com miniaturas reais;
  - duas opções de fonte renderizadas nas respectivas famílias;
  - seis cores de destaque com indicação visual da seleção;
  - controle para mostrar ou ocultar a galeria;
  - botão verde sólido para salvar apenas essas preferências.
- Criar a seção **Galeria** com:
  - carregamento das fotos já cadastradas em ordem;
  - seleção e envio de várias fotos pelo bucket existente `gallery-photos`;
  - criação dos registros correspondentes com ordem sequencial;
  - exclusão da foto no banco e no armazenamento;
  - estados claros de envio, vazio e erro.
- Preservar integralmente os demais campos, salvamentos e permissões atuais da tela.

## Detalhes técnicos
- Reutilizar o padrão existente de upload, mantendo os caminhos por barbearia para isolamento.
- Usar os componentes e tokens visuais existentes, com Playfair Display, IBM Plex Mono e Inter.
- Não editar `src/pages/BarbeariaPublica.tsx` nem fazer a nova configuração afetar sua consulta ou renderização.
- Validar o resultado com o build e uma conferência visual da tela autenticada, quando houver sessão disponível.

## Fora do escopo
- Aplicar estilo, fonte, cor ou visibilidade da galeria na página pública.
- Alterar regras de agendamento, autenticação ou qualquer outro módulo.
