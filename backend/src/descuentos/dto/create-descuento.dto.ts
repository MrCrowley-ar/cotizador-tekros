import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ModoDescuento, TipoAplicacion } from '../descuento.entity';
import { CreateDescuentoReglaDto } from './create-descuento-regla.dto';

export class CreateDescuentoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsEnum(TipoAplicacion)
  @IsOptional()
  tipoAplicacion?: TipoAplicacion;

  @IsEnum(ModoDescuento)
  @IsOptional()
  modo?: ModoDescuento;

  // Requerido solo si modo = BASICO
  @ValidateIf((o) => !o.modo || o.modo === ModoDescuento.BASICO)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  valorPorcentaje?: number;

  @IsDateString()
  fechaVigencia: string;

  // Requerido solo si modo = AVANZADO
  @ValidateIf((o) => o.modo === ModoDescuento.AVANZADO)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDescuentoReglaDto)
  reglas?: CreateDescuentoReglaDto[];
}
