# Plano: Vídeo Bookify V3 — 4K, Mais Lento, Sem Dados Pessoais

## Resumo das Melhorias

O vídeo atual tem 27 segundos (810 frames a 30fps). O usuário pediu:

1. **Resolução 4K** (3840×2160) — dobrar a resolução de 1080p para 4K
2. **Vídeo mais lento** — mais tempo para ler os textos, aumentar duração para ~60-75 segundos
3. **Borrar informações pessoais** — emails, telefones. Nome dos clientes pode deixar 
4. **Melhor contraste de cores** — reduzir o verde excessivo, usar branco com acentos verdes pontuais para legibilidade
5. **Screenshots mobile** — mostrar as capturas em formato de celular (phone mockup)
6. **Screenshots atualizados** — capturar a agenda da segunda-feira de HOJE com os agendamentos reais

---

## Etapas de Implementação

### 1. Capturar Screenshots Atualizados

- Navegar pelo app real e capturar screenshots da agenda de hoje (segunda-feira) com os agendamentos que o usuário preparou
- Capturar fluxo de booking, relatórios, serviços, clientes
- **Borrar dados pessoais** em todas as capturas (emails, telefones, ) usando filtro blur via CSS no próprio Remotion ou editando as imagens

### 2. Atualizar Resolução para 4K

- `Root.tsx`: Mudar `width: 3840, height: 2160`
- Escalar todos os font-sizes, paddings, dimensões proporcionalmente (fator 2x)

### 3. Aumentar Duração das Cenas

- Total: ~2100 frames (70 segundos a 30fps)
- Scene 1 (Hook): 120 → 180 frames (~6s)
- Scene 2 (Problema): 120 → 210 frames (~7s)
- Scene 3 (Solução): 100 → 150 frames (~5s)
- Scene 4 (Dashboard): 150 → 300 frames (~10s) — mais tempo para ver a agenda real
- Scene 5 (Booking): 150 → 300 frames (~10s) — cada passo com mais tempo
- Scene 6 (Features): 120 → 240 frames (~8s)
- Scene 7 (CTA): 120 → 210 frames (~7s)
- Animações de entrada mais lentas, delays maiores entre elementos

### 4. Melhorar Paleta de Cores

- Reduzir o verde nos textos — usar branco puro para títulos principais
- Verde apenas para destaques pequenos (labels, badges, linhas de acento)
- Subtítulos em `rgba(255,255,255,0.7)` ao invés de `0.5` para mais legibilidade
- Background gradients mais suaves

### 5. Phone Mockups para Screenshots

- Nas cenas 4, 5 e 6: mostrar as capturas dentro de um mockup de celular (bordas arredondadas, notch, sombra)
- Estilo clean de apresentação de produto

### 6. Blur em Dados Pessoais

- Aplicar overlay divs com `filter: blur(8px)` posicionadas sobre áreas com dados pessoais nas screenshots
- Alternativa: processar as imagens antes com blur nas áreas sensíveis

### 7. Render

- Render em 4K com codec h264 e CRF baixo (18) para alta qualidade
- Output: `/mnt/documents/bookify-apresentacao-4k.mp4`

---

## Detalhes Técnicos

- **Composition**: `3840×2160`, 30fps, ~2100 frames
- **Fontes**: Manter Inter mas com tamanhos 2x para 4K
- **Render script**: Atualizar output path, manter `concurrency: 1` para estabilidade em 4K
- **Screenshots**: Capturar via browser tools em viewport adequado, borrar dados sensíveis
- **O vídeo pode ter: ate 2 minutos meio no máximo.** 
- **E você tem um prazo de me entregar em uma hora pode fazer tranquilo e bem profissionais o melhor jeito que a ferramenta pode fazer melhor jeito que você pode fazer**