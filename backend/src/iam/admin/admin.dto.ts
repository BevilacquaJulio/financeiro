import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Espelha `schemas.AdminUserUpdate` (patch parcial). */
export class AdminUserUpdateDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(190) email?: string;
  @IsOptional() @IsString() @MinLength(8) @MaxLength(128) password?: string;
}
