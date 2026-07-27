import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import {
  ChangePasswordDto,
  UserPreferencesUpdateDto,
  UserUpdateDto,
} from './users.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: User) {
    return this.users.getMe(user);
  }

  @Put('me')
  updateMe(@CurrentUser() user: User, @Body() dto: UserUpdateDto) {
    return this.users.updateMe(user, dto);
  }

  @Get('me/preferences')
  getPreferences(@CurrentUser() user: User) {
    return this.users.getPreferences(user);
  }

  @Put('me/preferences')
  updatePreferences(
    @CurrentUser() user: User,
    @Body() dto: UserPreferencesUpdateDto,
  ) {
    return this.users.updatePreferences(user, dto);
  }

  @Put('me/password')
  changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.users.changePassword(user, dto);
  }

  @Get('me/access-logs')
  accessLogs(
    @CurrentUser() user: User,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.users.accessLogs(user, limit);
  }
}
