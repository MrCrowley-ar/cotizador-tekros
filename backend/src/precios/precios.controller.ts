import { Body, Controller, Get, ParseIntPipe, Post, Query } from '@nestjs/common';
import { CreatePrecioDto } from './dto/create-precio.dto';
import { PreciosService } from './precios.service';

@Controller('precios')
export class PreciosController {
  constructor(private readonly service: PreciosService) {}

  @Post()
  registrar(@Body() dto: CreatePrecioDto) {
    return this.service.registrar(dto);
  }

  @Get('actual')
  getActual(
    @Query('hibridoId', ParseIntPipe) hibridoId: number,
    @Query('bandaId', ParseIntPipe) bandaId: number,
  ) {
    return this.service.getPrecioActual(hibridoId, bandaId);
  }

  @Get('historico')
  getHistorico(
    @Query('hibridoId', ParseIntPipe) hibridoId: number,
    @Query('bandaId', ParseIntPipe) bandaId: number,
  ) {
    return this.service.getHistorico(hibridoId, bandaId);
  }
}
