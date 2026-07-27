import type { Category, Item, User } from '@prisma/client';
import {
  normalizePreferences,
  UserPreferences,
} from '../iam/preferences/preferences';
import { orNull, toNaiveIso } from './serialize';

/** Porte de `serializers.item_to_out`. Campo a campo, na mesma ordem. */
export interface ItemOut {
  id: number;
  name: string;
  category_id: number | null;
  category_name: string | null;
  estimated_price: number;
  paid_value: number | null;
  priority: string | null;
  notes: string | null;
  payment_method: string | null;
  origin: string | null;
  state: string;
  previous_state: string | null;
  included_at: string | null;
  paid_at: string | null;
  deleted_at: string | null;
}

/**
 * ATENCAO (plano, secao 6.9): `category_name` vem do JOIN. Toda query que
 * alimenta este mapper PRECISA usar `include: { category: true }`, senao o
 * campo volta nulo e a UI perde o rotulo da categoria.
 */
export type ItemWithCategory = Item & { category?: Category | null };

export function itemToOut(item: ItemWithCategory): ItemOut {
  return {
    id: item.id,
    name: item.name,
    category_id: orNull(item.category_id),
    category_name: item.category ? item.category.name : null,
    estimated_price: item.estimated_price,
    paid_value: orNull(item.paid_value),
    priority: orNull(item.priority),
    notes: orNull(item.notes),
    payment_method: orNull(item.payment_method),
    origin: orNull(item.origin),
    state: item.state,
    previous_state: orNull(item.previous_state),
    included_at: toNaiveIso(item.included_at),
    paid_at: toNaiveIso(item.paid_at),
    deleted_at: toNaiveIso(item.deleted_at),
  };
}

/** Porte de `serializers.user_to_out`. */
export interface UserOut {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  avatar: string | null;
  currency: string;
  trash_autoclean_days: number;
  preferences: UserPreferences;
  created_at: string | null;
}

export function userToOut(user: User): UserOut {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    avatar: orNull(user.avatar),
    currency: user.currency,
    trash_autoclean_days: user.trash_autoclean_days,
    preferences: normalizePreferences(user.preferences),
    created_at: toNaiveIso(user.created_at),
  };
}
