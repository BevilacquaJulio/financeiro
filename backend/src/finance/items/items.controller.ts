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
import type { User } from '@prisma/client';
import { CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { ItemCreateDto, ItemUpdateDto, PayItemDto } from './items.dto';
import { ItemsService } from './items.service';

@ApiTags('items')
@ApiBearerAuth()
@Controller('items')
@UseGuards(JwtAuthGuard)
export class ItemsController {
  constructor(private readonly items: ItemsService) {}

  @Get()
  list(@CurrentUser() user: User, @Query('state') state = 'lista') {
    return this.items.list(user, state);
  }

  @Post()
  @HttpCode(201)
  create(
    @CurrentUser() user: User,
    @Body() dto: ItemCreateDto,
    @Query('state') state = 'lista',
  ) {
    return this.items.create(user, dto, state);
  }

  @Put(':id')
  update(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ItemUpdateDto,
  ) {
    return this.items.update(user, id, dto);
  }

  @Post(':id/pay')
  @HttpCode(200)
  pay(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PayItemDto,
  ) {
    return this.items.pay(user, id, dto);
  }

  @Post(':id/move-backlog')
  @HttpCode(200)
  moveBacklog(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.items.moveToBacklog(user, id);
  }

  @Post(':id/promote')
  @HttpCode(200)
  promote(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.items.promote(user, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.items.softDelete(user, id);
  }
}
