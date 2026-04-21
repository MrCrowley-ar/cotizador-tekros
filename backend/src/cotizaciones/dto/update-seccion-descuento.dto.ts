import { IsInt, IsNumber, IsOptional, IsPositive, Max, Min } from 'class-validator';

export class UpdateSeccionDescuentoDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  porcentaje: number;

  // Para descuentos modo selector/avanzado: id de la regla específica elegida.
  @IsInt()
  @IsPositive()
  @IsOptional()
  reglaId?: number;
}
