import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Descuento } from './descuento.entity';
import { CreateDescuentoDto } from './dto/create-descuento.dto';

@Injectable()
export class DescuentosService {
  constructor(
    @InjectRepository(Descuento)
    private readonly repo: Repository<Descuento>,
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
  create(dto: CreateDescuentoDto): Promise<Descuento> {
    return this.repo.save(this.repo.create(dto));
  }

  async toggleActivo(id: number): Promise<Descuento> {
    const descuento = await this.findOne(id);
    descuento.activo = !descuento.activo;
    return this.repo.save(descuento);
  }
}
