import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateHibridoDto {
  @IsInt()
  @IsPositive()
  cultivoId: number;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsNumber()
  volumen?: number;
}
