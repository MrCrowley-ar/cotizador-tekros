import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsPositive } from 'class-validator';

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

  @IsInt()
  @IsOptional()
  usuarioId?: number;
}
