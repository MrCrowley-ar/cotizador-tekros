import { Body, Controller, Get, ParseIntPipe, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario, Usuario } from '../usuarios/usuario.entity';
import { CreatePrecioDto } from './dto/create-precio.dto';
import { PreciosService } from './precios.service';

@Controller('precios')
export class PreciosController {
  constructor(private readonly service: PreciosService) {}

  @Post()
  @Roles(RolUsuario.ADMIN)
  registrar(@Body() dto: CreatePrecioDto, @CurrentUser() user: Usuario) {
    return this.service.registrar(dto, user.id);
  }

  @Get('matriz')
  getMatriz(@Query('cultivoId', ParseIntPipe) cultivoId: number) {
    return this.service.getMatrizPorCultivo(cultivoId);
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
