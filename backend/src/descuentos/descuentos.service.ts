import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoAccion, TipoEntidad } from '../historial/historial-accion.entity';
import { HistorialService } from '../historial/historial.service';
import { Descuento } from './descuento.entity';
import { CreateDescuentoDto } from './dto/create-descuento.dto';

@Injectable()
export class DescuentosService {
  constructor(
    @InjectRepository(Descuento)
    private readonly repo: Repository<Descuento>,
    private readonly historialService: HistorialService,
  ) {}

  findAll(soloActivos = false): Promise<Descuento[]> {
    return this.repo.find({
      where: soloActivos ? { activo: true } : {},
      order: { nombre: 'ASC', fecha: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Descuento> {
    const descuento = await this.repo.findOneBy({ id });
    if (!descuento) throw new NotFoundException(`Descuento ${id} no encontrado`);
    return descuento;
  }

  // INSERT only — el historial se mantiene por nombre + fecha
  async create(dto: CreateDescuentoDto, usuarioId?: number): Promise<Descuento> {
    const descuento = await this.repo.save(this.repo.create(dto));

    await this.historialService.registrar({
      usuarioId: usuarioId ?? null,
      tipoEntidad: TipoEntidad.DESCUENTO,
      tipoAccion: TipoAccion.CREAR,
      entidadId: descuento.id,
      descripcion: `Descuento "${descuento.nombre}" (${descuento.valorPorcentaje}%) creado con fecha ${descuento.fecha}`,
      datosNuevos: { nombre: descuento.nombre, valorPorcentaje: descuento.valorPorcentaje, fecha: descuento.fecha },
    });

    return descuento;
  }

  async toggleActivo(id: number, usuarioId?: number): Promise<Descuento> {
    const descuento = await this.findOne(id);
    const previoActivo = descuento.activo;
    descuento.activo = !descuento.activo;
    const updated = await this.repo.save(descuento);

    await this.historialService.registrar({
      usuarioId: usuarioId ?? null,
      tipoEntidad: TipoEntidad.DESCUENTO,
      tipoAccion: descuento.activo ? TipoAccion.ACTIVAR : TipoAccion.DESACTIVAR,
      entidadId: id,
      descripcion: `Descuento "${descuento.nombre}" ${descuento.activo ? 'activado' : 'desactivado'}`,
      datosPrevios: { activo: previoActivo },
      datosNuevos: { activo: descuento.activo },
    });

    return updated;
  }
}
