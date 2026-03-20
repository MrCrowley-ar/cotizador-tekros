import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class CreateHibridoDto {
  @IsInt()
  @IsPositive()
  cultivoId: number;

  @IsString()
  @IsNotEmpty()
  nombre: string;
}
