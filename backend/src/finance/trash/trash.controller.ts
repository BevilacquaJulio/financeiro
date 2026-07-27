import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { TrashService } from './trash.service';

@ApiTags('trash')
@ApiBearerAuth()
@Controller('trash')
@UseGuards(JwtAuthGuard)
export class TrashController {
  constructor(private readonly trash: TrashService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.trash.list(user);
  }

  @Post(':id/restore')
  @HttpCode(200)
  restore(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.trash.restore(user, id);
  }

  @Delete(':id')
  purge(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.trash.purge(user, id);
  }
}
