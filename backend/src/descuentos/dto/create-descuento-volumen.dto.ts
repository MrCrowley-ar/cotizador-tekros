import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';


export class CreateDescuentoVolumenDto {
  @IsInt()
  @IsPositive()
  cultivoId: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cantidadMin: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  cantidadMax?: number; // null = sin límite superior

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  valorPorcentaje: number;

  @IsDateString()
  fecha: string;

  @IsInt()
  @IsOptional()
  usuarioId?: number;
}
