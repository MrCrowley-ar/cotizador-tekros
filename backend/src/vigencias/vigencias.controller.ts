import { Body, Controller, Get, Put } from '@nestjs/common';
import { SetCultivoVigenciasDto } from './dto/set-cultivo-vigencias.dto';
import { SetGlobalVigenciaDto } from './dto/set-global-vigencia.dto';
import { VigenciasService } from './vigencias.service';

@Controller('vigencias')
export class VigenciasController {
  constructor(private readonly service: VigenciasService) {}

  @Get()
  getAll() {
    return this.service.findAll();
  }

  @Put('global')
  setGlobal(@Body() dto: SetGlobalVigenciaDto) {
    return this.service.setGlobal(dto);
  }

  @Put('cultivos')
  setPorCultivo(@Body() dto: SetCultivoVigenciasDto) {
    return this.service.setPorCultivo(dto);
  }
}
