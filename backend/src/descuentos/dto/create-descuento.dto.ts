import { IsDateString, IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';

export class CreateDescuentoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  valorPorcentaje: number;

  @IsDateString()
  fecha: string;
}
