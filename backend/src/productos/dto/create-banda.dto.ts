import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateBandaDto {
  @IsInt()
  @IsPositive()
  cultivoId: number;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsInt()
  @IsOptional()
  orden?: number;
}
