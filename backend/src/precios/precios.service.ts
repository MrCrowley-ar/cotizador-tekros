import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePrecioDto } from './dto/create-precio.dto';
import { Precio } from './precio.entity';

@Injectable()
export class PreciosService {
  constructor(
    @InjectRepository(Precio)
    private readonly repo: Repository<Precio>,
  ) {}

  // INSERT only — los precios nunca se actualizan
  registrar(dto: CreatePrecioDto): Promise<Precio> {
    return this.repo.save(this.repo.create(dto));
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
