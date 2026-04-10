import { IsDateString, IsOptional, ValidateIf } from 'class-validator';

export class UpsertCultivoVigenciaDto {
  @ValidateIf((o) => o.vigenciaDesde !== null && o.vigenciaDesde !== undefined)
  @IsDateString()
  @IsOptional()
  vigenciaDesde?: string | null;

  @ValidateIf((o) => o.vigenciaHasta !== null && o.vigenciaHasta !== undefined)
  @IsDateString()
  @IsOptional()
  vigenciaHasta?: string | null;
}
