import { IsInt, IsNumber, IsOptional, IsPositive, Max, Min } from 'class-validator';

export class ApplyDescuentoDto {
  @IsInt()
  @IsPositive()
  descuentoId: number;

  // Requerido para descuentos en modo avanzado: porcentaje de la regla a aplicar.
  // Obtenerlo primero con POST /descuentos/evaluar.
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @IsOptional()
  porcentaje?: number;
}
