import {
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario, Usuario } from '../usuarios/usuario.entity';
import { DescuentosVolumenService } from './descuentos-volumen.service';
import { DescuentosService } from './descuentos.service';
import { CreateDescuentoVolumenDto } from './dto/create-descuento-volumen.dto';
import { CreateDescuentoDto } from './dto/create-descuento.dto';

// ─── DESCUENTOS ───────────────────────────────────────────────────────────────

@Controller('descuentos')
export class DescuentosController {
  constructor(private readonly service: DescuentosService) {}

  @Get()
  findAll(@Query('soloActivos', new ParseBoolPipe({ optional: true })) soloActivos?: boolean) {
    return this.service.findAll(soloActivos);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(RolUsuario.ADMIN)
  create(@Body() dto: CreateDescuentoDto, @CurrentUser() user: Usuario) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id/toggle')
  @Roles(RolUsuario.ADMIN)
  toggleActivo(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: Usuario) {
    return this.service.toggleActivo(id, user.id);
  }
}

// ─── DESCUENTOS VOLUMEN ───────────────────────────────────────────────────────

@Controller('descuentos-volumen')
export class DescuentosVolumenController {
  constructor(private readonly service: DescuentosVolumenService) {}

  @Get()
  findByCultivo(@Query('cultivoId', ParseIntPipe) cultivoId: number) {
    return this.service.findByCultivo(cultivoId);
  }

  @Post()
  @Roles(RolUsuario.ADMIN)
  create(@Body() dto: CreateDescuentoVolumenDto, @CurrentUser() user: Usuario) {
    return this.service.create(dto, user.id);
  }
}
