import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoAccion, TipoEntidad } from '../historial/historial-accion.entity';
import { HistorialService } from '../historial/historial.service';
import { DescuentoVolumen } from './descuento-volumen.entity';
import { CreateDescuentoVolumenDto } from './dto/create-descuento-volumen.dto';

@Injectable()
export class DescuentosVolumenService {
  constructor(
    @InjectRepository(DescuentoVolumen)
    private readonly repo: Repository<DescuentoVolumen>,
    private readonly historialService: HistorialService,
  ) {}

  findByCultivo(cultivoId: number): Promise<DescuentoVolumen[]> {
    return this.repo.find({
      where: { cultivoId },
      order: { cantidadMin: 'ASC', fecha: 'DESC' },
    });
  }

  async create(dto: CreateDescuentoVolumenDto): Promise<DescuentoVolumen> {
    const { usuarioId, ...dvData } = dto;
    const dv = await this.repo.save(this.repo.create(dvData));

    await this.historialService.registrar({
      usuarioId: usuarioId ?? null,
      tipoEntidad: TipoEntidad.DESCUENTO_VOLUMEN,
      tipoAccion: TipoAccion.CREAR,
      entidadId: dv.id,
      descripcion: `Descuento volumen ${dv.valorPorcentaje}% creado para cultivo ${dv.cultivoId} (${dv.cantidadMin}–${dv.cantidadMax ?? '∞'})`,
      datosNuevos: { cultivoId: dv.cultivoId, cantidadMin: dv.cantidadMin, cantidadMax: dv.cantidadMax, valorPorcentaje: dv.valorPorcentaje },
    });

    return dv;
  }

  // Obtiene el descuento por volumen vigente para un cultivo y una cantidad dada.
  // Vigente = registro con MAX(fecha) cuya banda (cantidadMin, cantidadMax) cubre la cantidad.
  async getDescuentoAplicable(
    cultivoId: number,
    cantidad: number,
  ): Promise<DescuentoVolumen | null> {
    return this.repo
      .createQueryBuilder('dv')
      .where('dv.cultivoId = :cultivoId', { cultivoId })
      .andWhere('dv.cantidadMin <= :cantidad', { cantidad })
      .andWhere('(dv.cantidadMax IS NULL OR dv.cantidadMax >= :cantidad)', { cantidad })
      .orderBy('dv.fecha', 'DESC')
      .getOne();
  }
}
