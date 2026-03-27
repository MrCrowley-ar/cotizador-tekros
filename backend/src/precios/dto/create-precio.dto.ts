import { IsDateString, IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class CreatePrecioDto {
  @IsInt()
  @IsPositive()
  hibridoId: number;

  @IsInt()
  @IsPositive()
  bandaId: number;

  @IsPositive()
  precio: number;

  @IsDateString()
  @IsNotEmpty()
  fecha: string;

}
