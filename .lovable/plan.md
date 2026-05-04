Plano de ajuste

1. Corrigir a animação dos blocos da Home
- Reestruturar `StoryBlock` para ter duas fases claras no scroll:
  - Fase 1: frase centralizada aparece acima da imagem e sobe com o scroll.
  - Fase 2: depois que a frase já saiu/desapareceu, a imagem quadrada começa a expandir até cobrir toda a tela.
- Remover o comportamento em que o texto fica por cima da imagem durante a expansão.
- Ajustar os pontos de animação do Framer Motion para a frase sair mais cedo, especialmente no 2º bloco, evitando overlay.
- Manter a imagem sempre começando como um quadrado/card centralizado com borda arredondada e sombra suave.
- Fazer a expansão preencher a tela inteira de forma limpa, sem parecer que está cobrindo só o centro.
- Manter a tag do fornecedor aparecendo apenas quando a foto já estiver praticamente em tela cheia.

Estrutura visual pretendida:

```text
[frase centralizada]

      [foto quadrada]

scroll ↓

[frase sobe e some]

      [foto cresce]

scroll ↓

[foto ocupa a tela inteira]
[tag do fornecedor]
```

2. Atualizar a identidade visual de fontes
- Trocar o import atual de fontes em `index.html` para:
  `Young Serif + Nunito`
- Atualizar `tailwind.config.ts`:
  - `font-serif` / `font-display`: Young Serif
  - `font-sans`: Nunito
- Atualizar `src/index.css`:
  - `body`: Nunito 300, 14–16px, line-height 1.8
  - headings: Young Serif regular
  - labels/badges/navegação: Nunito 600, uppercase, letter-spacing 0.1em
  - botões: Nunito 600, 13–14px
- Remover o uso de Rufina/Figtree como identidade principal.
- Garantir que Young Serif não seja usado em labels, botões ou textos pequenos abaixo de 20px.

3. Confirmar e aplicar os tokens de cor globais
- Manter/ajustar as variáveis globais para os valores informados:
  - `--color-primary: #C4856A`
  - `--color-secondary: #7A9E7E`
  - `--color-accent: #E8D5B7`
  - `--color-bg: #FAF7F2`
  - `--color-dark: #2C2420`
  - `--color-text-body: #5A4035`
  - `--color-text-muted: #9A857A`
  - `--color-border: #E8DDD6`
- Ajustar componentes da Home para evitar branco puro como fundo de página e preto puro como texto.
- Atualizar botões para pill radius (`rounded-full`) conforme regra visual.
- Ajustar cards, inputs e badges para radius e bordas corretas.

4. Refazer o simulador da Home em estilo Typeform
- Substituir o formulário grande atual de `SimulatorCTA` por uma experiência em etapas inspirada no HTML anexado.
- Criar fluxo com:
  - tela inicial do simulador
  - pergunta 1: orçamento com slider e valor grande
  - pergunta 2: quantidade de convidados em opções clicáveis
  - pergunta 3: cidade com input elegante e datalist de cidades MG
  - pergunta 4: estilo do casamento com cards selecionáveis
  - tela final de confirmação
- Manter a lógica atual:
  - se não estiver logado, salvar `pending_simulacao` no `localStorage` e levar para cadastro/login
  - se estiver logado, inserir no banco e navegar para o resultado
- Usar transições suaves entre etapas, barra de progresso e botões estilo pill.
- Adaptar visual do HTML anexado para o design atual do projeto com Young Serif + Nunito, sem copiar como HTML bruto.
- Garantir mobile-first: espaçamentos menores no celular, opções empilhadas e cards responsivos.

5. Acabamento geral na Home
- Ajustar `HomeNavbar`, hero, preloader, footer e CTA para a nova tipografia.
- Trocar botões quadrados atuais por botões arredondados/pill.
- Revisar espaçamentos para deixar a página mais calorosa, limpa e acolhedora.
- Atualizar a memória de identidade visual do projeto para Young Serif + Nunito, evitando que as fontes antigas voltem em futuras alterações.

Arquivos principais que serão alterados
- `index.html`
- `src/index.css`
- `tailwind.config.ts`
- `src/components/home/StoryBlock.tsx`
- `src/components/home/SimulatorCTA.tsx`
- `src/components/home/HomeNavbar.tsx`
- `src/components/home/Preloader.tsx`
- `src/pages/Home.tsx`
- memória visual do projeto