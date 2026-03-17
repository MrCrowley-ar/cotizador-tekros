import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateCultivoDto } from './create-cultivo.dto';

export class UpdateCultivoDto extends PartialType(CreateCultivoDto) {
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
