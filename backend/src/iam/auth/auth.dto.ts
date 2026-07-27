import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Espelha `schemas.RegisterIn`. */
export class RegisterDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsString() @MinLength(1) @MaxLength(190) email!: string;
  @IsString() @MinLength(8) @MaxLength(128) password!: string;
}

/** Espelha `schemas.LoginIn`. */
export class LoginDto {
  @IsString() @MinLength(1) @MaxLength(190) email!: string;
  @IsString() password!: string;
  @IsOptional() @IsBoolean() remember_me?: boolean = false;
}

/** Espelha `schemas.ForgotPasswordIn`. */
export class ForgotPasswordDto {
  @IsString() @MinLength(1) @MaxLength(190) email!: string;
}

/** Espelha `schemas.ResetPasswordIn`. */
export class ResetPasswordDto {
  @IsString() token!: string;
  @IsString() @MinLength(8) @MaxLength(128) password!: string;
}
