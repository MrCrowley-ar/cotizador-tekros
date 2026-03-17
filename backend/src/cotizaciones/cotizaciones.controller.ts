import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
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
  crear(@Body() dto: CreateCotizacionDto) {
    return this.service.crear(dto);
  }

  @Patch(':id/estado')
  updateEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstadoDto,
  ) {
    return this.service.updateEstado(id, dto);
  }

  // ─── VERSIONES ────────────────────────────────────────────────────────────

  @Get(':id/versiones')
  getVersiones(@Param('id', ParseIntPipe) id: number) {
    return this.service.getVersiones(id);
  }

  @Post(':id/versiones')
  crearNuevaVersion(
    @Param('id', ParseIntPipe) id: number,
    @Body('usuarioId', ParseIntPipe) usuarioId: number,
  ) {
    return this.service.crearNuevaVersion(id, usuarioId);
  }

  @Get(':id/versiones/:versionId')
  getVersion(
    @Param('id', ParseIntPipe) id: number,
    @Param('versionId', ParseIntPipe) versionId: number,
  ) {
    return this.service.getVersion(id, versionId);
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
  ) {
    return this.service.agregarItem(versionId, dto);
  }

  @Delete(':id/versiones/:versionId/items/:itemId')
  eliminarItem(
    @Param('versionId', ParseIntPipe) versionId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.service.eliminarItem(versionId, itemId);
  }

  // ─── DESCUENTOS POR ÍTEM ──────────────────────────────────────────────────

  @Post(':id/versiones/:versionId/items/:itemId/descuentos')
  aplicarDescuentoItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: ApplyDescuentoDto,
  ) {
    return this.service.aplicarDescuentoItem(itemId, dto);
  }

  @Delete(':id/versiones/:versionId/items/:itemId/descuentos/:did')
  eliminarDescuentoItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Param('did', ParseIntPipe) did: number,
  ) {
    return this.service.eliminarDescuentoItem(itemId, did);
  }

  // ─── DESCUENTOS GLOBALES ──────────────────────────────────────────────────

  @Post(':id/versiones/:versionId/descuentos')
  aplicarDescuentoGlobal(
    @Param('versionId', ParseIntPipe) versionId: number,
    @Body() dto: ApplyDescuentoDto,
  ) {
    return this.service.aplicarDescuentoGlobal(versionId, dto);
  }

  @Delete(':id/versiones/:versionId/descuentos/:did')
  eliminarDescuentoGlobal(
    @Param('versionId', ParseIntPipe) versionId: number,
    @Param('did', ParseIntPipe) did: number,
  ) {
    return this.service.eliminarDescuentoGlobal(versionId, did);
  }
}
