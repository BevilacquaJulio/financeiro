import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * CONTRATO DE ERRO (plano, secoes 3.1 e 6.8).
 *
 * O frontend le `data.detail`. Toda resposta de erro precisa sair como
 * `{ "detail": ... }` com o MESMO status HTTP do FastAPI. Sem isso, todos os
 * toasts de erro da UI viram "Erro inesperado.".
 */
@Catch()
export class DetailExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpException');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      let detail: unknown;

      if (typeof body === 'string') {
        detail = body;
      } else if (body && typeof body === 'object' && 'detail' in body) {
        detail = (body as Record<string, unknown>).detail;
      } else if (body && typeof body === 'object' && 'message' in body) {
        const message = (body as Record<string, unknown>).message;
        detail = Array.isArray(message) ? message.join(' ') : message;
      } else {
        detail = exception.message;
      }

      res.status(status).json({ detail });
      return;
    }

    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ detail: 'Internal Server Error' });
  }
}
