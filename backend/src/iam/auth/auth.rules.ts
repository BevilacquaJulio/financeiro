import { HttpException, HttpStatus } from '@nestjs/common';
import { loadSettings } from '../../config/configuration';

/**
 * Porte literal das regras de `routers/auth.py`.
 * Regex e mensagens copiados VERBATIM — a UI depende do texto de `detail`.
 */

// ^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?\":{}|<>_\-+=\[\]/\\;'`~]).{8,}$
export const PASSWORD_RULE =
  /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>_\-+=[\]/\\;'`~]).{8,}$/;

export const EMAIL_LOCAL_RULE = /^[a-z0-9][a-z0-9._-]*$/;

function bad(detail: string): HttpException {
  return new HttpException({ detail }, HttpStatus.BAD_REQUEST);
}

/**
 * Aceita so a parte local ou o e-mail completo; sempre devolve
 * `usuario@financeiro.com.br`.
 */
export function normalizeEmail(email: string): string {
  const settings = loadSettings();
  let value = (email ?? '').toLowerCase().trim();
  const domain = settings.emailDomain.toLowerCase();

  if (!value.includes('@')) {
    if (!value) throw bad('Informe o nome do e-mail.');
    value = `${value}${domain}`;
  } else if (!value.endsWith(domain)) {
    throw bad(`O e-mail deve usar o dominio ${settings.emailDomain}.`);
  }

  const local = value.slice(0, value.length - domain.length);
  if (!local || !EMAIL_LOCAL_RULE.test(local)) {
    throw bad('Nome de e-mail invalido.');
  }
  return value;
}

export function validateEmailDomain(email: string): string {
  return normalizeEmail(email);
}

export function validatePassword(password: string): void {
  if (!PASSWORD_RULE.test(password ?? '')) {
    throw bad(
      'A senha deve ter ao menos 8 caracteres, 1 maiuscula e 1 caractere especial.',
    );
  }
}
