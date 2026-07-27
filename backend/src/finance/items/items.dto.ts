import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

const nullable = () => ValidateIf((_o, v) => v !== null);

/** Espelha `schemas.ItemCreate`. */
export class ItemCreateDto {
  @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @IsOptional() @nullable() @Type(() => Number) @IsInt() category_id?: number | null;
  @IsOptional() @Type(() => Number) @IsNumber() estimated_price?: number = 0;
  @IsOptional() @nullable() @IsString() priority?: string | null;
  @IsOptional() @nullable() @IsString() notes?: string | null;
}

/** Espelha `schemas.ItemUpdate` (patch parcial). */
export class ItemUpdateDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(160) name?: string;
  @IsOptional() @nullable() @Type(() => Number) @IsInt() category_id?: number | null;
  @IsOptional() @nullable() @Type(() => Number) @IsNumber() estimated_price?: number | null;
  @IsOptional() @nullable() @IsString() priority?: string | null;
  @IsOptional() @nullable() @IsString() notes?: string | null;
}

/** Espelha `schemas.PayItemIn`. */
export class PayItemDto {
  @IsOptional() @nullable() @Type(() => Number) @IsNumber() paid_value?: number | null;
  @IsOptional() @nullable() @IsString() payment_method?: string | null;
  @IsOptional() @nullable() @IsDateString() paid_at?: string | null;
}

/** Espelha `schemas.ExpenseCreate`. */
export class ExpenseCreateDto {
  @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @IsOptional() @nullable() @Type(() => Number) @IsInt() category_id?: number | null;
  @Type(() => Number) @IsNumber() @Min(0) paid_value!: number;
  @IsOptional() @nullable() @IsString() payment_method?: string | null;
  @IsOptional() @nullable() @IsString() notes?: string | null;
  @IsOptional() @nullable() @IsDateString() paid_at?: string | null;
}

/** Espelha `schemas.ExpenseUpdate` (patch parcial). */
export class ExpenseUpdateDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(160) name?: string;
  @IsOptional() @nullable() @Type(() => Number) @IsInt() category_id?: number | null;
  @IsOptional() @nullable() @Type(() => Number) @IsNumber() @Min(0) paid_value?: number | null;
  @IsOptional() @nullable() @IsString() payment_method?: string | null;
  @IsOptional() @nullable() @IsString() notes?: string | null;
  @IsOptional() @nullable() @IsDateString() paid_at?: string | null;
}
