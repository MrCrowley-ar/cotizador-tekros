import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateBandaDto } from './create-banda.dto';

export class UpdateBandaDto extends PartialType(CreateBandaDto) {
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
