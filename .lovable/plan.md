

## Guia Tutorial para Novas Contas

Um tour interativo opcional que aparece **uma vez** após o onboarding, com dicas rápidas sobre as principais funcionalidades — com foco no Perfil Público.

### Como vai funcionar

1. **Flag no banco**: Adicionar coluna `tutorial_completed` (boolean, default false) na tabela `barbershops`
2. **Componente de Tour**: Criar `src/components/painel/AppTutorial.tsx` — um modal/stepper leve com 3-4 passos:
   - **Passo 1**: "Sua Agenda" — explica a tela principal
   - **Passo 2**: "Seus Serviços" — como cadastrar serviços
   - **Passo 3**: "Perfil Público" — como configurar e compartilhar o link da barbearia (foco principal)
   - **Passo 4**: "Pronto!" — botão para começar a usar
3. **Ativação**: No `Painel.tsx`, após verificar `onboarding_completed === true` e `tutorial_completed === false`, exibir o tutorial
4. **Pular a qualquer momento**: Botão "Pular" visível em todos os passos; ao pular ou finalizar, marca `tutorial_completed = true`
5. **Design**: Modal com ilustrações simples (ícones do Lucide), progress dots, animações suaves — visual consistente com o app

### Detalhes técnicos

- **Migration**: `ALTER TABLE barbershops ADD COLUMN tutorial_completed boolean DEFAULT false;`
- **Componente**: Modal overlay com steps, usando estado local para navegação entre passos
- **Painel.tsx**: Verificar flag e renderizar `<AppTutorial />` condicionalmente
- **Atualização**: Ao fechar/pular/concluir → `UPDATE barbershops SET tutorial_completed = true`
- Contas existentes já terão `false` mas podem ser marcadas como `true` via migration se desejado (para não mostrar para quem já usa)

### Decisão necessária

Contas existentes devem ver o tutorial ou apenas novas contas a partir de agora?

