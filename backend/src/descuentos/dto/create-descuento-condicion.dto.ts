import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { CampoCondicion, OperadorCondicion } from '../descuento-condicion.entity';

export class CreateDescuentoCondicionDto {
  @IsEnum(CampoCondicion)
  campo: CampoCondicion;

  @IsEnum(OperadorCondicion)
  operador: OperadorCondicion;

  @IsNumber({ maxDecimalPlaces: 4 })
  valor: number;

  // Requerido solo si operador = ENTRE
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsOptional()
  valor2?: number;
}
