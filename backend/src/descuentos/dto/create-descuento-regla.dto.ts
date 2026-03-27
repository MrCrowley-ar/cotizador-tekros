import { IsArray, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateDescuentoCondicionDto } from './create-descuento-condicion.dto';

export class CreateDescuentoReglaDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  nombre?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  valor: number;

  @IsInt()
  @IsOptional()
  prioridad?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDescuentoCondicionDto)
  condiciones: CreateDescuentoCondicionDto[];
}
