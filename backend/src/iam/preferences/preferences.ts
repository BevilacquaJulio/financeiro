/**
 * Porte 1:1 de `backend/app/preferences.py`.
 *
 * NAO altere as regras nem os defaults (plano, secoes 2.5.6 e 6.11): validar
 * diferente faz o PUT parcial aceitar/rejeitar valores diferentes do sistema
 * atual, e a UI de personalizacao passa a divergir.
 */

export const NAV_IDS = [
  'dashboard',
  'lista',
  'backlog',
  'gastos',
  'lixeira',
  'categorias',
  'config',
] as const;

export const NAV_ICON_KEYS = [
  'grid',
  'cart',
  'bookmark',
  'receipt',
  'trash',
  'tags',
  'settings',
  'wallet',
  'shield',
  'user',
  'plus',
  'clock',
  'key',
  'inbox',
  'archive',
  'eye',
] as const;

export const NAV_ICON_STYLES = [
  'default',
  'bullet',
  'square',
  'circle',
  'arrow',
  'diamond',
  'none',
] as const;

export interface UserPreferences {
  sidebar_title: string;
  accent_color: string;
  brand_icon: string;
  nav_icon_style: string;
  nav_order: string[];
  nav_icons: Record<string, string>;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
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

function isHexColor(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.length !== 7 || !value.startsWith('#')) return false;
  return /^[0-9A-Fa-f]{6}$/.test(value.slice(1));
}

function clone(prefs: UserPreferences): UserPreferences {
  return {
    ...prefs,
    nav_order: [...prefs.nav_order],
    nav_icons: { ...prefs.nav_icons },
  };
}

/** Mescla preferencias salvas com os defaults e corrige valores invalidos. */
export function normalizePreferences(raw: unknown): UserPreferences {
  const prefs = clone(DEFAULT_USER_PREFERENCES);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return prefs;
  const src = raw as Record<string, unknown>;

  const title = src.sidebar_title;
  if (typeof title === 'string') {
    const trimmed = title.trim();
    if (trimmed.length >= 1 && trimmed.length <= 40) {
      prefs.sidebar_title = trimmed;
    }
  }

  const color = src.accent_color;
  if (isHexColor(color)) prefs.accent_color = color.toLowerCase();

  const style = src.nav_icon_style;
  if (typeof style === 'string' && (NAV_ICON_STYLES as readonly string[]).includes(style)) {
    prefs.nav_icon_style = style;
  }

  const brand = src.brand_icon;
  if (typeof brand === 'string' && (NAV_ICON_KEYS as readonly string[]).includes(brand)) {
    prefs.brand_icon = brand;
  }

  const order = src.nav_order;
  if (Array.isArray(order)) {
    const cleaned = order.filter(
      (x): x is string =>
        typeof x === 'string' && (NAV_IDS as readonly string[]).includes(x),
    );
    for (const navId of NAV_IDS) {
      if (!cleaned.includes(navId)) cleaned.push(navId);
    }
    prefs.nav_order = cleaned.slice(0, NAV_IDS.length);
  }

  const icons = src.nav_icons;
  if (icons && typeof icons === 'object' && !Array.isArray(icons)) {
    const merged = { ...prefs.nav_icons };
    for (const navId of NAV_IDS) {
      const icon = (icons as Record<string, unknown>)[navId];
      if (
        typeof icon === 'string' &&
        (NAV_ICON_KEYS as readonly string[]).includes(icon)
      ) {
        merged[navId] = icon;
      }
    }
    prefs.nav_icons = merged;
  }

  return prefs;
}

/** Erro de dominio; o controller converte em HTTP 400 com `{detail}`. */
export class PreferencesValidationError extends Error {}

/** Valida preferencias completas antes de persistir. */
export function validatePreferences(data: unknown): UserPreferences {
  const merged = normalizePreferences(data);

  const title = merged.sidebar_title ?? '';
  if (
    typeof title !== 'string' ||
    !(title.trim().length >= 1 && title.trim().length <= 40)
  ) {
    throw new PreferencesValidationError(
      'Titulo da sidebar invalido (1 a 40 caracteres).',
    );
  }

  if (!isHexColor(merged.accent_color)) {
    throw new PreferencesValidationError(
      'Cor de destaque invalida. Use formato #RRGGBB.',
    );
  }

  if (!(NAV_ICON_STYLES as readonly string[]).includes(merged.nav_icon_style)) {
    throw new PreferencesValidationError('Estilo de icone invalido.');
  }

  if (!(NAV_ICON_KEYS as readonly string[]).includes(merged.brand_icon)) {
    throw new PreferencesValidationError('Icone do titulo invalido.');
  }

  const order = merged.nav_order;
  const sameSet =
    Array.isArray(order) &&
    new Set(order).size === NAV_IDS.length &&
    NAV_IDS.every((id) => order.includes(id));
  if (!sameSet) {
    throw new PreferencesValidationError('Ordem da sidebar invalida.');
  }

  const icons = merged.nav_icons;
  if (!icons || typeof icons !== 'object') {
    throw new PreferencesValidationError('Icones da sidebar invalidos.');
  }
  for (const navId of NAV_IDS) {
    if (!(NAV_ICON_KEYS as readonly string[]).includes(icons[navId])) {
      throw new PreferencesValidationError(`Icone invalido para ${navId}.`);
    }
  }

  return merged;
}
