import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoAccion, TipoEntidad } from '../historial/historial-accion.entity';
import { HistorialService } from '../historial/historial.service';
import { DescuentoCondicion } from './descuento-condicion.entity';
import { DescuentoRegla } from './descuento-regla.entity';
import { Descuento, ModoDescuento, TipoAplicacion } from './descuento.entity';
import { CreateDescuentoDto } from './dto/create-descuento.dto';
import { UpdateDescuentoDto } from './dto/update-descuento.dto';

@Injectable()
export class DescuentosService {
  constructor(
    @InjectRepository(Descuento)
    private readonly repo: Repository<Descuento>,
    @InjectRepository(DescuentoRegla)
    private readonly reglaRepo: Repository<DescuentoRegla>,
    @InjectRepository(DescuentoCondicion)
    private readonly condicionRepo: Repository<DescuentoCondicion>,
    private readonly historialService: HistorialService,
  ) {}

  findAll(soloActivos = false): Promise<Descuento[]> {
    return this.repo.find({
      where: soloActivos ? { activo: true } : {},
      order: { nombre: 'ASC', fechaVigencia: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Descuento> {
    const descuento = await this.repo.findOne({
      where: { id },
      relations: ['reglas', 'reglas.condiciones'],
    });
    if (!descuento) throw new NotFoundException(`Descuento ${id} no encontrado`);
    return descuento;
  }

  // Devuelve descuentos activos filtrados por tipo de aplicación, con reglas cargadas
  findActivosPorTipo(tipoAplicacion: TipoAplicacion): Promise<Descuento[]> {
    return this.repo.find({
      where: { activo: true, tipoAplicacion },
      relations: ['reglas', 'reglas.condiciones'],
      order: { fechaVigencia: 'DESC' },
    });
  }

  async create(dto: CreateDescuentoDto, usuarioId?: number): Promise<Descuento> {
    const modo = dto.modo ?? ModoDescuento.BASICO;

    if (modo === ModoDescuento.BASICO && dto.valorPorcentaje == null) {
      throw new BadRequestException('valorPorcentaje es requerido para modo básico');
    }
    if (modo === ModoDescuento.AVANZADO && (!dto.reglas || dto.reglas.length === 0)) {
      throw new BadRequestException('Se requiere al menos una regla para modo avanzado');
    }

    const descuento = await this.repo.save(
      this.repo.create({
        nombre: dto.nombre,
        tipoAplicacion: dto.tipoAplicacion ?? TipoAplicacion.GLOBAL,
        modo,
        valorPorcentaje: modo === ModoDescuento.BASICO ? dto.valorPorcentaje : null,
        fechaVigencia: dto.fechaVigencia as any,
      }),
    );

    if (modo === ModoDescuento.AVANZADO && dto.reglas) {
      for (const reglaDto of dto.reglas) {
        const regla = await this.reglaRepo.save(
          this.reglaRepo.create({
            descuentoId: descuento.id,
            valor: reglaDto.valor,
            prioridad: reglaDto.prioridad ?? 0,
          }),
        );

        if (reglaDto.condiciones?.length) {
          await this.condicionRepo.save(
            reglaDto.condiciones.map((c) =>
              this.condicionRepo.create({
                reglaId: regla.id,
                campo: c.campo,
                operador: c.operador,
                valor: c.valor,
                valor2: c.valor2 ?? null,
              }),
            ),
          );
        }
      }
    }

    await this.historialService.registrar({
      usuarioId: usuarioId ?? null,
      tipoEntidad: TipoEntidad.DESCUENTO,
      tipoAccion: TipoAccion.CREAR,
      entidadId: descuento.id,
      descripcion: `Descuento "${descuento.nombre}" (${modo}) creado — tipo: ${descuento.tipoAplicacion}`,
      datosNuevos: { nombre: descuento.nombre, modo, tipoAplicacion: descuento.tipoAplicacion },
    });

    return this.findOne(descuento.id);
  }

  async toggleActivo(id: number, usuarioId?: number): Promise<Descuento> {
    const descuento = await this.repo.findOneBy({ id });
    if (!descuento) throw new NotFoundException(`Descuento ${id} no encontrado`);

    const previoActivo = descuento.activo;
    descuento.activo = !descuento.activo;
    const updated = await this.repo.save(descuento);

    await this.historialService.registrar({
      usuarioId: usuarioId ?? null,
      tipoEntidad: TipoEntidad.DESCUENTO,
      tipoAccion: descuento.activo ? TipoAccion.ACTIVAR : TipoAccion.DESACTIVAR,
      entidadId: id,
      descripcion: `Descuento "${descuento.nombre}" ${descuento.activo ? 'activado' : 'desactivado'}`,
      datosPrevios: { activo: previoActivo },
      datosNuevos: { activo: descuento.activo },
    });

    return updated;
  }

  // Cuenta cuántas referencias a este descuento existen en cotizaciones
  async countUso(id: number): Promise<number> {
    const [{ count }] = await this.repo.query(
      `SELECT (
         (SELECT COUNT(*) FROM cotizacion_item_descuentos WHERE descuento_id = $1) +
         (SELECT COUNT(*) FROM cotizacion_descuentos WHERE descuento_id = $1)
       )::int AS count`,
      [id],
    );
    return count;
  }

  async update(id: number, dto: UpdateDescuentoDto, usuarioId?: number): Promise<Descuento> {
    const descuento = await this.findOne(id);
    const datosPrevios = {
      nombre: descuento.nombre,
      tipoAplicacion: descuento.tipoAplicacion,
      valorPorcentaje: descuento.valorPorcentaje,
      fechaVigencia: descuento.fechaVigencia,
    };

    if (dto.nombre !== undefined) descuento.nombre = dto.nombre;
    if (dto.tipoAplicacion !== undefined) descuento.tipoAplicacion = dto.tipoAplicacion;
    if (dto.fechaVigencia !== undefined) descuento.fechaVigencia = dto.fechaVigencia as any;
    if (dto.valorPorcentaje !== undefined) descuento.valorPorcentaje = dto.valorPorcentaje;

    await this.repo.save(descuento);

    // Modo avanzado: si se proveen reglas, reemplazarlas
    if (descuento.modo === ModoDescuento.AVANZADO && dto.reglas) {
      await this.reglaRepo.delete({ descuentoId: id });
      for (const reglaDto of dto.reglas) {
        const regla = await this.reglaRepo.save(
          this.reglaRepo.create({
            descuentoId: id,
            valor: reglaDto.valor,
            prioridad: reglaDto.prioridad ?? 0,
          }),
        );
        if (reglaDto.condiciones?.length) {
          await this.condicionRepo.save(
            reglaDto.condiciones.map((c) =>
              this.condicionRepo.create({
                reglaId: regla.id,
                campo: c.campo,
                operador: c.operador,
                valor: c.valor,
                valor2: c.valor2 ?? null,
              }),
            ),
          );
        }
      }
    }

    await this.historialService.registrar({
      usuarioId: usuarioId ?? null,
      tipoEntidad: TipoEntidad.DESCUENTO,
      tipoAccion: TipoAccion.ACTUALIZAR,
      entidadId: id,
      descripcion: `Descuento "${descuento.nombre}" actualizado`,
      datosPrevios,
      datosNuevos: dto,
    });

    return this.findOne(id);
  }

  async delete(id: number, usuarioId?: number): Promise<void> {
    const descuento = await this.repo.findOneBy({ id });
    if (!descuento) throw new NotFoundException(`Descuento ${id} no encontrado`);

    await this.repo.remove(descuento);

    await this.historialService.registrar({
      usuarioId: usuarioId ?? null,
      tipoEntidad: TipoEntidad.DESCUENTO,
      tipoAccion: TipoAccion.ELIMINAR,
      entidadId: id,
      descripcion: `Descuento "${descuento.nombre}" eliminado`,
      datosPrevios: { nombre: descuento.nombre, modo: descuento.modo },
    });
  }
}
