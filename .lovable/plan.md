

# Correção: Tabs desproporcionais (Relatórios + Login)

## Problemas identificados

1. **Relatórios — Tabs "Barbearia" / "Meu Desempenho"**: As duas abas estão desproporcionais visualmente. O componente base `TabsList` usa `inline-flex` como padrão, que conflita com o `grid w-full grid-cols-2` aplicado. O `inline-flex` impede que o grid funcione corretamente, fazendo as abas ficarem com tamanhos diferentes.

2. **Login — Tabs "Entrar" / "Criar conta"**: Mesmo problema — as abas não encaixam bem no bloco por conflito entre `inline-flex` e `grid`.

## Solução

Corrigir os dois locais adicionando classes que sobrescrevam o `inline-flex` base:

### 1. `src/pages/painel/Relatorios.tsx` (linha 637)
- Adicionar `h-11 rounded-lg p-1` no `TabsList` para garantir altura e padding consistentes
- Adicionar `rounded-md h-full` nos `TabsTrigger` para que cada aba preencha o container por igual

### 2. `src/pages/Login.tsx` (linha 72)  
- Adicionar `h-full` nos `TabsTrigger` para preencher a altura do container
- Garantir que `rounded-md` está nos triggers

### 3. `src/components/ui/tabs.tsx` — Correção na raiz
- Trocar `inline-flex` por `flex` no `TabsList` base. Quando `grid` é aplicado via className, o `inline-flex` é sobrescrito, mas pode causar inconsistências em alguns browsers. Mudar para `flex` resolve o conflito de display sem quebrar outros usos.

## Arquivos modificados
1. `src/components/ui/tabs.tsx` — trocar `inline-flex` por `flex`
2. `src/pages/painel/Relatorios.tsx` — ajustar classes do TabsList e TabsTrigger
3. `src/pages/Login.tsx` — ajustar classes do TabsTrigger

