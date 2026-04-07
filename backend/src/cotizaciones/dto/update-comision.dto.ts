import { IsNumber, Max, Min, ValidateIf } from 'class-validator';

export class UpdateComisionDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  margen: number;

  @ValidateIf((o) => o.descuentoId !== null && o.descuentoId !== undefined)
  @IsNumber()
  descuentoId: number | null;
}
