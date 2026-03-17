import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoAccion, TipoEntidad } from '../historial/historial-accion.entity';
import { HistorialService } from '../historial/historial.service';
import { Cultivo } from './cultivo.entity';
import { CreateCultivoDto } from './dto/create-cultivo.dto';
import { UpdateCultivoDto } from './dto/update-cultivo.dto';

@Injectable()
export class CultivosService {
  constructor(
    @InjectRepository(Cultivo)
    private readonly repo: Repository<Cultivo>,
    private readonly historialService: HistorialService,
  ) {}

  findAll(soloActivos = false): Promise<Cultivo[]> {
    return this.repo.find({
      where: soloActivos ? { activo: true } : {},
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Cultivo> {
    const cultivo = await this.repo.findOneBy({ id });
    if (!cultivo) throw new NotFoundException(`Cultivo ${id} no encontrado`);
    return cultivo;
  }

  async create(dto: CreateCultivoDto, usuarioId?: number): Promise<Cultivo> {
    const cultivo = await this.repo.save(this.repo.create(dto));

    await this.historialService.registrar({
      usuarioId: usuarioId ?? null,
      tipoEntidad: TipoEntidad.CULTIVO,
      tipoAccion: TipoAccion.CREAR,
      entidadId: cultivo.id,
      descripcion: `Cultivo "${cultivo.nombre}" creado`,
    });

    return cultivo;
  }

  async update(id: number, dto: UpdateCultivoDto, usuarioId?: number): Promise<Cultivo> {
    const cultivo = await this.findOne(id);
    const previo = { nombre: cultivo.nombre, activo: cultivo.activo };
    Object.assign(cultivo, dto);
    const updated = await this.repo.save(cultivo);

    await this.historialService.registrar({
      usuarioId: usuarioId ?? null,
      tipoEntidad: TipoEntidad.CULTIVO,
      tipoAccion: TipoAccion.ACTUALIZAR,
      entidadId: id,
      descripcion: `Cultivo "${cultivo.nombre}" actualizado`,
      datosPrevios: previo,
      datosNuevos: dto,
    });

    return updated;
  }
}
