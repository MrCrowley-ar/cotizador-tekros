import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateHibridoDto } from './dto/create-hibrido.dto';
import { UpdateHibridoDto } from './dto/update-hibrido.dto';
import { Hibrido } from './hibrido.entity';

@Injectable()
export class HibridosService {
  constructor(
    @InjectRepository(Hibrido)
    private readonly repo: Repository<Hibrido>,
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

  create(dto: CreateHibridoDto): Promise<Hibrido> {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateHibridoDto): Promise<Hibrido> {
    const hibrido = await this.findOne(id);
    Object.assign(hibrido, dto);
    return this.repo.save(hibrido);
  }
}
