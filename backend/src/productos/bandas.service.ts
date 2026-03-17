import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banda } from './banda.entity';
import { CreateBandaDto } from './dto/create-banda.dto';
import { UpdateBandaDto } from './dto/update-banda.dto';

@Injectable()
export class BandasService {
  constructor(
    @InjectRepository(Banda)
    private readonly repo: Repository<Banda>,
  ) {}

  findByCultivo(cultivoId: number, soloActivas = false): Promise<Banda[]> {
    return this.repo.find({
      where: { cultivoId, ...(soloActivas ? { activo: true } : {}) },
      order: { orden: 'ASC', nombre: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Banda> {
    const banda = await this.repo.findOneBy({ id });
    if (!banda) throw new NotFoundException(`Banda ${id} no encontrada`);
    return banda;
  }

  create(dto: CreateBandaDto): Promise<Banda> {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateBandaDto): Promise<Banda> {
    const banda = await this.findOne(id);
    Object.assign(banda, dto);
    return this.repo.save(banda);
  }
}
