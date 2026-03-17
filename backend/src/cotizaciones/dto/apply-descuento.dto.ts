import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class ApplyDescuentoDto {
  @IsInt()
  @IsPositive()
  descuentoId: number;

  @IsInt()
  @IsOptional()
  usuarioId?: number;
}
