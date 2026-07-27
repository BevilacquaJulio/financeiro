import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { loadSettings } from '../../config/configuration';

/**
 * Porte de `backend/app/security.py`.
 *
 * ---------------------------------------------------------------------------
 * DIVERGENCIA DELIBERADA DO PLANO (secoes 3.2 e 6.2) — leia antes de "corrigir"
 * ---------------------------------------------------------------------------
 * O plano manda "replicar o truncamento a 72 bytes" que o Python faz
 * (`password.encode('utf-8')[:72]`). Fazer isso literalmente em Node QUEBRA o
 * login em um caso real.
 *
 * Motivo: em Node so da para reconstruir uma STRING a partir dos 72 primeiros
 * bytes, e quando o corte cai no meio de um caractere multibyte (acento, emoji)
 * a re-decodificacao troca os bytes cortados por U+FFFD. O hash muda.
 *
 * Verificado empiricamente com hashes gerados pelo bcrypt do Python
 * (ver `test/bcrypt-parity.test.ts`), senha "A" + "a-acentuado" x36 (73 bytes):
 *
 *   string crua                      -> valida    OK
 *   re-decodificada dos 72 bytes     -> NAO valida
 *   latin1 dos 72 bytes              -> NAO valida
 *
 * O bcryptjs converte a string para UTF-8 internamente e o proprio algoritmo
 * Blowfish consome no maximo 72 bytes de chave — ou seja, o truncamento ja
 * acontece, nos mesmos bytes que o Python usa. Passar a STRING CRUA e o que
 * reproduz o Python. Nao pre-trunque.
 */
@Injectable()
export class SecurityService {
  private readonly settings = loadSettings();

  constructor(private readonly jwt: JwtService) {}

  hashPassword(password: string): string {
    return bcrypt.hashSync(password, bcrypt.genSaltSync());
  }

  verifyPassword(plain: string, hashed: string): boolean {
    try {
      return bcrypt.compareSync(plain, hashed);
    } catch {
      return false;
    }
  }

  /**
   * JWT identico ao do Python: HS256, payload `{sub: str(user.id), exp}`.
   * Mesmo segredo => tokens ja emitidos continuam validos (sem re-login).
   */
  async createAccessToken(subject: number | string, rememberMe = false): Promise<string> {
    const minutes = rememberMe
      ? this.settings.rememberMeExpireMinutes
      : this.settings.accessTokenExpireMinutes;
    return this.jwt.signAsync(
      { sub: String(subject) },
      { expiresIn: `${minutes}m` },
    );
  }
}
