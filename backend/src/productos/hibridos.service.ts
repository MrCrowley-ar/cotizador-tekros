import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoAccion, TipoEntidad } from '../historial/historial-accion.entity';
import { HistorialService } from '../historial/historial.service';
import { CreateHibridoDto } from './dto/create-hibrido.dto';
import { UpdateHibridoDto } from './dto/update-hibrido.dto';
import { Hibrido } from './hibrido.entity';

@Injectable()
export class HibridosService {
  constructor(
    @InjectRepository(Hibrido)
    private readonly repo: Repository<Hibrido>,
    private readonly historialService: HistorialService,
  ) {}

  findByCultivo(cultivoId: number, soloActivos = false): Promise<Hibrido[]> {
    return this.repo.find({
      where: { cultivoId, ...(soloActivos ? { activo: true } : {}) },
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Hibrido> {
    const hibrido = await this.repo.findOneBy({ id });
    if (!hibrido) throw new NotFoundException(`Híbrido ${id} no encontrado`);
    return hibrido;
  }

  async create(dto: CreateHibridoDto, usuarioId?: number): Promise<Hibrido> {
    const hibrido = await this.repo.save(this.repo.create(dto));

    await this.historialService.registrar({
      usuarioId: usuarioId ?? null,
      tipoEntidad: TipoEntidad.HIBRIDO,
      tipoAccion: TipoAccion.CREAR,
      entidadId: hibrido.id,
      descripcion: `Híbrido "${hibrido.nombre}" creado en cultivo ${hibrido.cultivoId}`,
    });

    return hibrido;
  }

  async update(id: number, dto: UpdateHibridoDto, usuarioId?: number): Promise<Hibrido> {
    const hibrido = await this.findOne(id);
    const previo = { nombre: hibrido.nombre, activo: hibrido.activo };
    Object.assign(hibrido, dto);
    const updated = await this.repo.save(hibrido);

    await this.historialService.registrar({
      usuarioId: usuarioId ?? null,
      tipoEntidad: TipoEntidad.HIBRIDO,
      tipoAccion: TipoAccion.ACTUALIZAR,
      entidadId: id,
      descripcion: `Híbrido "${hibrido.nombre}" actualizado`,
      datosPrevios: previo,
      datosNuevos: dto,
    });

    return updated;
  }
}
