import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  ValidateNested,
} from 'class-validator';

export class CultivoVigenciaItemDto {
  @IsInt()
  cultivoId: number;

  @IsDateString()
  fechaVigencia: string;
}

export class SetCultivoVigenciasDto {
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => CultivoVigenciaItemDto)
  items: CultivoVigenciaItemDto[];
}
