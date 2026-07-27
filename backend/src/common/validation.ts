import {
  HttpException,
  HttpStatus,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';

/**
 * O FastAPI responde 422 com `{detail: [{loc, msg, type}, ...]}` quando o corpo
 * nao bate com o schema pydantic. Reproduzimos essa forma para que o
 * `api.js`/`api.ts` (que ja trata `detail` como objeto) se comporte igual.
 */
function flatten(errors: ValidationError[], parent: string[] = []): unknown[] {
  const out: unknown[] = [];
  for (const err of errors) {
    const loc = [...parent, err.property];
    if (err.constraints) {
      for (const [type, msg] of Object.entries(err.constraints)) {
        out.push({ loc: ['body', ...loc], msg, type });
      }
    }
    if (err.children?.length) out.push(...flatten(err.children, loc));
  }
  return out;
}

export function buildValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false,
    transformOptions: { enableImplicitConversion: false },
    exceptionFactory: (errors: ValidationError[]) =>
      new HttpException(
        { detail: flatten(errors) },
        HttpStatus.UNPROCESSABLE_ENTITY,
      ),
  });
}
