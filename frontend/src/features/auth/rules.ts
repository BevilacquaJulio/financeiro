import { z } from 'zod';

/**
 * Espelho das regras de `backend/app/routers/auth.py`.
 *
 * O SERVIDOR continua sendo a autoridade — isto aqui so evita round-trip.
 * Se um dia a regra mudar no backend, mude aqui tambem, ou a UI passa a
 * rejeitar o que a API aceitaria (e vice-versa).
 */
export const EMAIL_DOMAIN =
  import.meta.env.VITE_EMAIL_DOMAIN ?? '@financeiro.com.br';

export const PASSWORD_RULE =
  /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>_\-+=[\]/\\;'`~]).{8,}$/;

export const EMAIL_LOCAL_RULE = /^[a-z0-9][a-z0-9._-]*$/;

/** Credenciais do usuario comum de teste (espelham `sql/demo-user.sql`). */
export const DEMO_USER = {
  email: 'demo',
  password: 'Demo@123',
} as const;

/** O campo do formulario recebe SO a parte local; o dominio e fixo na UI. */
export const emailLocalSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Informe o nome do e-mail.')
  .regex(EMAIL_LOCAL_RULE, 'Use letras minúsculas, números, ponto, hífen ou _.');
