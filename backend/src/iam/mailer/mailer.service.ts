import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { loadSettings } from '../../config/configuration';

/**
 * Porte de `emailer.send_reset_email`.
 *
 * Sem SMTP configurado: registra o link em log e retorna false, para que o
 * painel admin exiba o link (comportamento identico ao Python).
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger('financeiro.emailer');
  private readonly settings = loadSettings();

  async sendResetEmail(toEmail: string, resetLink: string): Promise<boolean> {
    const s = this.settings;
    if (!s.smtpEnabled || !s.smtpHost) {
      this.logger.warn(
        `SMTP desabilitado. Link de reset para ${toEmail}: ${resetLink}`,
      );
      return false;
    }

    const body =
      'Voce solicitou a redefinicao de senha.\n\n' +
      `Use o link a seguir (valido por ${s.passwordResetExpireMinutes} minutos):\n` +
      `${resetLink}\n\n` +
      'Se nao foi voce, ignore este e-mail.';

    try {
      const transport = nodemailer.createTransport({
        host: s.smtpHost,
        port: s.smtpPort,
        secure: s.smtpPort === 465,
        requireTLS: s.smtpTls,
        auth: s.smtpUser
          ? { user: s.smtpUser, pass: s.smtpPassword }
          : undefined,
        connectionTimeout: 15000,
      });
      await transport.sendMail({
        from: s.smtpFrom,
        to: toEmail,
        subject: 'Redefinicao de senha - Financeiro',
        text: body,
      });
      return true;
    } catch (exc) {
      this.logger.error(
        `Falha ao enviar e-mail de reset para ${toEmail}: ${String(exc)}`,
      );
      return false;
    }
  }
}
