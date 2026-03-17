import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccionHistorial, TipoAccion, TipoEntidad } from './historial-accion.entity';

export interface RegistrarAccionParams {
  usuarioId?: number | null;
  cotizacionId?: number | null;
  tipoEntidad: TipoEntidad;
  tipoAccion: TipoAccion;
  entidadId?: number | null;
  descripcion: string;
  datosPrevios?: object | null;
  datosNuevos?: object | null;
}

@Injectable()
export class HistorialService {
  private readonly logger = new Logger(HistorialService.name);

  constructor(
    @InjectRepository(AccionHistorial)
    private readonly repo: Repository<AccionHistorial>,
  ) {}

  // Nunca lanza excepciones — el audit no debe cortar el flujo principal.
  async registrar(params: RegistrarAccionParams): Promise<void> {
    try {
      await this.repo.save(
        this.repo.create({
          usuarioId: params.usuarioId ?? null,
          cotizacionId: params.cotizacionId ?? null,
          tipoEntidad: params.tipoEntidad,
          tipoAccion: params.tipoAccion,
          entidadId: params.entidadId ?? null,
          descripcion: params.descripcion,
          datosPrevios: params.datosPrevios ?? null,
          datosNuevos: params.datosNuevos ?? null,
        }),
      );
    } catch (error) {
      this.logger.error(
        `[Historial] Error registrando acción ${params.tipoAccion} en ${params.tipoEntidad}: ${error}`,
      );
    }
  }

  // Historial de una cotización específica
  findByCotizacion(cotizacionId: number): Promise<AccionHistorial[]> {
    return this.repo.find({
      where: { cotizacionId },
      relations: ['usuario'],
      order: { fecha: 'DESC' },
    });
  }

  // Historial de acciones de un usuario
  findByUsuario(usuarioId: number): Promise<AccionHistorial[]> {
    return this.repo.find({
      where: { usuarioId },
      relations: ['usuario'],
      order: { fecha: 'DESC' },
    });
  }

  // Historial general paginado (últimas N acciones)
  findRecientes(limit = 50): Promise<AccionHistorial[]> {
    return this.repo.find({
      relations: ['usuario'],
      order: { fecha: 'DESC' },
      take: limit,
    });
  }

  // Historial filtrado por tipo de entidad (ej: todos los cambios de precios)
  findByEntidad(tipoEntidad: TipoEntidad): Promise<AccionHistorial[]> {
    return this.repo.find({
      where: { tipoEntidad },
      relations: ['usuario'],
      order: { fecha: 'DESC' },
    });
  }
}
