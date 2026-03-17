import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { EstadoCotizacion } from '../cotizacion.entity';

export class UpdateEstadoDto {
  @IsEnum(EstadoCotizacion)
  estado: EstadoCotizacion;

  @IsInt()
  @IsOptional()
  usuarioId?: number;
}
