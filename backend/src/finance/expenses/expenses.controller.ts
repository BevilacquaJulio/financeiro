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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { ExpenseCreateDto, ExpenseUpdateDto } from '../items/items.dto';
import { ExpensesService } from './expenses.service';

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.expenses.list(user);
  }

  @Post()
  @HttpCode(201)
  create(@CurrentUser() user: User, @Body() dto: ExpenseCreateDto) {
    return this.expenses.create(user, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ExpenseUpdateDto,
  ) {
    return this.expenses.update(user, id, dto);
  }

  @Post(':id/reopen')
  @HttpCode(200)
  reopen(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.expenses.reopen(user, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.expenses.softDelete(user, id);
  }
}
