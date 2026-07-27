import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('infra')
@Controller('health')
export class HealthController {
  /** `GET /api/health` -> `{status:"ok"}` (sem autenticacao). */
  @Get()
  health() {
    return { status: 'ok' };
  }
}
