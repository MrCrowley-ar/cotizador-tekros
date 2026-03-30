import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { CampoCondicion, OperadorCondicion } from '../descuento-condicion.entity';

export class CreateDescuentoCondicionDto {
  @IsEnum(CampoCondicion)
  campo: CampoCondicion;

  @IsEnum(OperadorCondicion)
  operador: OperadorCondicion;

  // Para condición fija: valor numérico de referencia.
  // Para condición relativa (valorCampo presente): se ignora; enviar 0.
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsOptional()
  valor?: number;

  // Solo para operador ENTRE: límite superior
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsOptional()
  valor2?: number;

  // ── Comparación relativa (opcional) ──────────────────────────────────────
  // Si se define, la condición compara: ctx[campo] op (valorMultiplier × ctx[valorCampo])
  @IsEnum(CampoCondicion)
  @IsOptional()
  valorCampo?: CampoCondicion;

  @IsNumber({ maxDecimalPlaces: 6 })
  @IsOptional()
  valorMultiplier?: number;
}
