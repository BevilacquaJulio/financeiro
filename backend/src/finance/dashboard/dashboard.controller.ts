import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { parseDate } from '../../common/serialize';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  build(
    @CurrentUser() user: User,
    @Query('period') period = 'all',
    @Query('category_id') categoryId?: string,
    @Query('payment_method') paymentMethod?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.dashboard.build(user, {
      period,
      category_id: categoryId ? Number.parseInt(categoryId, 10) : undefined,
      payment_method: paymentMethod,
      start: parseDate(start),
      end: parseDate(end),
    });
  }
}
