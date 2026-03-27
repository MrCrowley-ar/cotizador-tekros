import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCultivoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;
}
