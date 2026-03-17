import { IsArray, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, IsUrl } from 'class-validator';

export class CreateMensajeDto {
  @IsInt()
  @IsPositive()
  usuarioId: number;

  @IsString()
  @IsNotEmpty()
  contenido: string;

  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  imagenes?: string[];
}
