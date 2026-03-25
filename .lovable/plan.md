

# Plano: Limpeza de Código + Comportamento Nativo de App

## Resumo

Duas frentes: (1) remover arquivos e código morto para manter o projeto limpo e fácil de editar, e (2) bloquear zoom/pinch para que o app se comporte como um app nativo (Nubank, TikTok).

---

## 1. Bloquear Zoom (comportamento nativo)

O `index.html` já tem `user-scalable=no, maximum-scale=1.0`, o que funciona na maioria dos navegadores. Falta:

- **CSS `touch-action: manipulation`** no `html` e `body` dentro de `src/index.css` — isso impede double-tap-to-zoom no iOS/Android
- **Listener JS** no `main.tsx` para interceptar `gesturestart` e `wheel` com ctrlKey (previne pinch-zoom em WebViews e PWA)

### Código a adicionar:

**index.css** (dentro de `@layer base`, no bloco `html`):
```css
html {
  touch-action: manipulation;
}
```

**main.tsx** — adicionar antes do `createRoot`:
```typescript
// Prevent pinch-to-zoom (native app behavior)
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
```

---

## 2. Remover Arquivos e Código Morto

| Arquivo | Motivo |
|---|---|
| `src/App.css` | Nunca importado em nenhum lugar — CSS padrão do Vite, lixo |
| `src/components/NavLink.tsx` | Nunca importado em nenhum componente |
| `src/test/example.test.ts` | Teste placeholder vazio, não testa nada real |

### Ação:
- Deletar esses 3 arquivos (substituir por conteúdo vazio ou remover)

---

## 3. Viewport meta — já OK

O `index.html` já contém:
```
maximum-scale=1.0, user-scalable=no, viewport-fit=cover
```
Nenhuma mudança necessária aqui.

---

## Arquivos Modificados

1. `src/index.css` — adicionar `touch-action: manipulation`
2. `src/main.tsx` — adicionar listeners anti-zoom
3. `src/App.css` — deletar (não usado)
4. `src/components/NavLink.tsx` — deletar (não usado)
5. `src/test/example.test.ts` — deletar (placeholder vazio)

