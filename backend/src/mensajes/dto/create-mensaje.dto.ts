import { IsArray, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateMensajeDto {
  @IsString()
  @IsNotEmpty()
  contenido: string;

  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  imagenes?: string[];
}
