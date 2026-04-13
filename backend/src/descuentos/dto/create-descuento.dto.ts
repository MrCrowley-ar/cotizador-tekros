import {
  IsArray,
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

  // Requerido en modo AVANZADO y SELECTOR
  @ValidateIf((o) => o.modo === ModoDescuento.AVANZADO || o.modo === ModoDescuento.SELECTOR)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDescuentoReglaDto)
  reglas?: CreateDescuentoReglaDto[];

  // Requerido en modo COMISION
  @ValidateIf((o) => o.modo === ModoDescuento.COMISION)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  comisionMargen?: number;

  @ValidateIf((o) => o.modo === ModoDescuento.COMISION)
  @IsNumber()
  comisionDescuentoId?: number;
}
