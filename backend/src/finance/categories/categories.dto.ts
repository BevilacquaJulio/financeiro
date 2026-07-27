import { IsString, MaxLength, MinLength } from 'class-validator';

/** Espelha `schemas.CategoryIn`. */
export class CategoryDto {
  @IsString() @MinLength(1) @MaxLength(80) name!: string;
}
