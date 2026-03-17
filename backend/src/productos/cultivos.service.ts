import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cultivo } from './cultivo.entity';
import { CreateCultivoDto } from './dto/create-cultivo.dto';
import { UpdateCultivoDto } from './dto/update-cultivo.dto';

@Injectable()
export class CultivosService {
  constructor(
    @InjectRepository(Cultivo)
    private readonly repo: Repository<Cultivo>,
  ) {}

  findAll(soloActivos = false): Promise<Cultivo[]> {
    return this.repo.find({
      where: soloActivos ? { activo: true } : {},
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Cultivo> {
    const cultivo = await this.repo.findOneBy({ id });
    if (!cultivo) throw new NotFoundException(`Cultivo ${id} no encontrado`);
    return cultivo;
  }

  create(dto: CreateCultivoDto): Promise<Cultivo> {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateCultivoDto): Promise<Cultivo> {
    const cultivo = await this.findOne(id);
    Object.assign(cultivo, dto);
    return this.repo.save(cultivo);
  }
}
