import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { DescuentoEvaluadorService } from './descuento-evaluador.service';
import { DescuentosVolumenService } from './descuentos-volumen.service';
import { DescuentosService } from './descuentos.service';
import { CreateDescuentoVolumenDto } from './dto/create-descuento-volumen.dto';
import { CreateDescuentoDto } from './dto/create-descuento.dto';
import { UpdateDescuentoDto } from './dto/update-descuento.dto';
import { EvaluarDescuentoDto } from './dto/evaluar-descuento.dto';

// ─── DESCUENTOS ───────────────────────────────────────────────────────────────

@Controller('descuentos')
export class DescuentosController {
  constructor(
    private readonly service: DescuentosService,
    private readonly evaluador: DescuentoEvaluadorService,
  ) {}

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

  @Get(':id/uso')
  @Roles(RolUsuario.ADMIN)
  async countUso(@Param('id', ParseIntPipe) id: number) {
    const count = await this.service.countUso(id);
    return { count };
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDescuentoDto,
    @CurrentUser() user: Usuario,
  ) {
    return this.service.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: Usuario) {
    return this.service.delete(id, user.id);
  }

  /**
   * Evaluates which discounts apply to a given context.
   * POST /descuentos/evaluar
   * Body: { cantidad, tipoAplicacion, cultivoId?, hibridoId?, bandaId? }
   */
  @Post('evaluar')
  evaluar(@Body() dto: EvaluarDescuentoDto) {
    return this.evaluador.evaluar(
      {
        cantidad:        dto.cantidad,
        cultivoId:       dto.cultivoId,
        hibridoId:       dto.hibridoId,
        bandaId:         dto.bandaId,
        precio:          dto.precio,
        subtotal:        dto.subtotal,
        ratioCultivo:    dto.ratioCultivo,
        volumen:         dto.volumen,
        monto:           dto.monto,
        precioPonderado: dto.precioPonderado,
      },
      dto.tipoAplicacion,
    );
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
