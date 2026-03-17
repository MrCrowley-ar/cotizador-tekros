import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoAccion, TipoEntidad } from '../historial/historial-accion.entity';
import { HistorialService } from '../historial/historial.service';
import { CreatePrecioDto } from './dto/create-precio.dto';
import { Precio } from './precio.entity';

@Injectable()
export class PreciosService {
  constructor(
    @InjectRepository(Precio)
    private readonly repo: Repository<Precio>,
    private readonly historialService: HistorialService,
  ) {}

  // INSERT only — los precios nunca se actualizan
  async registrar(dto: CreatePrecioDto): Promise<Precio> {
    const { usuarioId, ...precioData } = dto;
    const precio = await this.repo.save(this.repo.create(precioData));

    await this.historialService.registrar({
      usuarioId: usuarioId ?? null,
      tipoEntidad: TipoEntidad.PRECIO,
      tipoAccion: TipoAccion.REGISTRAR_PRECIO,
      entidadId: precio.id,
      descripcion: `Precio $${precio.precio} registrado para híbrido ${precio.hibridoId} / banda ${precio.bandaId} en fecha ${precio.fecha}`,
      datosNuevos: { hibridoId: precio.hibridoId, bandaId: precio.bandaId, precio: precio.precio, fecha: precio.fecha },
    });

    return precio;
  }

  // Precio vigente = registro más reciente para (hibrido, banda)
  async getPrecioActual(hibridoId: number, bandaId: number): Promise<Precio> {
    const precio = await this.repo
      .createQueryBuilder('p')
      .where('p.hibridoId = :hibridoId AND p.bandaId = :bandaId', { hibridoId, bandaId })
      .orderBy('p.fecha', 'DESC')
      .getOne();

    if (!precio) {
      throw new NotFoundException(
        `No hay precio registrado para híbrido ${hibridoId} / banda ${bandaId}`,
      );
    }
    return precio;
  }

  // Historial completo ordenado por fecha descendente
  getHistorico(hibridoId: number, bandaId: number): Promise<Precio[]> {
    return this.repo.find({
      where: { hibridoId, bandaId },
      order: { fecha: 'DESC' },
    });
  }
}
