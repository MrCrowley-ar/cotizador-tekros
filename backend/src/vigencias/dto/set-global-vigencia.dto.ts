import { IsDateString } from 'class-validator';

export class SetGlobalVigenciaDto {
  @IsDateString()
  fechaVigencia: string;
}
