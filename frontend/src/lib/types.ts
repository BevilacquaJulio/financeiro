/** Contratos da API — espelham os schemas do backend, campo a campo. */

export type ItemState = 'lista' | 'backlog' | 'gasto' | 'lixeira';
export type ItemOrigin = 'planejado' | 'avulso';
export type ItemPriority = 'baixa' | 'media' | 'alta';
export type UserRole = 'user' | 'admin';
export type UserStatus = 'pending' | 'active' | 'suspended';
export type ResetStatus = 'pending' | 'sent' | 'rejected' | 'used' | 'expired';

export interface UserPreferences {
  sidebar_title: string;
  accent_color: string;
  brand_icon: string;
  nav_icon_style: string;
  nav_order: string[];
  nav_icons: Record<string, string>;
}

export interface UserOut {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar: string | null;
  currency: string;
  trash_autoclean_days: number;
  preferences: UserPreferences;
  created_at: string;
}

export interface ItemOut {
  id: number;
  name: string;
  category_id: number | null;
  category_name: string | null;
  estimated_price: number;
  paid_value: number | null;
  priority: ItemPriority | null;
  notes: string | null;
  payment_method: string | null;
  origin: ItemOrigin | null;
  state: ItemState;
  previous_state: ItemState | null;
  included_at: string;
  paid_at: string | null;
  deleted_at: string | null;
}

export interface CategoryOut {
  id: number;
  name: string;
  item_count: number;
}

export interface DashboardOut {
  metrics: {
    total_a_gastar: number;
    total_gasto: number;
    itens_planejados: number;
    itens_backlog: number;
    itens_lixeira: number;
  };
  by_category: { category: string; total: number }[];
}

export interface AccessLogOut {
  id: number;
  created_at: string;
}

export interface AdminUserOut {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  last_access: string | null;
}

export interface AdminUserDetailOut extends AdminUserOut {
  access_logs: AccessLogOut[];
  reset_requests: { id: number; status: ResetStatus; created_at: string }[];
}

export interface ResetRequestOut {
  id: number;
  user_id: number;
  user_name: string | null;
  user_email: string | null;
  status: ResetStatus;
  created_at: string;
  token_expires_at: string | null;
  reset_link: string | null;
}

export interface AdminCountsOut {
  pending_registrations: number;
  pending_resets: number;
  total_pending: number;
}

export interface TokenOut {
  access_token: string;
  token_type: string;
  user: UserOut;
}
