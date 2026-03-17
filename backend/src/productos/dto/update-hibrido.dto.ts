import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateHibridoDto } from './create-hibrido.dto';

export class UpdateHibridoDto extends PartialType(CreateHibridoDto) {
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
