/**
 * Espelho no cliente das constantes de `backend/app/preferences.py`.
 * Mantenha em sincronia com o backend: o servidor e a autoridade, isto aqui
 * so alimenta a UI de personalizacao.
 */
import type { UserPreferences } from '../lib/types';

export const NAV_IDS = [
  'dashboard',
  'lista',
  'backlog',
  'gastos',
  'lixeira',
  'categorias',
  'config',
] as const;

export type NavId = (typeof NAV_IDS)[number];

export const NAV_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  lista: 'Lista de Compras',
  backlog: 'Compras Futuras',
  gastos: 'Gastos',
  lixeira: 'Lixeira',
  categorias: 'Categorias',
  config: 'Configurações',
};

export const NAV_ICON_KEYS = [
  'grid', 'cart', 'bookmark', 'receipt', 'trash', 'tags', 'settings',
  'wallet', 'shield', 'user', 'plus', 'clock', 'key', 'inbox', 'archive', 'eye',
] as const;

export const NAV_ICON_STYLES = [
  'default', 'bullet', 'square', 'circle', 'arrow', 'diamond', 'none',
] as const;

/**
 * Nome de cada icone e de cada estilo em portugues.
 *
 * A chave ("grid", "bullet") e contrato com o backend e nao muda; o que o
 * usuario le nao pode ser a chave. Sem estes mapas a tela de personalizacao
 * lista "grid, cart, bookmark" — vocabulario de banco de dados, nao de gente.
 */
export const NAV_ICON_LABELS: Record<string, string> = {
  grid: 'Grade',
  cart: 'Carrinho',
  bookmark: 'Marcador',
  receipt: 'Recibo',
  trash: 'Lixeira',
  tags: 'Etiquetas',
  settings: 'Ajustes',
  wallet: 'Carteira',
  shield: 'Escudo',
  user: 'Usuário',
  plus: 'Mais',
  clock: 'Relógio',
  key: 'Chave',
  inbox: 'Caixa',
  archive: 'Arquivo',
  eye: 'Olho',
};

export const NAV_ICON_STYLE_LABELS: Record<string, string> = {
  default: 'Ícones',
  bullet: 'Ponto',
  square: 'Quadrado',
  circle: 'Bolinha',
  arrow: 'Flecha',
  diamond: 'Losango',
  none: 'Nenhum',
};

/**
 * Cores que o usuario pode escolher como accent.
 *
 * Todas medidas contra --surface (#070a10) e aprovadas em WCAG AA:
 *   azul neon 6.18 · ciano 10.96 · gelo 11.92 · violeta 6.11
 *   verde 11.89 · ambar 12.55 · rosa 7.03 · coral 6.15
 *
 * Acrescentar cor aqui exige medir antes. Nao existe cor "quase legivel".
 */
export const ACCENT_PRESETS = [
  '#2e90ff', '#22d3ee', '#7dd3ff', '#8b7dff',
  '#2de3a0', '#ffc53d', '#ff5db1', '#ff4d6a',
];

export const DEFAULT_PREFERENCES: UserPreferences = {
  sidebar_title: 'Financeiro',
  accent_color: '#2e90ff',
  brand_icon: 'wallet',
  nav_icon_style: 'default',
  nav_order: [...NAV_IDS],
  nav_icons: {
    dashboard: 'grid',
    lista: 'cart',
    backlog: 'bookmark',
    gastos: 'receipt',
    lixeira: 'trash',
    categorias: 'tags',
    config: 'settings',
  },
};

export function mergePreferences(raw?: Partial<UserPreferences> | null): UserPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    ...(raw ?? {}),
    nav_order:
      raw?.nav_order && raw.nav_order.length
        ? raw.nav_order
        : [...DEFAULT_PREFERENCES.nav_order],
    nav_icons: { ...DEFAULT_PREFERENCES.nav_icons, ...(raw?.nav_icons ?? {}) },
  };
}
