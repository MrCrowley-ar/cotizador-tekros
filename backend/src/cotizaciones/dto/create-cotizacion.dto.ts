import { IsInt, IsPositive } from 'class-validator';

export class CreateCotizacionDto {
  @IsInt()
  @IsPositive()
  clienteId: number;
}
