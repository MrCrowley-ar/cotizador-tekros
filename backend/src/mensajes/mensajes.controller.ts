import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CreateMensajeDto } from './dto/create-mensaje.dto';
import { MensajesService } from './mensajes.service';

@Controller('mensajes')
export class MensajesController {
  constructor(private readonly service: MensajesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreateMensajeDto) {
    return this.service.create(dto);
  }

  @Patch(':id/toggle-fijado')
  toggleFijado(
    @Param('id', ParseIntPipe) id: number,
    @Body('usuarioId') usuarioId?: number,
  ) {
    return this.service.toggleFijado(id, usuarioId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Body('usuarioId') usuarioId?: number,
  ) {
    return this.service.remove(id, usuarioId);
  }
}
