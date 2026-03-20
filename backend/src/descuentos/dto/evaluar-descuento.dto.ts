import { IsEnum, IsInt, IsNumber, IsOptional, IsPositive, Min } from 'class-validator';
import { TipoAplicacion } from '../descuento.entity';

export class EvaluarDescuentoDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  cantidad?: number;

  @IsEnum(TipoAplicacion)
  tipoAplicacion: TipoAplicacion;

  @IsInt()
  @IsPositive()
  @IsOptional()
  cultivoId?: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  hibridoId?: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  bandaId?: number;
}
