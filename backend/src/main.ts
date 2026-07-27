import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { DetailExceptionFilter } from './common/http-exception.filter';
import { buildValidationPipe } from './common/validation';
import { loadSettings } from './config/configuration';

async function bootstrap(): Promise<void> {
  const settings = loadSettings();
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  // Equivale ao prefixo "/api" que cada APIRouter do FastAPI declarava.
  app.setGlobalPrefix('api');

  /**
   * CORS (plano, secao 6.3): o sistema atual usa `allow_origins=["*"]` junto
   * com `allow_credentials=True` — combinacao que os navegadores rejeitam e
   * que so "funciona" hoje porque o app manda Bearer em header, nao cookie.
   * NAO replicamos. Origem explicita via CORS_ORIGINS; vazio = mesma origem.
   */
  if (settings.corsOrigins.length > 0) {
    app.enableCors({
      origin: settings.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });
  }

  app.useGlobalPipes(buildValidationPipe());
  app.useGlobalFilters(new DetailExceptionFilter());

  const doc = new DocumentBuilder()
    .setTitle('Sistema de Controle Financeiro')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc));

  await app.listen(settings.port, '0.0.0.0');
  new Logger('bootstrap').log(
    `API em http://0.0.0.0:${settings.port}/api  |  docs em /api/docs`,
  );
}

void bootstrap();
