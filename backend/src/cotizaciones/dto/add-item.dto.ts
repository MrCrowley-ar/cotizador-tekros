import { IsInt, IsNumber, IsPositive } from 'class-validator';

export class AddItemDto {
  @IsInt()
  @IsPositive()
  cultivoId: number;

  @IsInt()
  @IsPositive()
  hibridoId: number;

  @IsInt()
  @IsPositive()
  bandaId: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  bolsas: number;
}
