

## Problema
Na sidebar, o texto "Bookify" está muito grande (text-4xl no `md`) enquanto o ícone/logo está pequeno. O usuário quer o **ícone da logo maior** e o **texto "Bookify" menor**.

## Plano

### Ajustar proporções no `Logo.tsx`

Inverter a proporção — logo maior, texto menor:

| Size | Imagem atual → nova | Texto atual → novo |
|------|--------------------|--------------------|
| sm   | 38px → 48px        | text-2xl → text-lg |
| md   | 56px → 72px        | text-4xl → text-xl |
| lg