import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { TipoEntidad } from './historial-accion.entity';
import { HistorialService } from './historial.service';

@Controller('historial')
export class HistorialController {
  constructor(private readonly service: HistorialService) {}

  // Últimas acciones (feed general)
  @Get()
  findRecientes(@Query('limit') limit?: string) {
    return this.service.findRecientes(limit ? parseInt(limit, 10) : 50);
  }

  // Historial de una cotización
  @Get('cotizacion/:cotizacionId')
  findByCotizacion(@Param('cotizacionId', ParseIntPipe) cotizacionId: number) {
    return this.service.findByCotizacion(cotizacionId);
  }

  // Acciones de un usuario
  @Get('usuario/:usuarioId')
  findByUsuario(@Param('usuarioId', ParseIntPipe) usuarioId: number) {
    return this.service.findByUsuario(usuarioId);
  }

  // Acciones por tipo de entidad (ej: /historial/entidad/precio)
  @Get('entidad/:tipoEntidad')
  findByEntidad(@Param('tipoEntidad') tipoEntidad: TipoEntidad) {
    return this.service.findByEntidad(tipoEntidad);
  }
}
