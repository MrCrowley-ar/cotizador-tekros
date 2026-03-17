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
import { BandasService } from './bandas.service';
import { CultivosService } from './cultivos.service';
import { CreateBandaDto } from './dto/create-banda.dto';
import { CreateCultivoDto } from './dto/create-cultivo.dto';
import { CreateHibridoDto } from './dto/create-hibrido.dto';
import { UpdateBandaDto } from './dto/update-banda.dto';
import { UpdateCultivoDto } from './dto/update-cultivo.dto';
import { UpdateHibridoDto } from './dto/update-hibrido.dto';
import { HibridosService } from './hibridos.service';

// ─── CULTIVOS ────────────────────────────────────────────────────────────────

@Controller('cultivos')
export class CultivosController {
  constructor(
    private readonly cultivosService: CultivosService,
    private readonly hibridosService: HibridosService,
    private readonly bandasService: BandasService,
  ) {}

  @Get()
  findAll(@Query('soloActivos', new ParseBoolPipe({ optional: true })) soloActivos?: boolean) {
    return this.cultivosService.findAll(soloActivos);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cultivosService.findOne(id);
  }

  @Get(':cultivoId/hibridos')
  findHibridos(
    @Param('cultivoId', ParseIntPipe) cultivoId: number,
    @Query('soloActivos', new ParseBoolPipe({ optional: true })) soloActivos?: boolean,
  ) {
    return this.hibridosService.findByCultivo(cultivoId, soloActivos);
  }

  @Get(':cultivoId/bandas')
  findBandas(
    @Param('cultivoId', ParseIntPipe) cultivoId: number,
    @Query('soloActivas', new ParseBoolPipe({ optional: true })) soloActivas?: boolean,
  ) {
    return this.bandasService.findByCultivo(cultivoId, soloActivas);
  }

  @Post()
  create(@Body() dto: CreateCultivoDto) {
    return this.cultivosService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCultivoDto) {
    return this.cultivosService.update(id, dto);
  }
}

// ─── HIBRIDOS ────────────────────────────────────────────────────────────────

@Controller('hibridos')
export class HibridosController {
  constructor(private readonly service: HibridosService) {}

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateHibridoDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateHibridoDto) {
    return this.service.update(id, dto);
  }
}

// ─── BANDAS ───────────────────────────────────────────────────────────────────

@Controller('bandas')
export class BandasController {
  constructor(private readonly service: BandasService) {}

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateBandaDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBandaDto) {
    return this.service.update(id, dto);
  }
}
