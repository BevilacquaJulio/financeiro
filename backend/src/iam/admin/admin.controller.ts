import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../../common/admin.guard';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { AdminUserUpdateDto } from './admin.dto';
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('counts')
  counts() {
    return this.admin.counts();
  }

  @Get('users')
  listUsers(@Query('status') status?: string) {
    return this.admin.listUsers(status);
  }

  // ATENCAO a ordem: 'password-resets' precisa vir antes de 'users/:id'? Nao —
  // sao prefixos distintos. Mas 'users/:id' DEVE vir depois de rotas literais
  // sob 'users/' (nao ha nenhuma), entao a ordem abaixo e segura.
  @Get('users/:id')
  userDetail(@Param('id', ParseIntPipe) id: number) {
    return this.admin.getUserDetail(id);
  }

  @Put('users/:id')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUserUpdateDto,
  ) {
    return this.admin.updateUser(id, dto);
  }

  @Post('users/:id/approve')
  @HttpCode(200)
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.admin.approveUser(id);
  }

  @Post('users/:id/reject')
  @HttpCode(200)
  reject(@Param('id', ParseIntPipe) id: number) {
    return this.admin.rejectUser(id);
  }

  @Post('users/:id/suspend')
  @HttpCode(200)
  suspend(@Param('id', ParseIntPipe) id: number) {
    return this.admin.suspendUser(id);
  }

  @Delete('users/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.admin.deleteUser(id);
  }

  @Get('password-resets')
  listResets(@Query('only_pending') onlyPending?: string) {
    return this.admin.listResets(onlyPending === 'true' || onlyPending === '1');
  }

  @Get('password-resets/:userId/history')
  resetHistory(@Param('userId', ParseIntPipe) userId: number) {
    return this.admin.resetHistory(userId);
  }

  @Post('password-resets/:reqId/approve')
  @HttpCode(200)
  approveReset(@Param('reqId', ParseIntPipe) reqId: number) {
    return this.admin.approveReset(reqId);
  }

  @Post('password-resets/:reqId/reject')
  @HttpCode(200)
  rejectReset(@Param('reqId', ParseIntPipe) reqId: number) {
    return this.admin.rejectReset(reqId);
  }
}
