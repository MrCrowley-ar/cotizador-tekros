import { IsInt, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class UpdateItemDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  hibridoId?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  bandaId?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  bolsas?: number;
}
