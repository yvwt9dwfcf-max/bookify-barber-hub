

## Plano: Video Promocional Profissional do Bookify (Remotion)

### Conceito Criativo

Video estilo anuncio premium de SaaS -- dark, elegante, com ritmo cinematografico. Sem moldura de celular (conforme pedido). Os screenshots reais aparecem como paineis flutuantes com bordas arredondadas, sombras e reflexos sutis, sobre um fundo dark com gradientes verdes.

### Direcao Visual

- **Paleta**: Dark (#0A0A0A fundo), Verde Bookify (#22C55E accent), branco/cinza para texto
- **Fonte**: Inter (display bold) + Inter (body regular)
- **Estetica**: Tech Product / Cinematic Minimal -- reveals suaves, parallax, tipografia grande
- **Motifs**: Glow verde sutil atras dos screenshots, particulas/linhas flutuantes, gradiente radial verde

### Roteiro (6 cenas, ~25 segundos, 30fps = 750 frames)

| Cena | Duracao | Conteudo | Screenshot |
|------|---------|----------|------------|
| 1 - Hook | 3s (90f) | Logo Bookify + "Sua barbearia. Online. Agora." com reveal cinematografico | Nenhum |
| 2 - Pagina Publica | 4s (120f) | "Seus clientes te encontram online" + screenshot da pagina publica com mapa (IMG_6912-2) | IMG_6912-2.png |
| 3 - Servicos | 4s (120f) | "Escolhem o servico" + screenshot da selecao de servico (IMG_6914) e lista de servicos do barbeiro (IMG_6913) | IMG_6913 + IMG_6914 |
| 4 - Agenda | 4s (120f) | "Agendam na hora" + screenshots do calendario e horarios (IMG_6915 + IMG_6916) | IMG_6915 + IMG_6916 |
| 5 - Confirmacao | 4s (120f) | "E pronto. Confirmado." + screenshot dos dados (IMG_6917) e confirmacao (IMG_6918) | IMG_6917 + IMG_6918 |
| 6 - Fechamento | 4s (120f) | "Bookify" + "Mais clientes, menos confusao" + "3 dias gratis" | Nenhum |

Transicoes de ~20 frames entre cenas (~690f total com overlaps).

### Animacoes

- Screenshots entram com spring slide-up + escala sutil, com glow verde atras
- Texto entra com clip-path reveal ou fade+translate
- Background: gradiente radial verde pulsando lentamente (sinusoidal)
- Transicoes: wipe ou fade entre cenas

### Estrutura de Arquivos

```text
remotion/
  src/
    index.ts
    Root.tsx
    MainVideo.tsx
    scenes/
      HookScene.tsx
      PublicPageScene.tsx
      ServicesScene.tsx
      ScheduleScene.tsx
      ConfirmScene.tsx
      ClosingScene.tsx
    components/
      ScreenshotFrame.tsx    (painel flutuante com rounded corners + shadow + glow)
      GradientBackground.tsx
  public/
    images/                  (screenshots copiados aqui)
  scripts/
    render-remotion.mjs
```

### Passos de Implementacao

1. Scaffold projeto Remotion, instalar deps, corrigir compositor
2. Copiar os 8 screenshots do usuario para `remotion/public/images/`
3. Criar componente `ScreenshotFrame` -- exibe screenshot sem moldura de celular, com rounded corners, sombra e glow verde
4. Criar `GradientBackground` -- fundo dark com gradiente radial verde animado
5. Construir as 6 cenas individuais com tipografia grande e screenshots
6. Montar `MainVideo.tsx` com `TransitionSeries` e transicoes
7. Renderizar MP4, QA visual, entregar em `/mnt/documents/`

### Saida

MP4 1920x1080, 30fps, ~25 segundos, salvo em `/mnt/documents/bookify-promo.mp4`

