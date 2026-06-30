# Design System — Financeiro

> Sistema de controle financeiro pessoal · Versão 1.0  
> Documento de referência para implementação, revisão e evolução da interface.

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Princípios de design](#2-princípios-de-design)
3. [Identidade de marca](#3-identidade-de-marca)
4. [Tokens de design](#4-tokens-de-design)
5. [Tipografia](#5-tipografia)
6. [Espaçamento e grid](#6-espaçamento-e-grid)
7. [Elevação e superfícies](#7-elevação-e-superfícies)
8. [Motion e animação](#8-motion-e-animação)
9. [Iconografia](#9-iconografia)
10. [Componentes](#10-componentes)
11. [Padrões de layout](#11-padrões-de-layout)
12. [Estados e feedback](#12-estados-e-feedback)
13. [Voz e microcopy](#13-voz-e-microcopy)
14. [Acessibilidade](#14-acessibilidade)
15. [Responsividade](#15-responsividade)
16. [Mapa de arquivos](#16-mapa-de-arquivos)
17. [Roadmap de tokens](#17-roadmap-de-tokens)

---

## 1. Visão geral

### O produto

**Financeiro** é um sistema web de controle financeiro pessoal com isolamento total de dados por usuário. A interface opera exclusivamente em **dark mode**, com tom profissional, fluido e minimalista.

### Stack de UI

| Camada | Tecnologia |
|---|---|
| Markup | HTML estático |
| Estilo | CSS custom properties + classes semânticas |
| Interação | Vanilla JavaScript (ES modules globais) |
| Fonte | Inter (Google Fonts, 400–700) |
| Ícones | SVG inline (`icons.js`, stroke `currentColor`) |

### Arquitetura CSS

```
tokens.css   →  tokens primitivos e reset base
styles.css   →  componentes, layout e utilitários
```

**Regra:** nunca hardcodar cores, raios ou durações fora de `tokens.css`, exceto casos documentados (ex.: texto sobre accent primário).

---

## 2. Princípios de design

### 2.1 Clareza financeira

Números são protagonistas. Valores monetários usam `tabular-nums`, animação de contagem e hierarquia tipográfica forte. Toda métrica clicável revela detalhes — nunca esconder informação atrás de gestos obscuros.

### 2.2 Confiança antes de velocidade

Ações destrutivas ou irreversíveis **sempre** passam por modal de confirmação. Feedback imediato via toast após cada operação. Estados de loading visíveis em toda operação assíncrona.

### 2.3 Quiet luxury, um acento

O visual é escuro e contido. A cor `#4fffd6` (mint) é reservada para: CTA primário, foco, métricas em transição, links e estados positivos. Não espalhar o accent em decoração.

### 2.4 Assinatura visual

Gradientes radiais mint nos cantos do viewport (`body::before`) criam profundidade sem competir com o conteúdo. É o único elemento atmosférico — manter sutil.

### 2.5 Sem emojis

Ícones exclusivamente via SVG inline. Emojis são proibidos em qualquer superfície da UI.

---

## 3. Identidade de marca

### Nome e tagline

| Elemento | Valor |
|---|---|
| Nome do produto | **Financeiro** |
| Tagline (login) | *Controle financeiro pessoal com privacidade total.* |
| Domínio institucional | `@financeiro.com.br` |

### Logotipo

```
┌─────────────────────────────┐
│  [■]  Financeiro            │  ← .brand
│  mint  wordmark             │
└─────────────────────────────┘
```

| Variante | Ícone | Contexto |
|---|---|---|
| Usuário | `ICON.wallet` (carteira) | Login, dashboard, favicon |
| Admin | `ICON.shield` (escudo) | Painel administrativo |

**Container do logo (`.brand .logo`):**
- Tamanho: 34×34 px
- Fundo: `--accent` (`#4fffd6`)
- Ícone: `#04130f` (verde escuro)
- Border-radius: 9 px
- Sombra: `0 6px 18px var(--accent-glow)`

**Wordmark:** Inter 650, `--fs-lg`, `letter-spacing: -0.02em`

### Favicon

Fundo `#111111`, stroke/fill `#4fffd6`, ícone de carteira, `rx="8"`.

---

## 4. Tokens de design

### 4.1 Cores — primitivas

| Token | Hex / valor | Uso |
|---|---|---|
| `--bg` | `#0a0a0a` | Fundo global da aplicação |
| `--surface` | `#111111` | Cards, sidebar, modais |
| `--surface-2` | `#181818` | Inputs, hover de linhas, toasts |
| `--surface-3` | `#1f1f1f` | Tabs ativas, tags neutras, tracks |
| `--border` | `#262626` | Bordas padrão |
| `--border-strong` | `#333333` | Bordas de destaque, botões |
| `--text` | `#ececec` | Texto principal |
| `--muted` | `#8a8a8a` | Texto secundário, labels |
| `--muted-2` | `#5f5f5f` | Texto terciário (reservado) |

### 4.2 Cores — accent

| Token | Valor | Uso |
|---|---|---|
| `--accent` | `#4fffd6` | CTA, links, foco, métricas animando |
| `--accent-dim` | `rgba(79,255,214,0.14)` | Nav ativo, fundos de destaque |
| `--accent-glow` | `rgba(79,255,214,0.35)` | Sombras de botão primário, text-shadow |
| `--accent-on` | `#04130f` | Texto/ícone **sobre** fundo accent |

### 4.3 Cores — semânticas

| Token | Valor | Uso |
|---|---|---|
| `--success` | `#4fffd6` | Sucesso (= accent, intencional) |
| `--danger` | `#ff5d6c` | Erro, exclusão, prioridade alta |
| `--danger-dim` | `rgba(255,93,108,0.14)` | Fundo de botão danger, tags |
| `--warning` | `#ffce4f` | Avisos, prioridade média |
| `--warning-dim` | `rgba(255,206,79,0.14)` | Caixa de aviso em modais |
| `--info` | `#6aa8ff` | Informação, tags info |
| `--info-dim` | `rgba(106,168,255,0.14)` | Fundo de tags info |

### 4.4 Mapa semântico de cores

```
Ação primária      → accent + accent-on
Ação destrutiva    → danger + danger-dim
Aviso / impacto    → warning + warning-dim
Informativo        → info + info-dim
Neutro / inativo   → muted + surface-3
Sucesso            → accent (toast success)
```

### 4.5 Contraste mínimo (WCAG AA)

| Par | Ratio estimado | Status |
|---|---|---|
| `--text` sobre `--bg` | ~15:1 | Passa |
| `--muted` sobre `--surface` | ~5.5:1 | Passa AA |
| `--accent-on` sobre `--accent` | ~12:1 | Passa |
| `--accent` sobre `--surface` | ~10:1 | Passa (links, valores) |

---

## 5. Tipografia

### Famílias

| Token | Stack | Papel |
|---|---|---|
| `--font-sans` | Inter, Segoe UI, system-ui | UI geral |
| `--font-num` | Inter, system-ui | Valores, métricas, tabelas |

### Escala tipográfica

| Token | Tamanho | Uso típico |
|---|---|---|
| `--fs-xs` | 0.75 rem (12 px) | Labels de campo, tags, hints, th de tabela |
| `--fs-sm` | 0.85 rem (~13.6 px) | Botões, nav, corpo secundário, células |
| `--fs-md` | 0.95 rem (~15.2 px) | **Corpo padrão**, inputs |
| `--fs-lg` | 1.15 rem (~18.4 px) | Títulos de modal/drawer, brand |
| `--fs-xl` | 1.6 rem (~25.6 px) | H1 de página (`.page-head h1`) |
| `--fs-2xl` | 2.4 rem (~38.4 px) | Valores de métricas (`.m-value`) |
| `--fs-3xl` | 3.2 rem (~51.2 px) | Reservado (hero, empty states grandes) |

### Pesos

| Peso | Uso |
|---|---|
| 400 | Corpo, parágrafos |
| 550 | Links de navegação |
| 600 | Botões, tags, th |
| 650 | Headings (h1–h4) |
| 700 | Valores de métrica, badges, avatar |

### Tratamentos especiais

```css
/* Headings */
font-weight: 650;
letter-spacing: -0.01em;

/* Labels de campo */
text-transform: uppercase;
letter-spacing: 0.06em;
font-size: var(--fs-xs);
color: var(--muted);

/* Labels de métrica */
text-transform: uppercase;
letter-spacing: 0.07em;

/* Números tabulares */
.tabular {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}
```

### Hierarquia por contexto

| Contexto | Elemento | Estilo |
|---|---|---|
| Página autenticada | Título | `--fs-xl`, peso 650 |
| Modal | Título | `--fs-lg`, peso 650 |
| Métrica | Label | `--fs-xs`, uppercase, muted |
| Métrica | Valor | `--fs-2xl`, peso 700, tabular |
| Tabela | Header | `--fs-xs`, uppercase, muted |
| Tabela | Célula | `--fs-sm` |

---

## 6. Espaçamento e grid

### Escala de espaçamento (valores usados)

| Valor | Uso |
|---|---|
| 2 px | Gap entre itens de nav |
| 4 px | Padding interno de tabs/seg |
| 6 px | Gap field label→input, gap actions-cell |
| 8 px | Gap brand, nav icon→label, stack pequeno |
| 10 px | Padding nav item, user-chip |
| 12 px | Gap row, toolbar, bar-row |
| 14 px | Gap stack (formulários) |
| 16 px | Gap metrics grid, page-head |
| 18 px | Padding metric card |
| 20 px | Padding card, modal overlay |
| 22 px | Padding sidebar, auth-card vertical |
| 24 px | Margin page-head, drawer padding |
| 28 px | Padding content vertical |
| 32 px | Padding content horizontal |
| 48 px | Padding empty state |

### Border radius

| Token | Valor | Uso |
|---|---|---|
| `--radius-sm` | 8 px | Botões, inputs, tags, detail-item |
| `--radius` | 14 px | Cards, métricas, table-wrap |
| `--radius-lg` | 20 px | Auth card, modal |
| `99px` / `50%` | Pill / círculo | Tags, badges, avatar, strength bar |

### Layout principal

```
Desktop (≥861px)
┌──────────┬────────────────────────────────────┐
│ Sidebar  │  Content (max 1280px)              │
│ 248px    │  padding: 28px 32px                │
│ sticky   │                                    │
│ 100vh    │  #view (conteúdo dinâmico)         │
└──────────┴────────────────────────────────────┘

Auth
┌────────────────────────────────────────────────┐
│           .auth-wrap (grid center, 100vh)       │
│              ┌─────────────────┐               │
│              │  .auth-card     │               │
│              │  max 420px      │               │
│              └─────────────────┘               │
└────────────────────────────────────────────────┘
```

### Grid de métricas

```css
.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}
```

---

## 7. Elevação e superfícies

### Sombras

| Token | Valor | Uso |
|---|---|---|
| `--shadow` | `0 10px 40px rgba(0,0,0,0.45)` | Modais, auth-card, drawer |
| `--shadow-soft` | `0 4px 18px rgba(0,0,0,0.35)` | Toasts |
| Accent glow | `0 6px 20px var(--accent-glow)` | Botão primário |
| Accent glow hover | `0 8px 26px var(--accent-glow)` | Botão primário :hover |

### Camadas (z-index)

| Camada | z-index | Elemento |
|---|---|---|
| Base | 0 | Conteúdo |
| Background glow | -1 | `body::before` |
| Drawer overlay | 90 | `.drawer-overlay` |
| Drawer | 91 | `.drawer` |
| Modal overlay | 100 | `.modal-overlay` |
| Toasts | 200 | `.toasts` |

### Superfícies empilhadas

```
--bg          (mais profundo)
  └─ --surface      (sidebar, cards)
       └─ --surface-2   (inputs, hover)
            └─ --surface-3  (tabs ativas, tracks)
```

---

## 8. Motion e animação

### Token de transição

```css
--transition: 180ms cubic-bezier(0.22, 1, 0.36, 1);
```

Curva **ease-out-expo** — rápida na entrada, suave na desaceleração.

### Catálogo de animações

| Nome | Duração | Uso |
|---|---|---|
| `rise` | 180 ms | Auth card, modal (fade + translateY 10px) |
| `fade` | 180 ms | Overlays |
| `pulse` | 520 ms | Card de métrica ao atualizar valor |
| `shimmer` | 1.3 s loop | Skeleton loading |
| `slideIn` | 180 ms | Toast entrada (translateX 20px) |
| `slideOut` | 180 ms | Toast saída |
| `slideDrawer` | 180 ms | Drawer (translateX 40px) |
| Bar fill | 600 ms | Gráfico de barras por categoria |

### Animação de métricas (requisito de negócio)

Implementada em `animate.js`:

| Propriedade | Valor |
|---|---|
| Duração | 400–600 ms (proporcional à diferença) |
| Easing | `ease-out` cúbico (`1 - (1-t)³`) |
| Cor durante contagem | `--accent` + `text-shadow: 0 0 18px accent-glow` |
| Classe ativa | `.m-value.counting` |
| Pulso do card | `.metric.pulse` → scale 1 → 1.03 → 1 |
| Reduced motion | Renderiza valor final imediatamente |

### Micro-interações

| Elemento | Interação |
|---|---|
| Botão | `translateY(-1px)` no hover; volta a 0 no active |
| Métrica | `translateY(-2px)` no hover |
| Nav link | Background `--surface-2`, cor `--text` |
| Input | Border accent + ring `0 0 0 3px accent-dim` no focus |

### Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
```

`animate.js` também verifica `prefers-reduced-motion` antes de animar valores.

---

## 9. Iconografia

### Especificação

| Propriedade | Valor |
|---|---|
| Estilo | Stroke outline (Lucide-like) |
| Stroke width | 2 |
| ViewBox | 24×24 |
| Cor | `currentColor` (herda do pai) |
| Acessibilidade | `aria-hidden="true"` (decorativo) |
| Botão só-ícone | `aria-label` obrigatório no botão |

### Tamanhos por contexto

| Contexto | Tamanho |
|---|---|
| Dentro de botão (`.btn svg`) | 16×16 px |
| Nav sidebar | 18×18 px |
| Toast | 18×18 px |
| Empty state | 42×42 px, opacity 0.4 |
| Status icon | 30×30 px dentro de círculo 64 px |
| Logo | 20×20 px dentro de container 34 px |

### Biblioteca (`ICON.*`)

| Chave | Significado |
|---|---|
| `wallet` | Marca / finanças |
| `shield` | Admin / segurança |
| `grid` | Dashboard |
| `cart` | Lista de compras |
| `bookmark` | Backlog |
| `receipt` | Gastos realizados |
| `trash` | Lixeira |
| `tags` | Categorias |
| `user` | Perfil |
| `settings` | Configurações |
| `logout` | Sair |
| `edit` | Editar |
| `check` | Confirmar / sucesso |
| `x` | Fechar / erro |
| `reopen` | Reabrir gasto |
| `restore` | Restaurar da lixeira |
| `plus` | Adicionar |
| `arrowRight` | Promover / avançar |
| `archive` | Arquivar categoria |
| `clock` | Pendente / aviso |
| `pause` | Suspenso |
| `key` | Recuperação de senha |
| `eye` | Detalhes da conta do usuário (admin — sem dados financeiros) |
| `inbox` | Solicitações pendentes |

### Regras

- Nunca usar emojis como substituto de ícone.
- Ícones em botões de ação destrutiva herdam `--danger`.
- Ícones em nav ativo herdam `--accent`.

---

## 10. Componentes

### 10.1 Botões

**Base:** `.btn`

| Propriedade | Valor |
|---|---|
| Font | `--fs-sm`, peso 600 |
| Padding | 10px 16px |
| Radius | `--radius-sm` |
| Border | 1px `--border-strong` |
| Background | `--surface-2` |
| Gap ícone-texto | 8 px |

**Variantes:**

| Classe | Aparência | Quando usar |
|---|---|---|
| `.btn-primary` | Fundo accent, texto `#04130f`, glow | Ação principal, confirmar |
| `.btn-ghost` | Transparente, borda `--border` | Cancelar, secundário |
| `.btn-danger` | Texto/borda danger, fundo danger-dim | Excluir, rejeitar |
| `.btn-sm` | Padding 6px 10px, `--fs-xs` | Ações em tabela |
| `.btn-icon` | Padding 7px, transparente | Fechar drawer, ações compactas |

**Estados:**

| Estado | Comportamento |
|---|---|
| `:hover` | `translateY(-1px)`, borda accent |
| `:active` | `translateY(0)` |
| `:disabled` | Opacity 0.5, cursor not-allowed, sem transform |
| `:focus-visible` | Outline 2px accent, offset 2px |

**Anatomia modal actions:**

```
[ Cancelar (.btn-ghost) ]  [ Confirmar (.btn-primary | .btn-danger) ]
                              ↑ foco inicial em confirmações destrutivas
```

---

### 10.2 Campos de formulário

**Container:** `.field` — flex column, gap 6px

**Input padrão:** `input`, `select`, `textarea`

| Propriedade | Valor |
|---|---|
| Background | `--surface-2` |
| Border | 1px `--border` |
| Padding | 11px 13px |
| Radius | `--radius-sm` |
| Focus | border accent + ring 3px accent-dim |

**Estados de validação:**

| Classe | Border |
|---|---|
| `.valid` | `--accent` |
| `.invalid` | `--danger` |

**E-mail composto:** `.email-field`

```
┌──────────────────────────────┬─────────────────────┐
│  input.email-local           │  @financeiro.com.br │
│  (flex 1)                    │  .email-suffix      │
└──────────────────────────────┴─────────────────────┘
```

**Medidor de senha:** `.strength` — barra 5px, radius pill, fill animado

**Hints:** `.hint` (muted) · `.hint.error` (danger) · `.hint.ok` (accent)

**Select customizado:** todos os `<select>` são aprimorados via `UI.initSelects(root)` em `ui.js`. O `<select>` nativo permanece oculto (`.select-native`) para formulários e eventos `change`.

| Elemento | Classe | Descrição |
|---|---|---|
| Wrapper | `.select-wrap` | Container relativo |
| Gatilho | `.select-trigger` | Botão com valor + chevron |
| Menu | `.select-menu` | Lista dropdown (`--surface`, borda, sombra) |
| Opção | `.select-option` | Item com hover `--surface-2` |
| Selecionado | `.select-option.selected` | Fundo `--accent-dim`, texto `--accent` |

Estados do gatilho: hover (`--surface-3`), aberto/foco (borda accent + ring), disabled (opacity 0.5).

Inicializar após render dinâmico: `UI.initSelects(container)`. Para atualizar opções: `UI.refreshSelect(selectEl)`.

Opt-out: `data-no-enhance` no `<select>` nativo.

---

### 10.3 Cards

**Card genérico:** `.card`

```
background: --surface
border: 1px --border
radius: --radius (14px)
padding: 20px
```

**Card de métrica:** `.metric`

```
┌─────────────────────────┐
│ LABEL          [icon]   │  ← .m-top / .m-label
│                         │
│ R$ 12.450,00            │  ← .m-value .tabular
└─────────────────────────┘
  cursor: pointer
  hover: translateY(-2px)
```

**Card de auth:** `.auth-card` — max 420px, radius lg, shadow, animação rise

**Card de status:** `.status-card` — max 460px, texto centralizado

**Cabeçalho de card:** `.card-head`

```
display: flex; align-items: baseline; justify-content: space-between
margin-bottom: 16px
h3 → --fs-lg
hint opcional à direita (contagem, contexto)
```

**Ações de formulário em card:** `.card-actions` — agrupa botão primário abaixo dos campos, sem esticar largura total.

**Linha de campos:** `.form-row` — grid 2 colunas (gap 14px) para campos relacionados lado a lado. Colapsa para 1 coluna em mobile.

---

### 10.4 Tags / chips

**Base:** `.tag`

| Variante | Fundo | Texto |
|---|---|---|
| (default) | `--surface-3` | `--muted` |
| `.accent` | `--accent-dim` | `--accent` |
| `.warn` | `--warning-dim` | `--warning` |
| `.danger` | `--danger-dim` | `--danger` |
| `.info` | `--info-dim` | `--info` |
| `.alta` | `--danger-dim` | `--danger` |
| `.media` | `--warning-dim` | `--warning` |
| `.baixa` | `--surface-3` | `--muted` |

Formato: pill (`border-radius: 99px`), padding 3px 9px, `--fs-xs`, peso 600.

---

### 10.5 Navegação

**Sidebar nav:** `.nav a`

| Estado | Background | Cor |
|---|---|---|
| Default | transparente | `--muted` |
| Hover | `--surface-2` | `--text` |
| Active | `--accent-dim` | `--accent` |

**Badge de contagem:** `.nav .badge`

```
background: --danger
color: #fff
min-width: 18px, height: 18px
font-size: 0.65rem, peso 700
border-radius: 99px
margin-left: auto
```

**Tabs de auth:** `.tabs` — segmented control, botão `.active` com `--surface-3`

**Tabs de conteúdo:** `.seg` — idêntico visualmente às tabs de auth

---

### 10.6 Tabelas

**Wrapper:** `.table-wrap` — surface + border + radius, overflow hidden

| Elemento | Estilo |
|---|---|
| `th` | `--fs-xs`, uppercase, muted, border-bottom |
| `td` | `--fs-sm`, border-bottom |
| `tbody tr:hover` | background `--surface-2` |
| `.actions-cell` | flex, gap 6px, justify-end |

Última linha sem border-bottom (`tr:last-child td`).

---

### 10.7 Modais

**Overlay:** `.modal-overlay`
- Fundo `rgba(0,0,0,0.66)` + `backdrop-filter: blur(3px)`
- Click fora fecha (cancelar)
- Escape fecha

**Modal:** `.modal`
- Max-width 480px
- Padding 26px
- Radius lg, shadow

**Caixa de aviso:** `.warn-box`
- Fundo `--warning-dim`, texto `--warning`
- Usada antes de ações com impacto financeiro

**Tipos via JS:**

| Função | Uso |
|---|---|
| `confirmModal()` | Confirmação destrutiva/neutra |
| `formModal()` | Formulário dinâmico |

---

### 10.8 Toasts

**Container:** `.toasts` — fixed top-right, `role="status"`, `aria-live="polite"`

| Tipo | Borda esquerda | Ícone |
|---|---|---|
| `.success` | `--accent` | check |
| `.error` | `--danger` | x |
| `.warning` | `--warning` | clock |

Duração padrão: 3600 ms. Animação slideIn → slideOut.

**Regra de copy:** verbo no passado após ação ("Item excluído", não "Excluindo...").

---

### 10.9 Drawer

Painel lateral direito para detalhes de métricas. Fundo `--surface`, texto `--text`, scroll interno em `.drawer-content` com scrollbar da paleta dark (mesmo padrão da `.sidebar`).

| Propriedade | Valor |
|---|---|
| Max-width | 520px |
| Fundo | `--surface` |
| Borda | esquerda `--border-strong` |
| Scroll | `.drawer-content` (6px, thumb `--border-strong`) |

**Scrollbars compartilhadas:** `.sidebar`, `.nav`, `.drawer`, `.drawer-content`, `.pick-list`, `.select-menu` — `scrollbar-color` dark + `color-scheme: dark` em `:root`.

Header: título + botão `.btn-icon` com `aria-label="Fechar"`.

---

### 10.10 Avatar e user chip

**Avatar:** 34×34 px, círculo, borda `--border-strong`, iniciais em accent

**User chip:** flex row, border-top na sidebar, nome truncado + email muted

---

### 10.11 Gráfico de barras

**Container:** `.bars` > `.bar-row`

```
Grid: 130px (label) | 1fr (track) | 90px (valor)
Track: height 10px, --surface-3, pill
Fill: cor sólida `--accent`, transição 600ms
```

---

### 10.12 Empty state

**Classe:** `.empty`
- Padding 48px 20px, texto muted, centralizado
- Ícone 42px, opacity 0.4
- Copy orientada à ação ("Nenhum item ainda. Adicione o primeiro.")

---

### 10.13 Skeleton

| Classe | Uso |
|---|---|
| `.skeleton` | Base com shimmer |
| `.sk-line` | Linha 14px |
| `.sk-card` | Bloco 110px (métricas) |

**Boot loading (pós-login):** `.boot-loading` — overlay fullscreen por **1,5 s** com logo, spinner e label "Entrando…". Inicia sempre na cor padrão (`#4fffd6`) e anima até a cor personalizada do usuário (se diferente) durante esse período, antes de revelar o sistema. Em `dashboard.html` e `admin.html`, o script `boot-pending.js` no `<head>` e o markup `#boot-loading-static` garantem que o loading apareça antes do app (sem flash do sistema).

---

### 10.14 Toolbar

`.toolbar` — flex wrap, gap 10px, selects/inputs com min-width 150px  
`.spacer` — flex 1 para empurrar ações à direita

---

## 11. Padrões de layout

### 11.1 Telas de autenticação

Páginas: `index.html`, `forgot.html`, `reset.html`, `status.html`

```
.auth-wrap
  └── .auth-card
        ├── .auth-hero (logo + wordmark)
        ├── .auth-tabs (Entrar / Criar conta)
        ├── .auth-panels
        │     └── form.auth-panel
        │           └── .auth-demo (contas de teste — login)
        ├── .auth-footer
        │     └── .auth-docs-btn
        └── (overlay) .api-docs-overlay
              ├── .api-docs-header
              └── iframe.api-docs-frame → /docs
```

**Contas de teste (`.auth-demo`):** bloco abaixo do formulário de login com lista clicável (`.auth-demo-item`) que preenche e-mail e senha. Exibido apenas no painel Entrar.

**Documentação API (`.api-docs-overlay`):** painel fullscreen com iframe Swagger (`/docs`). Botão `.auth-docs-btn` no rodapé do card. Fecha com Esc ou botão X.

### 11.2 App autenticado (usuário / admin)

```
.app
  ├── aside.sidebar
  │     ├── .brand
  │     ├── nav.nav
  │     └── .sidebar-footer
  │           ├── btn logout
  │           └── .user-chip
  └── main.content
        └── #view
              ├── .page-head (h1 + ações)
              ├── .metrics (dashboard)
              ├── .toolbar (filtros)
              └── .table-wrap | .bars | .empty
```

### 11.3 Dashboard — ordem visual

1. Page head (título + período/filtros globais)
2. Grid de métricas (4 cards): Total Gasto, Lista de Compras, Compras Futuras, Itens na Lixeira
3. Toolbar de filtros
4. Gráfico de barras por categoria

**Card Total a Gastar:** exibido na aba **Lista de Compras**; **Total Estimado** na aba **Compras Futuras** (`.metrics-single`, `.metric-static`).

**Drawer de métricas:** itens clicáveis (`.detail-item-link`) redirecionam para a aba correspondente e destacam a linha (`tr.row-highlight`).

### 11.4 Lista de Compras e Compras Futuras — métricas locais

Duplo `#pageMetricArea` em ambas as abas (`.metrics-single`, `.metric-static`):

| Aba | Cards |
|---|---|
| Lista de Compras | Total a Gastar · Itens na Lista |
| Compras Futuras | Total Estimado · Itens em Compras Futuras |

Atualiza com animação ao adicionar, editar, promover, mover ou excluir itens.

**Soma temporária:** botão "Somar itens escolhidos" abre modal com checkboxes; ao concluir, card `.metric-sum-temp` (accent) aparece ao lado do total em dinheiro, com `.metric-dismiss` (X) para remover.

### 11.5 Admin — diferenciações

- Logo com `ICON.shield`, label "Admin"
- Badges separados: cadastros pendentes vs. recuperação de senha
- Tabelas de usuários com tags de status (Ativo, Pendente, Suspenso)

### 11.6 Configurações — abas laterais

Página dividida em três seções via `.settings-nav` (Conta, Aparência, Segurança). Largura máxima do conteúdo ~640px.

```
.page-head
.settings-page
  ├── .settings-nav (tablist sticky)
  │     ├── Conta
  │     ├── Aparência
  │     └── Segurança
  └── .settings-panels
        ├── [account] .settings-panel-stack → .card (Dados da conta)
        ├── [appearance] .settings-panel-stack
        │     ├── .settings-block (Identidade visual)
        │     ├── .settings-block (Símbolos da sidebar)
        │     ├── .settings-block--tip (dica reordenar sidebar)
        │     └── .settings-panel-actions
        └── [security] .settings-panel-stack → .card (Alterar senha)
```

**Responsivo:**

| Breakpoint | Comportamento |
|---|---|
| ≤ 768px | `.settings-page` → 1 coluna; tabs horizontais com scroll |
| ≤ 768px | `.form-row` e `.nav-icon-row` → 1 coluna |

**Ícones da sidebar (Aparência):** `.nav-icon-row` — label à esquerda, `.icon-picker--compact` à direita.

---

## 12. Estados e feedback

### Matriz de feedback por ação

| Ação | Modal | Toast | Animação métrica |
|---|---|---|---|
| Marcar como pago | Sim | Sucesso | Count-up total gasto |
| Reabrir gasto | Sim + warn-box | Sucesso | Count-down total gasto |
| Excluir (soft) | Sim | Sucesso | Se impacta métrica |
| Excluir permanente | Sim + aviso valor | Sucesso | Count-down |
| Salvar edição | Não | Sucesso | Não |
| Erro de API | Não | Error | Não |
| Login inválido | Não | Error | Não |

### Estados de conta (admin tags)

| Status | Tag sugerida | Cor |
|---|---|---|
| Ativo | `.tag.accent` | mint |
| Pendente | `.tag.warn` | amarelo |
| Suspenso | `.tag.danger` | vermelho |
| Link enviado | `.tag.info` | azul |

### Loading

| Contexto | Padrão |
|---|---|
| Carregamento inicial | Skeleton cards + sk-lines |
| Ação de botão | `:disabled` + opacity 0.5 |
| Métricas | Manter valor anterior até resposta |

---

## 13. Voz e microcopy

### Tom

Conversacional, direto, profissional. Sentence case. Verbos no imperativo para botões, particípio/passado para toasts.

### Vocabulário consistente

| Conceito | Termo na UI |
|---|---|
| Lista de compras | Lista de compras |
| Backlog | Backlog / Desejos futuros |
| Gastos | Gastos realizados |
| Soft delete | Excluir (vai para lixeira) |
| Hard delete | Excluir permanentemente |

### Botões — exemplos

| Contexto | Texto |
|---|---|
| Salvar formulário | Salvar |
| Confirmar pagamento | Marcar como pago |
| Cancelar modal | Cancelar |
| Destrutivo | Excluir / Excluir permanentemente |
| Logout | Sair da conta |

### Mensagens de erro

Específicas, sem pedir desculpas:

- "E-mail não encontrado no sistema."
- "Preencha os campos obrigatórios."
- "Senha deve ter ao menos 8 caracteres."

### Empty states

Convidar à ação:

- "Nenhum item na lista. Adicione o que pretende comprar."
- "Lixeira vazia."

---

## 14. Acessibilidade

### Checklist obrigatório

- [ ] Contraste AA em texto e ícones interativos
- [ ] `:focus-visible` com outline accent 2px
- [ ] Modais com `role="dialog"`, `aria-modal="true"`
- [ ] Toasts com `aria-live="polite"`
- [ ] Botões ícone com `aria-label`
- [ ] Ícones decorativos com `aria-hidden="true"`
- [ ] Navegação por teclado (Tab, Escape fecha overlays)
- [ ] `prefers-reduced-motion` respeitado
- [ ] Labels associados a todos os inputs
- [ ] Mensagens de erro ligadas ao campo (ideal: `aria-describedby`)

### Foco em modais

Ao abrir: foco no botão de confirmação (ou primeiro campo em formModal).  
Escape e click no overlay cancelam.

---

## 15. Responsividade

### Tokens de espacamento

| Token | Desktop | ≤ 768px | ≤ 480px |
|---|---|---|---|
| `--page-x` / `--page-y` | 32 / 28 px | 20 px | 16 / 18 px |
| `--section-gap` | 28 px | 24 px | 20 px |
| `--card-pad` | 20 px | 18 px | 16 px |
| `--stack-gap` | 14 px | 16 px | 16 px |
| `--touch-min` | 44 px | 44 px | 44 px |

Viewport: `viewport-fit=cover` + `env(safe-area-inset-*)` em header, modais e toasts.

### Breakpoints

```css
@media (max-width: 1024px) { /* sidebar estreita */ }
@media (max-width: 768px)  { /* mobile */ }
@media (max-width: 480px)  { /* telas pequenas */ }
@media (pointer: coarse)   { /* touch targets */ }
```

### Mobile shell (≤ 768px)

| Elemento | Adaptação |
|---|---|
| `.mobile-header` | Sticky no topo — menu + titulo da sidebar |
| `.sidebar` | Drawer fixo lateral; labels visiveis |
| `.sidebar-backdrop` | Overlay ao abrir menu |
| `.content` | Padding via tokens; area util completa |
| `.page-head` | Coluna — titulo acima, acoes abaixo |
| `.toolbar` | Coluna; campos e botoes largura total |
| `.metrics` | 1 coluna |
| `.table-wrap` | Scroll horizontal interno |
| `.modal` | Sheet inferior; acoes empilhadas |
| `.drawer` | Largura total |
| `.toasts` | Fixos na parte inferior |

Menu mobile: `UI.initMobileShell()` — hamburger abre drawer; fecha ao navegar, backdrop ou Escape.

### Touch targets

Area minima `--touch-min` (44px) em botoes, nav, tabs e acoes principais em `(pointer: coarse)`.

---

## 16. Mapa de arquivos

```
frontend/
├── DESIGN_SYSTEM.md     ← este documento
├── css/
│   ├── tokens.css       ← tokens primitivos
│   └── styles.css       ← componentes
├── js/
│   ├── ui.js            ← toasts, modais, drawer, formatters
│   ├── icons.js         ← biblioteca SVG
│   ├── animate.js       ← count-up/down métricas
│   ├── auth.js          ← validações auth
│   ├── dashboard.js     ← SPA usuário
│   └── admin.js         ← SPA admin
├── favicon.svg
└── *.html               ← páginas estáticas
```

---

## 17. Roadmap de tokens

Tokens recomendados para adicionar em `tokens.css` em evoluções futuras:

```css
/* Espaçamento formal */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-7: 32px;
--space-8: 48px;

/* Semântica formal */
--color-text-primary: var(--text);
--color-text-secondary: var(--muted);
--color-bg-elevated: var(--surface);

/* Info dim (hoje inline) */
--info-dim: rgba(106, 168, 255, 0.14);

/* Accent secundário (gráficos) */
--accent-deep: #2bd9b0;

/* Accent on (hoje hardcoded) */
--accent-on: #04130f;

/* Z-index scale */
--z-drawer: 90;
--z-modal: 100;
--z-toast: 200;

/* Durações nomeadas */
--duration-fast: 180ms;
--duration-medium: 520ms;
--duration-slow: 600ms;
```

---

## Apêndice A — Paleta visual rápida

```
BACKGROUNDS          TEXT                 ACCENT & STATES
#0a0a0a  bg          #ececec  text        #4fffd6  accent / success
#111111  surface     #8a8a8a  muted        #04130f  on-accent
#181818  surface-2   #5f5f5f  muted-2      #ff5d6c  danger
#1f1f1f  surface-3                            #ffce4f  warning
#262626  border                               #6aa8ff  info
#333333  border-strong
```

## Apêndice B — Fluxo de decisão de componente

```
Precisa confirmar ação?
  ├── Sim, destrutiva → confirmModal(danger: true) + warn-box se impacto financeiro
  ├── Sim, neutra     → confirmModal(danger: false)
  └── Não             → executar direto + toast

Precisa coletar dados?
  ├── Sim → formModal()
  └── Não → confirmModal() ou ação direta

Precisa mostrar lista de detalhes?
  ├── Painel lateral  → openDrawer()
  └── Bloqueio total  → modal

Feedback de resultado?
  └── toast(message, type)
```

---

*Documento alinhado ao código em `frontend/css/` e aos requisitos em `.cursor/skills/roteiro-sistema/SKILL.md`.*
