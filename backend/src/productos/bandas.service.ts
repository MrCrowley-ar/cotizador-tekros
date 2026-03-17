import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoAccion, TipoEntidad } from '../historial/historial-accion.entity';
import { HistorialService } from '../historial/historial.service';
import { Banda } from './banda.entity';
import { CreateBandaDto } from './dto/create-banda.dto';
import { UpdateBandaDto } from './dto/update-banda.dto';

@Injectable()
export class BandasService {
  constructor(
    @InjectRepository(Banda)
    private readonly repo: Repository<Banda>,
    private readonly historialService: HistorialService,
  ) {}

  findByCultivo(cultivoId: number, soloActivas = false): Promise<Banda[]> {
    return this.repo.find({
      where: { cultivoId, ...(soloActivas ? { activo: true } : {}) },
      order: { orden: 'ASC', nombre: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Banda> {
    const banda = await this.repo.findOneBy({ id });
    if (!banda) throw new NotFoundException(`Banda ${id} no encontrada`);
    return banda;
  }

  async create(dto: CreateBandaDto, usuarioId?: number): Promise<Banda> {
    const banda = await this.repo.save(this.repo.create(dto));

    await this.historialService.registrar({
      usuarioId: usuarioId ?? null,
      tipoEntidad: TipoEntidad.BANDA,
      tipoAccion: TipoAccion.CREAR,
      entidadId: banda.id,
      descripcion: `Banda "${banda.nombre}" creada en cultivo ${banda.cultivoId}`,
    });

    return banda;
  }

  async update(id: number, dto: UpdateBandaDto, usuarioId?: number): Promise<Banda> {
    const banda = await this.findOne(id);
    const previo = { nombre: banda.nombre, orden: banda.orden, activo: banda.activo };
    Object.assign(banda, dto);
    const updated = await this.repo.save(banda);

    await this.historialService.registrar({
      usuarioId: usuarioId ?? null,
      tipoEntidad: TipoEntidad.BANDA,
      tipoAccion: TipoAccion.ACTUALIZAR,
      entidadId: id,
      descripcion: `Banda "${banda.nombre}" actualizada`,
      datosPrevios: previo,
      datosNuevos: dto,
    });

    return updated;
  }
}
