import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateSeccionDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  /** IDs de los descuentos que variarán entre secciones */
  @IsArray()
  @IsInt({ each: true })
  descuentosVariables: number[];
}
