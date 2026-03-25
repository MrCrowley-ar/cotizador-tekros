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
  async registrar(dto: CreatePrecioDto, usuarioId?: number): Promise<Precio> {
    const precio = await this.repo.save(this.repo.create(dto));

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

  // Precio actual por cada combinación (híbrido, banda) de un cultivo — para vista matriz
  async getMatrizPorCultivo(cultivoId: number): Promise<Precio[]> {
    return this.repo.query(
      `SELECT p.id,
              p.hibrido_id AS "hibridoId",
              p.banda_id   AS "bandaId",
              p.precio,
              p.fecha
       FROM precios p
       INNER JOIN (
         SELECT hibrido_id, banda_id, MAX(id) AS latest_id
         FROM precios
         GROUP BY hibrido_id, banda_id
       ) latest ON latest.latest_id = p.id
       INNER JOIN hibridos h ON h.id = p.hibrido_id AND h.cultivo_id = $1
       INNER JOIN bandas   b ON b.id = p.banda_id   AND b.cultivo_id = $1`,
      [cultivoId],
    );
  }

  // Historial completo ordenado por fecha descendente
  getHistorico(hibridoId: number, bandaId: number): Promise<Precio[]> {
    return this.repo.find({
      where: { hibridoId, bandaId },
      order: { fecha: 'DESC' },
    });
  }
}
