import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from '../usuarios/usuario.entity';
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
  create(@Body() dto: CreateMensajeDto, @CurrentUser() user: Usuario) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id/toggle-fijado')
  toggleFijado(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: Usuario) {
    return this.service.toggleFijado(id, user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: Usuario) {
    return this.service.remove(id, user.id);
  }
}
