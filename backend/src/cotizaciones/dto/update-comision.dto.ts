import { IsNumber, Max, Min } from 'class-validator';

export class UpdateComisionDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  margen: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  descuento: number;
}
