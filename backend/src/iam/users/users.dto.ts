import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

/** Espelha `schemas.UserUpdate` (patch parcial: campo ausente = nao mexe). */
export class UserUpdateDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;

  @IsOptional() @ValidateIf((_o, v) => v !== null) @IsString() avatar?: string | null;

  @IsOptional() @ValidateIf((_o, v) => v !== null) @IsString() currency?: string | null;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  trash_autoclean_days?: number | null;
}

/** Espelha `schemas.UserPreferencesUpdate` (PUT e patch PARCIAL). */
export class UserPreferencesUpdateDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(40) sidebar_title?: string;

  @IsOptional() @IsString() @Matches(/^#[0-9A-Fa-f]{6}$/) accent_color?: string;

  @IsOptional() @IsString() brand_icon?: string;

  @IsOptional() @IsString() nav_icon_style?: string;

  @IsOptional() @IsArray() @IsString({ each: true }) nav_order?: string[];

  @IsOptional() @IsObject() nav_icons?: Record<string, string>;
}

/** Espelha `schemas.ChangePasswordIn`. */
export class ChangePasswordDto {
  @IsString() current_password!: string;
  @IsString() @MinLength(8) @MaxLength(128) new_password!: string;
}
