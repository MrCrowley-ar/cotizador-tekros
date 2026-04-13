import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Vigencia } from './vigencia.entity';
import { SetGlobalVigenciaDto } from './dto/set-global-vigencia.dto';
import { SetCultivoVigenciasDto } from './dto/set-cultivo-vigencias.dto';

export type VigenciaSnapshotDto =
  | { modo: 'global'; fecha: string }
  | { modo: 'cultivo'; fechas: Record<number, string> };

@Injectable()
export class VigenciasService {
  constructor(
    @InjectRepository(Vigencia)
    private readonly repo: Repository<Vigencia>,
  ) {}

  findAll(): Promise<Vigencia[]> {
    return this.repo.find({
      relations: ['cultivo'],
      order: { cultivoId: 'ASC' },
    });
  }

  async getGlobal(): Promise<Vigencia | null> {
    return this.repo.findOne({ where: { cultivoId: IsNull() } });
  }

  async getPorCultivo(): Promise<Vigencia[]> {
    return this.repo.find({
      where: { cultivoId: Not(IsNull()) },
      relations: ['cultivo'],
      order: { cultivoId: 'ASC' },
    });
  }

  // Setea vigencia global (remueve las por-cultivo existentes para mantener
  // el modo exclusivo).
  async setGlobal(dto: SetGlobalVigenciaDto): Promise<Vigencia> {
    await this.repo.delete({ cultivoId: Not(IsNull()) });
    const existing = await this.getGlobal();
    if (existing) {
      existing.fechaVigencia = dto.fechaVigencia;
      return this.repo.save(existing);
    }
    return this.repo.save(
      this.repo.create({ cultivoId: null, fechaVigencia: dto.fechaVigencia }),
    );
  }

  // Setea vigencias por cultivo (remueve la global existente para mantener
  // el modo exclusivo). Reemplaza el set completo de vigencias por cultivo.
  async setPorCultivo(dto: SetCultivoVigenciasDto): Promise<Vigencia[]> {
    await this.repo.delete({ cultivoId: IsNull() });
    await this.repo.delete({ cultivoId: Not(IsNull()) });
    if (dto.items.length === 0) return [];
    const rows = dto.items.map((i) =>
      this.repo.create({
        cultivoId: i.cultivoId,
        fechaVigencia: i.fechaVigencia,
      }),
    );
    return this.repo.save(rows);
  }

  // Devuelve un snapshot del catálogo actual apto para copiar a una cotización.
  async getSnapshot(): Promise<VigenciaSnapshotDto | null> {
    const global = await this.getGlobal();
    if (global) {
      return { modo: 'global', fecha: global.fechaVigencia };
    }
    const porCultivo = await this.getPorCultivo();
    if (porCultivo.length === 0) return null;
    const fechas: Record<number, string> = {};
    for (const v of porCultivo) {
      if (v.cultivoId != null) fechas[v.cultivoId] = v.fechaVigencia;
    }
    return { modo: 'cultivo', fechas };
  }
}
