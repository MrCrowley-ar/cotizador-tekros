import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario, Usuario } from '../usuarios/usuario.entity';
import { AddItemDto } from './dto/add-item.dto';
import { ApplyDescuentoDto } from './dto/apply-descuento.dto';
import { CreateCotizacionDto } from './dto/create-cotizacion.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';
import { CotizacionesService } from './cotizaciones.service';

@Controller('cotizaciones')
export class CotizacionesController {
  constructor(private readonly service: CotizacionesService) {}

  // ─── COTIZACIONES ──────────────────────────────────────────────────────────

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  crear(@Body() dto: CreateCotizacionDto, @CurrentUser() user: Usuario) {
    return this.service.crear(dto, user.id);
  }

  @Patch(':id/estado')
  updateEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstadoDto,
    @CurrentUser() user: Usuario,
  ) {
    return this.service.updateEstado(id, dto, user.id);
  }

  // ─── VERSIONES ────────────────────────────────────────────────────────────

  @Get(':id/versiones')
  getVersiones(@Param('id', ParseIntPipe) id: number) {
    return this.service.getVersiones(id);
  }

  @Post(':id/versiones')
  crearNuevaVersion(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { nombre?: string },
    @CurrentUser() user: Usuario,
  ) {
    return this.service.crearNuevaVersion(id, user.id, body?.nombre);
  }

  @Get(':id/versiones/:versionId')
  getVersion(
    @Param('id', ParseIntPipe) id: number,
    @Param('versionId', ParseIntPipe) versionId: number,
  ) {
    return this.service.getVersion(id, versionId);
  }

  @Delete(':id/versiones/:versionId')
  @HttpCode(204)
  eliminarVersion(
    @Param('id', ParseIntPipe) id: number,
    @Param('versionId', ParseIntPipe) versionId: number,
    @CurrentUser() user: Usuario,
  ) {
    return this.service.eliminarVersion(id, versionId, user.id);
  }

  // ─── TOTAL ────────────────────────────────────────────────────────────────

  @Get(':id/versiones/:versionId/total')
  getTotal(@Param('versionId', ParseIntPipe) versionId: number) {
    return this.service.calcularTotal(versionId);
  }

  // ─── ITEMS ────────────────────────────────────────────────────────────────

  @Post(':id/versiones/:versionId/items')
  agregarItem(
    @Param('versionId', ParseIntPipe) versionId: number,
    @Body() dto: AddItemDto,
    @CurrentUser() user: Usuario,
  ) {
    return this.service.agregarItem(versionId, dto, user.id);
  }

  @Delete(':id/versiones/:versionId/items/:itemId')
  @HttpCode(204)
  eliminarItem(
    @Param('versionId', ParseIntPipe) versionId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @CurrentUser() user: Usuario,
  ) {
    return this.service.eliminarItem(versionId, itemId, user.id);
  }

  // ─── DESCUENTOS POR ÍTEM ──────────────────────────────────────────────────

  @Post(':id/versiones/:versionId/items/:itemId/descuentos')
  aplicarDescuentoItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: ApplyDescuentoDto,
    @CurrentUser() user: Usuario,
  ) {
    return this.service.aplicarDescuentoItem(itemId, dto, user.id);
  }

  @Delete(':id/versiones/:versionId/items/:itemId/descuentos/:did')
  @HttpCode(204)
  eliminarDescuentoItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Param('did', ParseIntPipe) did: number,
    @CurrentUser() user: Usuario,
  ) {
    return this.service.eliminarDescuentoItem(itemId, did, user.id);
  }

  // ─── DESCUENTOS GLOBALES ──────────────────────────────────────────────────

  @Post(':id/versiones/:versionId/descuentos')
  aplicarDescuentoGlobal(
    @Param('versionId', ParseIntPipe) versionId: number,
    @Body() dto: ApplyDescuentoDto,
    @CurrentUser() user: Usuario,
  ) {
    return this.service.aplicarDescuentoGlobal(versionId, dto, user.id);
  }

  @Delete(':id/versiones/:versionId/descuentos/:did')
  @Roles(RolUsuario.ADMIN)
  @HttpCode(204)
  eliminarDescuentoGlobal(
    @Param('versionId', ParseIntPipe) versionId: number,
    @Param('did', ParseIntPipe) did: number,
    @CurrentUser() user: Usuario,
  ) {
    return this.service.eliminarDescuentoGlobal(versionId, did, user.id);
  }
}
