# Ajustes finos do perfil público e agendamento

## Objetivo
Aplicar somente os oito ajustes solicitados, preservando regras de agendamento, exclusões explícitas e o restante do visual.

## Alterações
1. Corrigir a confirmação para não herdar títulos anteriores e substituir o check atual por um selo de 90px com gradiente, brilho e contraste legível.
2. Padronizar títulos urbanos bicolores: primeira palavra na cor de destaque e todas as demais em branco/paper.
3. Usar a cor de destaque dinâmica em todos os anéis de fotos de profissionais na experiência pública.
4. Remover miniaturas dos serviços no painel público e retirar controles e rotinas de fotos da tela administrativa de Serviços.
5. Transformar campos textuais, tema, fonte, cor e galeria do Perfil Público em salvamento automático com debounce e indicador discreto; remover os dois botões manuais correspondentes.
6. Limitar a galeria a 12 fotos, inclusive em seleção múltipla, desabilitando a adição e mostrando a mensagem de limite. A exclusão continuará manual e explícita.

## Detalhes técnicos
- O autosave fará upsert no perfil existente e sincronizará a cidade da barbearia quando necessário.
- Uploads de capa e logo permanecerão como ações explícitas; seus URLs serão persistidos automaticamente após upload ou remoção.
- O limite de galeria será aplicado na interface e durante o processamento dos arquivos para evitar ultrapassagem por seleção múltipla.
- Nenhuma tabela, política, rota ou regra de disponibilidade será alterada.

## Validação
- Conferir compilação, erros no navegador e os fluxos público e administrativo em viewport móvel.
- Confirmar que a exclusão de foto ainda exige toque explícito e mostra retorno de sucesso/erro.
