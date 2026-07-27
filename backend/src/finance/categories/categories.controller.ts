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
import { PAYMENT_METHODS } from './categories.constants';
import { CategoryDto } from './categories.dto';
import { CategoriesService } from './categories.service';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.categories.list(user);
  }

  // Declarada ANTES de qualquer rota com parametro para nao ser capturada.
  @Get('payment-methods')
  paymentMethods() {
    return [...PAYMENT_METHODS];
  }

  @Post()
  @HttpCode(201)
  create(@CurrentUser() user: User, @Body() dto: CategoryDto) {
    return this.categories.create(user, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CategoryDto,
  ) {
    return this.categories.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  remove(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.categories.remove(user, id);
  }
}
