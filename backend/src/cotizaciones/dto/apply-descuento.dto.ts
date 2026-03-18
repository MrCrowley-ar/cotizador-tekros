import { IsInt, IsPositive } from 'class-validator';

export class ApplyDescuentoDto {
  @IsInt()
  @IsPositive()
  descuentoId: number;
}
