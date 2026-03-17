import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DescuentoVolumen } from './descuento-volumen.entity';
import { CreateDescuentoVolumenDto } from './dto/create-descuento-volumen.dto';

@Injectable()
export class DescuentosVolumenService {
  constructor(
    @InjectRepository(DescuentoVolumen)
    private readonly repo: Repository<DescuentoVolumen>,
  ) {}

  findByCultivo(cultivoId: number): Promise<DescuentoVolumen[]> {
    return this.repo.find({
      where: { cultivoId },
      order: { cantidadMin: 'ASC', fecha: 'DESC' },
    });
  }

  create(dto: CreateDescuentoVolumenDto): Promise<DescuentoVolumen> {
    return this.repo.save(this.repo.create(dto));
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
