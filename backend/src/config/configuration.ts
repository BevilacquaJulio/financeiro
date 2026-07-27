/**
 * Porte de `backend/app/config.py` (pydantic-settings).
 * Mesmos nomes de variavel de ambiente e MESMOS DEFAULTS.
 */

function str(key: string, fallback: string): string {
  const v = process.env[key];
  return v === undefined || v === '' ? fallback : v;
}

function int(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined || v === '') return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
}

function bool(key: string, fallback: boolean): boolean {
  const v = process.env[key];
  if (v === undefined || v === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

/**
 * Espelha `database.py`: quote_plus no usuario e na senha.
 * encodeURIComponent nao escapa ! ' ( ) * — quote_plus escapa. Alinhamos.
 */
function quotePlus(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

export interface AppSettings {
  nodeEnv: string;
  port: number;

  mysqlHost: string;
  mysqlPort: number;
  mysqlDatabase: string;
  mysqlUser: string;
  mysqlPassword: string;
  databaseUrl: string;

  jwtSecret: string;
  jwtAlgorithm: string;
  accessTokenExpireMinutes: number;
  rememberMeExpireMinutes: number;

  adminName: string;
  adminEmail: string;
  adminPassword: string;

  emailDomain: string;
  passwordResetExpireMinutes: number;

  smtpEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpFrom: string;
  smtpTls: boolean;

  domain: string;
  appBaseUrl: string;

  corsOrigins: string[];
}

export function loadSettings(): AppSettings {
  const mysqlHost = str('MYSQL_HOST', 'localhost');
  const mysqlPort = int('MYSQL_PORT', 3306);
  const mysqlDatabase = str('MYSQL_DATABASE', 'financeiro');
  const mysqlUser = str('MYSQL_USER', 'root');
  const mysqlPassword = str('MYSQL_PASSWORD', '');

  const databaseUrl =
    process.env.DATABASE_URL && process.env.DATABASE_URL !== ''
      ? process.env.DATABASE_URL
      : `mysql://${quotePlus(mysqlUser)}:${quotePlus(mysqlPassword)}` +
        `@${mysqlHost}:${mysqlPort}/${mysqlDatabase}?charset=utf8mb4`;

  // Prisma le DATABASE_URL do ambiente no `prisma generate`/`migrate`.
  process.env.DATABASE_URL = databaseUrl;

  const domain = str('DOMAIN', '');
  let appBaseUrl = str('APP_BASE_URL', '');
  if (appBaseUrl) {
    appBaseUrl = appBaseUrl.replace(/\/+$/, '');
  } else if (domain.trim()) {
    appBaseUrl = `https://${domain.trim().replace(/\/+$/, '')}`;
  } else {
    appBaseUrl = 'http://localhost:8000';
  }

  return {
    nodeEnv: str('NODE_ENV', 'development'),
    port: int('PORT', 8000),

    mysqlHost,
    mysqlPort,
    mysqlDatabase,
    mysqlUser,
    mysqlPassword,
    databaseUrl,

    jwtSecret: str('JWT_SECRET', 'dev-secret-change-me'),
    jwtAlgorithm: str('JWT_ALGORITHM', 'HS256'),
    accessTokenExpireMinutes: int('ACCESS_TOKEN_EXPIRE_MINUTES', 120),
    rememberMeExpireMinutes: int('REMEMBER_ME_EXPIRE_MINUTES', 43200),

    adminName: str('ADMIN_NAME', 'Administrador'),
    adminEmail: str('ADMIN_EMAIL', 'admin@financeiro.com.br'),
    adminPassword: str('ADMIN_PASSWORD', 'Admin@123'),

    emailDomain: str('EMAIL_DOMAIN', '@financeiro.com.br'),
    passwordResetExpireMinutes: int('PASSWORD_RESET_EXPIRE_MINUTES', 30),

    smtpEnabled: bool('SMTP_ENABLED', false),
    smtpHost: str('SMTP_HOST', ''),
    smtpPort: int('SMTP_PORT', 587),
    smtpUser: str('SMTP_USER', ''),
    smtpPassword: str('SMTP_PASSWORD', ''),
    smtpFrom: str('SMTP_FROM', 'nao-responda@financeiro.com.br'),
    smtpTls: bool('SMTP_TLS', true),

    domain,
    appBaseUrl,

    corsOrigins: str('CORS_ORIGINS', '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  };
}

export const SETTINGS = 'SETTINGS';
