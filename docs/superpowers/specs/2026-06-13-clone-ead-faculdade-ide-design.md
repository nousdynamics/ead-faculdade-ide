# Clone fiel — EAD Faculdade IDE → HTML/CSS/JS puro

**Data:** 2026-06-13
**Cliente:** Faculdade IDE (EAD)
**Objetivo:** Tirar duas páginas do WordPress/Elementor e recriar o MESMO design em código próprio, limpo e mantível, como base para melhorias futuras.

## Páginas-alvo

1. **Home** — `https://ead.faculdadeide.edu.br/`
2. **Curso (Pós-graduação)** — `https://ead.faculdadeide.edu.br/pos-graduacao/aleitamento-materno-e-banco-de-leite-humano-100-ead/`

## Stack de origem (confirmado no recon)

WordPress 7.0 + Elementor 4.1.3 + WP Rocket 3.22. Home: ~181 KB de HTML, ~29 arquivos CSS, markup Elementor pesado.

## Decisões (aprovadas pelo cliente)

| Decisão | Escolha |
|---|---|
| Abordagem | **Rebuild limpo** — mesmo design, markup próprio (não snapshot raw do Elementor) |
| Stack de saída | **HTML5 + CSS + JS vanilla** — zero build, zero dependência |
| Assets | **Baixar tudo local** (imagens, fontes, ícones) — projeto autocontido |
| Dinâmicos | **Visual fiel + stub** — WhatsApp/links funcionam; form visual com action placeholder; TrustIndex e pixels marcados p/ reativar |

## Arquitetura

Site estático, hospedável em qualquer host (Cloudflare Pages / Netlify / etc).

```
ead-faculdade-ide/
├─ index.html                                   # Home
├─ pos-graduacao/
│  └─ aleitamento-materno-banco-leite-humano/
│     └─ index.html                             # Página do curso
├─ assets/
│  ├─ css/
│  │  ├─ tokens.css        # design tokens: cores, fontes, espaçamentos, breakpoints
│  │  ├─ base.css          # reset + estilos globais
│  │  ├─ components.css    # header, footer, card de curso, botões, form
│  │  ├─ home.css          # estilos específicos da home
│  │  └─ curso.css         # estilos específicos da página de curso
│  ├─ js/
│  │  ├─ menu.js           # nav mobile (hamburguer)
│  │  ├─ course-filter.js  # filtros do catálogo (área, status, modalidade)
│  │  ├─ form-stub.js      # captura submit do form (placeholder)
│  │  └─ testimonials.js   # carrossel de depoimentos
│  ├─ img/                 # todas as imagens baixadas
│  └─ fonts/               # todas as fontes baixadas
└─ docs/superpowers/specs/ # spec + plano de implementação
```

### Método de captura fiel

1. Baixar HTML + os 29 CSS + JS de cada página (rodar fora do sandbox se houver reset de conexão).
2. Extrair design tokens reais do CSS: paleta de cores, famílias e pesos de fonte, escala de tamanhos, espaçamentos, breakpoints do Elementor.
3. Baixar todas as imagens e fontes para `assets/`; visualizar imagens para conferir fidelidade.
4. Reconstruir seção por seção em HTML semântico limpo, comparando com o original.

## Componentes reusáveis (compartilhados entre as 2 páginas)

- **Header** — logo + navegação (com versão mobile)
- **Footer** — Políticas, Institucional, escritórios, contatos, redes sociais, opções de parcelamento, selo e-MEC
- **Card de curso** — usado no catálogo da home
- **Botão WhatsApp flutuante**
- **Form de contato** — visual fiel, submit em stub

## Estrutura das páginas

### Home (seções mapeadas)
1. Header + nav + form de topo ("condições especiais de lançamento")
2. Hero — "Excelência no ensino IDE, agora também online"
3. "Porque escolher a Faculdade IDE?" — bloco de benefícios
4. Catálogo de cursos com filtros (área de interesse, status, modalidade) — grid de cards de Pós-Graduação
5. Depoimentos de alunos (TrustIndex → stub visual com depoimentos estáticos capturados)
6. Newsletter — "Receba nossa newsletter"
7. Footer

### Página do curso (Aleitamento Materno)
Estrutura esperada (a confirmar no download): hero + form, dados do curso (duração / modalidade / investimento), disciplinas, coordenação/corpo docente, CTA. Seções exatas confirmadas ao baixar a página (servidor resetou a conexão no recon inicial).

## Tratamento de elementos dinâmicos / terceiros

| Elemento | Tratamento |
|---|---|
| Botão WhatsApp (`wa.me`) | Funcional |
| Links externos (redes sociais, e-MEC) | Funcionais |
| Form contato / newsletter | Visual idêntico, `action` placeholder; backend nas melhorias |
| TrustIndex (avaliações) | Stub visual com depoimentos estáticos capturados |
| GTM / Facebook Pixel | Comentado no HTML, marcado para reativar |

## Responsividade

Replicar os breakpoints do Elementor (mobile / tablet / desktop) para manter o comportamento responsivo idêntico.

## Verificação

Antes de declarar pronto: comparação lado a lado com o original — estrutura das seções e fidelidade visual (via imagens baixadas). Conferir responsivo nos breakpoints.

## Fora de escopo (por enquanto)

- Backend de formulários (entra nas melhorias)
- Reativação real de tracking/analytics
- Demais páginas do site além das duas alvo
- As "melhorias" em si — primeiro o clone fiel, depois iteramos
```

## Próximos passos

Plano de implementação detalhado via writing-plans.
