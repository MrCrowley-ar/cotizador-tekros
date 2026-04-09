import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { DescuentosService } from '../descuentos/descuentos.service';
import { DescuentosVolumenService } from '../descuentos/descuentos-volumen.service';
import { TipoAccion, TipoEntidad } from '../historial/historial-accion.entity';
import { HistorialService } from '../historial/historial.service';
import { PreciosService } from '../precios/precios.service';
import { AddItemDto } from './dto/add-item.dto';
import { ApplyDescuentoDto } from './dto/apply-descuento.dto';
import { CreateCotizacionDto } from './dto/create-cotizacion.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';
import { CotizacionDescuento } from './cotizacion-descuento.entity';
import { CotizacionItemDescuento } from './cotizacion-item-descuento.entity';
import { CotizacionItem } from './cotizacion-item.entity';
import { CotizacionVersion } from './cotizacion-version.entity';
import { CotizacionVersionSeccion } from './cotizacion-version-seccion.entity';
import { Cotizacion, EstadoCotizacion } from './cotizacion.entity';
import { CreateSeccionDto } from './dto/create-seccion.dto';
import { UpdateSeccionDescuentoDto } from './dto/update-seccion-descuento.dto';

@Injectable()
export class CotizacionesService {
  constructor(
    @InjectRepository(Cotizacion)
    private readonly cotizacionRepo: Repository<Cotizacion>,
    @InjectRepository(CotizacionVersion)
    private readonly versionRepo: Repository<CotizacionVersion>,
    @InjectRepository(CotizacionItem)
    private readonly itemRepo: Repository<CotizacionItem>,
    @InjectRepository(CotizacionItemDescuento)
    private readonly itemDescRepo: Repository<CotizacionItemDescuento>,
    @InjectRepository(CotizacionDescuento)
    private readonly descRepo: Repository<CotizacionDescuento>,
    @InjectRepository(CotizacionVersionSeccion)
    private readonly seccionRepo: Repository<CotizacionVersionSeccion>,
    private readonly preciosService: PreciosService,
    private readonly descuentosService: DescuentosService,
    private readonly descuentosVolumenService: DescuentosVolumenService,
    private readonly historialService: HistorialService,
    private readonly dataSource: DataSource,
  ) {}

  // ─── COTIZACIONES ──────────────────────────────────────────────────────────

  findAll(): Promise<Cotizacion[]> {
    return this.cotizacionRepo.find({
      relations: ['cliente', 'usuario'],
      order: { fechaCreacion: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Cotizacion> {
    const c = await this.cotizacionRepo.findOne({
      where: { id },
      relations: ['cliente', 'usuario'],
    });
    if (!c) throw new NotFoundException(`Cotización ${id} no encontrada`);
    return c;
  }

  // Genera número correlativo COT-YYYY-NNNN
  private async generarNumero(): Promise<string> {
    const anio = new Date().getFullYear();
    const count = await this.cotizacionRepo
      .createQueryBuilder('c')
      .where('EXTRACT(YEAR FROM c.fechaCreacion) = :anio', { anio })
      .getCount();
    return `COT-${anio}-${String(count + 1).padStart(4, '0')}`;
  }

  // Crea cotización + versión 1 en una transacción
  async crear(dto: CreateCotizacionDto, usuarioId?: number): Promise<Cotizacion> {
    const saved = await this.dataSource.transaction(async (em) => {
      const numero = await this.generarNumero();
      const cotizacion = em.create(Cotizacion, { clienteId: dto.clienteId, usuarioId, numero });
      const savedCot = await em.save(cotizacion);

      const version = em.create(CotizacionVersion, {
        cotizacionId: savedCot.id,
        version: 1,
        usuarioId: usuarioId ?? null,
        total: 0,
      });
      await em.save(version);

      return savedCot;
    });

    await this.historialService.registrar({
      usuarioId: usuarioId ?? null,
      cotizacionId: saved.id,
      tipoEntidad: TipoEntidad.COTIZACION,
      tipoAccion: TipoAccion.CREAR,
      entidadId: saved.id,
      descripcion: `Cotización ${saved.numero} creada`,
    });

    return saved;
  }

  async updateEstado(id: number, dto: UpdateEstadoDto, usuarioId?: number): Promise<Cotizacion> {
    const cotizacion = await this.findOne(id);
    const estadoPrevio = cotizacion.estado;
    cotizacion.estado = dto.estado;
    const updated = await this.cotizacionRepo.save(cotizacion);

    await this.historialService.registrar({
      usuarioId: usuarioId ?? null,
      cotizacionId: id,
      tipoEntidad: TipoEntidad.COTIZACION,
      tipoAccion: TipoAccion.CAMBIAR_ESTADO,
      entidadId: id,
      descripcion: `Estado de cotización ${cotizacion.numero} cambió de "${estadoPrevio}" a "${dto.estado}"`,
      datosPrevios: { estado: estadoPrevio },
      datosNuevos: { estado: dto.estado },
    });

    return updated;
  }

  // ─── VERSIONES ────────────────────────────────────────────────────────────

  async getVersiones(cotizacionId: number): Promise<CotizacionVersion[]> {
    await this.findOne(cotizacionId); // valida existencia
    return this.versionRepo.find({
      where: { cotizacionId },
      relations: ['usuario'],
      order: { version: 'DESC' },
    });
  }

  async getVersion(cotizacionId: number, versionId: number): Promise<CotizacionVersion> {
    const v = await this.versionRepo.findOne({
      where: { id: versionId, cotizacionId },
      relations: [
        'items',
        'items.hibrido',
        'items.banda',
        'items.cultivo',
        'items.descuentos',
        'items.descuentos.descuento',
        'descuentos',
        'descuentos.descuento',
        'secciones',
      ],
    });
    if (!v) throw new NotFoundException(`Versión ${versionId} no encontrada`);
    return v;
  }

  private async getUltimaVersion(cotizacionId: number): Promise<CotizacionVersion> {
    const v = await this.versionRepo
      .createQueryBuilder('v')
      .where('v.cotizacionId = :cotizacionId', { cotizacionId })
      .orderBy('v.version', 'DESC')
      .getOne();
    if (!v) throw new NotFoundException(`No hay versiones para cotización ${cotizacionId}`);
    return v;
  }

  async eliminarVersion(cotizacionId: number, versionId: number, usuarioId: number): Promise<void> {
    const versiones = await this.getVersiones(cotizacionId);
    if (versiones.length <= 1) {
      throw new BadRequestException('No se puede eliminar la única versión de la cotización');
    }
    const version = versiones.find((v) => v.id === versionId);
    if (!version) throw new NotFoundException(`Versión ${versionId} no encontrada`);

    // Delete children manually (no cascade on FK)
    const items = await this.itemRepo.find({ where: { versionId } });
    for (const item of items) {
      await this.itemDescRepo.delete({ cotizacionItemId: item.id });
    }
    await this.itemRepo.delete({ versionId });
    await this.descRepo.delete({ versionId });
    await this.versionRepo.remove(version);

    await this.historialService.registrar({
      usuarioId,
      tipoEntidad: TipoEntidad.COTIZACION,
      tipoAccion: TipoAccion.ELIMINAR,
      entidadId: cotizacionId,
      descripcion: `Versión ${version.version}${version.nombre ? ` (${version.nombre})` : ''} eliminada`,
    });
  }

  // Clona la última versión: copia items y sus descuentos, y los descuentos globales
  async crearNuevaVersion(cotizacionId: number, usuarioId: number, nombre?: string): Promise<CotizacionVersion> {
    const cotizacion = await this.findOne(cotizacionId);

    const nuevaVersion = await this.dataSource.transaction(async (em) => {
      const ultima = await this.getVersion(
        cotizacionId,
        (await this.getUltimaVersion(cotizacionId)).id,
      );

      const nueva = em.create(CotizacionVersion, {
        cotizacionId,
        version: ultima.version + 1,
        nombre: nombre ?? null,
        usuarioId,
        total: ultima.total,
        comisionMargen: ultima.comisionMargen,
        comisionDescuentoId: ultima.comisionDescuentoId,
      });
      const savedVersion = await em.save(nueva);

      // Clonar ítems y sus descuentos
      for (const item of ultima.items) {
        const nuevoItem = em.create(CotizacionItem, {
          versionId: savedVersion.id,
          cultivoId: item.cultivoId,
          hibridoId: item.hibridoId,
          bandaId: item.bandaId,
          bolsas: item.bolsas,
          precioBase: item.precioBase,
          subtotal: item.subtotal,
        });
        const savedItem = await em.save(nuevoItem);

        for (const d of item.descuentos) {
          await em.save(
            em.create(CotizacionItemDescuento, {
              cotizacionItemId: savedItem.id,
              descuentoId: d.descuentoId,
              valorPorcentaje: d.valorPorcentaje,
            }),
          );
        }
      }

      // Clonar descuentos globales
      for (const d of ultima.descuentos) {
        await em.save(
          em.create(CotizacionDescuento, {
            versionId: savedVersion.id,
            descuentoId: d.descuentoId,
            valorPorcentaje: d.valorPorcentaje,
          }),
        );
      }

      return savedVersion;
    });

    await this.historialService.registrar({
      usuarioId,
      cotizacionId,
      tipoEntidad: TipoEntidad.COTIZACION_VERSION,
      tipoAccion: TipoAccion.NUEVA_VERSION,
      entidadId: nuevaVersion.id,
      descripcion: `Nueva versión ${nuevaVersion.version} creada para cotización ${cotizacion.numero}`,
      datosNuevos: { version: nuevaVersion.version },
    });

    return nuevaVersion;
  }

  // ─── ITEMS ────────────────────────────────────────────────────────────────

  async agregarItem(versionId: number, dto: AddItemDto, usuarioId?: number): Promise<CotizacionItem> {
    const version = await this.versionRepo.findOneBy({ id: versionId });
    if (!version) throw new NotFoundException(`Versión ${versionId} no encontrada`);

    // Congela precio actual
    const precioActual = await this.preciosService.getPrecioActual(dto.hibridoId, dto.bandaId);
    const precioBase = Number(precioActual.precio);
    const subtotal = precioBase;

    const item = await this.itemRepo.save(
      this.itemRepo.create({
        versionId,
        cultivoId: dto.cultivoId,
        hibridoId: dto.hibridoId,
        bandaId: dto.bandaId,
        bolsas: dto.bolsas,
        precioBase,
        subtotal,
      }),
    );

    // Aplica descuento por volumen si existe para este cultivo y bolsas
    const descVolumen = await this.descuentosVolumenService.getDescuentoAplicable(
      dto.cultivoId,
      dto.bolsas,
    );
    if (descVolumen) {
      await this.itemDescRepo.save(
        this.itemDescRepo.create({
          cotizacionItemId: item.id,
          descuentoId: descVolumen.id,
          valorPorcentaje: Number(descVolumen.valorPorcentaje),
        }),
      );
    }

    await this.recalcularTotal(versionId);

    await this.historialService.registrar({
      usuarioId: usuarioId ?? null,
      cotizacionId: version.cotizacionId,
      tipoEntidad: TipoEntidad.COTIZACION_ITEM,
      tipoAccion: TipoAccion.AGREGAR_ITEM,
      entidadId: item.id,
      descripcion: `Ítem agregado: híbrido ${dto.hibridoId}, banda ${dto.bandaId}, bolsas ${dto.bolsas}, precio base $${precioBase}`,
      datosNuevos: { hibridoId: dto.hibridoId, bandaId: dto.bandaId, bolsas: dto.bolsas, precioBase, subtotal },
    });

    return item;
  }

  async eliminarItem(versionId: number, itemId: number, usuarioId?: number): Promise<void> {
    const item = await this.itemRepo.findOneBy({ id: itemId, versionId });
    if (!item) throw new NotFoundException(`Ítem ${itemId} no encontrado en versión ${versionId}`);

    const version = await this.versionRepo.findOneBy({ id: versionId });

    await this.itemRepo.remove(item);
    await this.recalcularTotal(versionId);

    await this.historialService.registrar({
      usuarioId: usuarioId ?? null,
      cotizacionId: version?.cotizacionId ?? null,
      tipoEntidad: TipoEntidad.COTIZACION_ITEM,
      tipoAccion: TipoAccion.ELIMINAR_ITEM,
      entidadId: itemId,
      descripcion: `Ítem ${itemId} eliminado de versión ${versionId}`,
      datosPrevios: { hibridoId: item.hibridoId, bandaId: item.bandaId, bolsas: item.bolsas, precioBase: item.precioBase },
    });
  }

  // ─── DESCUENTOS POR ÍTEM ──────────────────────────────────────────────────

  async aplicarDescuentoItem(
    itemId: number,
    dto: ApplyDescuentoDto,
    usuarioId?: number,
  ): Promise<CotizacionItemDescuento> {
    const item = await this.itemRepo.findOneBy({ id: itemId });
    if (!item) throw new NotFoundException(`Ítem ${itemId} no encontrado`);

    const descuento = await this.descuentosService.findOne(dto.descuentoId);

    const porcentaje = dto.porcentaje ?? (descuento.valorPorcentaje !== null ? Number(descuento.valorPorcentaje) : null);
    if (porcentaje === null) {
      throw new BadRequestException(
        'Descuento en modo avanzado: incluye "porcentaje" obtenido de POST /descuentos/evaluar',
      );
    }

    // Upsert: update existing entry if present, otherwise create new one
    let aplicado = await this.itemDescRepo.findOneBy({
      cotizacionItemId: itemId,
      descuentoId: descuento.id,
      seccionId: IsNull(),
    });
    if (aplicado) {
      aplicado.valorPorcentaje = porcentaje;
      aplicado = await this.itemDescRepo.save(aplicado);
    } else {
      aplicado = await this.itemDescRepo.save(
        this.itemDescRepo.create({
          cotizacionItemId: itemId,
          descuentoId: descuento.id,
          valorPorcentaje: porcentaje,
        }),
      );
    }

    const version = await this.versionRepo.findOneBy({ id: item.versionId });
    await this.recalcularTotal(item.versionId);

    await this.historialService.registrar({
      usuarioId: usuarioId ?? null,
      cotizacionId: version?.cotizacionId ?? null,
      tipoEntidad: TipoEntidad.COTIZACION_ITEM,
      tipoAccion: TipoAccion.AGREGAR_DESCUENTO,
      entidadId: aplicado.id,
      descripcion: `Descuento "${descuento.nombre}" (${porcentaje}%) aplicado al ítem ${itemId}`,
      datosNuevos: { descuentoId: descuento.id, nombre: descuento.nombre, porcentaje },
    });

    return aplicado;
  }

  async eliminarDescuentoItem(itemId: number, descuentoItemId: number, usuarioId?: number): Promise<void> {
    // Find ALL matching entries (handles duplicates)
    const entries = await this.itemDescRepo.find({ where: { descuentoId: descuentoItemId, cotizacionItemId: itemId } });
    if (entries.length === 0) throw new NotFoundException(`Descuento ${descuentoItemId} no encontrado en ítem ${itemId}`);

    const item = await this.itemRepo.findOneBy({ id: itemId });
    const versionId = item?.versionId;
    const version = versionId ? await this.versionRepo.findOneBy({ id: versionId }) : null;

    await this.itemDescRepo.remove(entries);
    if (versionId) await this.recalcularTotal(versionId);

    await this.historialService.registrar({
      usuarioId: usuarioId ?? null,
      cotizacionId: version?.cotizacionId ?? null,
      tipoEntidad: TipoEntidad.COTIZACION_ITEM,
      tipoAccion: TipoAccion.ELIMINAR_DESCUENTO,
      entidadId: descuentoItemId,
      descripcion: `Descuento ${descuentoItemId} eliminado del ítem ${itemId}`,
    });
  }

  // ─── DESCUENTOS GLOBALES ──────────────────────────────────────────────────

  async aplicarDescuentoGlobal(
    versionId: number,
    dto: ApplyDescuentoDto,
    usuarioId?: number,
  ): Promise<CotizacionDescuento> {
    const version = await this.versionRepo.findOneBy({ id: versionId });
    if (!version) throw new NotFoundException(`Versión ${versionId} no encontrada`);

    const descuento = await this.descuentosService.findOne(dto.descuentoId);

    const porcentaje = dto.porcentaje ?? (descuento.valorPorcentaje !== null ? Number(descuento.valorPorcentaje) : null);
    if (porcentaje === null) {
      throw new BadRequestException(
        'Descuento en modo avanzado: incluye "porcentaje" obtenido de POST /descuentos/evaluar',
      );
    }

    const aplicado = await this.descRepo.save(
      this.descRepo.create({
        versionId,
        descuentoId: descuento.id,
        valorPorcentaje: porcentaje,
      }),
    );

    await this.recalcularTotal(versionId);

    await this.historialService.registrar({
      usuarioId: usuarioId ?? null,
      cotizacionId: version.cotizacionId,
      tipoEntidad: TipoEntidad.COTIZACION_VERSION,
      tipoAccion: TipoAccion.AGREGAR_DESCUENTO,
      entidadId: aplicado.id,
      descripcion: `Descuento global "${descuento.nombre}" (${porcentaje}%) aplicado a versión ${versionId}`,
      datosNuevos: { descuentoId: descuento.id, nombre: descuento.nombre, porcentaje },
    });

    return aplicado;
  }

  async eliminarDescuentoGlobal(versionId: number, descuentoVersionId: number, usuarioId?: number): Promise<void> {
    const d = await this.descRepo.findOneBy({ id: descuentoVersionId, versionId });
    if (!d) throw new NotFoundException(`Descuento ${descuentoVersionId} no encontrado en versión ${versionId}`);

    const version = await this.versionRepo.findOneBy({ id: versionId });
    await this.descRepo.remove(d);
    await this.recalcularTotal(versionId);

    await this.historialService.registrar({
      usuarioId: usuarioId ?? null,
      cotizacionId: version?.cotizacionId ?? null,
      tipoEntidad: TipoEntidad.COTIZACION_VERSION,
      tipoAccion: TipoAccion.ELIMINAR_DESCUENTO,
      entidadId: descuentoVersionId,
      descripcion: `Descuento global ${descuentoVersionId} eliminado de versión ${versionId}`,
    });
  }

  // ─── SECCIONES ─────────────────────────────────────────────────────────────

  async getSecciones(versionId: number): Promise<CotizacionVersionSeccion[]> {
    return this.seccionRepo.find({
      where: { versionId },
      order: { orden: 'ASC' },
    });
  }

  async crearSeccion(
    versionId: number,
    dto: CreateSeccionDto,
    usuarioId?: number,
  ): Promise<CotizacionVersionSeccion> {
    const version = await this.versionRepo.findOneBy({ id: versionId });
    if (!version) throw new NotFoundException(`Versión ${versionId} no encontrada`);

    const seccionesExistentes = await this.seccionRepo.find({ where: { versionId } });

    return this.dataSource.transaction(async (em) => {
      // Si es la primera sección, crear "Sección 1" para los descuentos existentes
      let seccionOriginal: CotizacionVersionSeccion | null = null;
      if (seccionesExistentes.length === 0) {
        seccionOriginal = await em.save(
          em.create(CotizacionVersionSeccion, {
            versionId,
            nombre: 'Sección 1',
            orden: 0,
          }),
        );
      }

      // Crear la nueva sección
      const nuevaSeccion = await em.save(
        em.create(CotizacionVersionSeccion, {
          versionId,
          nombre: dto.nombre ?? `Sección ${seccionesExistentes.length + (seccionOriginal ? 2 : 1)}`,
          orden: seccionesExistentes.length + (seccionOriginal ? 1 : 0),
        }),
      );

      // Para los descuentos marcados como variables:
      // - Si es primera vez (seccionOriginal existe), migrar los descuentos existentes a la sección original
      //   y crear copias para la nueva sección
      // - Si ya hay secciones, copiar los descuentos de la primera sección a la nueva
      const variableIds = new Set(dto.descuentosVariables);

      if (seccionOriginal) {
        // Migrar descuentos de ítem existentes (seccion_id = null) que son variables
        const itemDescs = await em.find(CotizacionItemDescuento, {
          where: { item: { versionId } },
          relations: ['item'],
        });
        for (const d of itemDescs) {
          if (variableIds.has(d.descuentoId!)) {
            // Asignar a sección original
            await em.update(CotizacionItemDescuento, d.id, { seccionId: seccionOriginal.id });
            // Crear copia para nueva sección
            await em.save(
              em.create(CotizacionItemDescuento, {
                cotizacionItemId: d.cotizacionItemId,
                descuentoId: d.descuentoId,
                valorPorcentaje: d.valorPorcentaje,
                seccionId: nuevaSeccion.id,
              }),
            );
          }
          // Los no-variables quedan con seccion_id = null (aplican a todas)
        }

        // Migrar descuentos globales
        const globalDescs = await em.find(CotizacionDescuento, { where: { versionId } });
        for (const d of globalDescs) {
          if (variableIds.has(d.descuentoId!)) {
            await em.update(CotizacionDescuento, d.id, { seccionId: seccionOriginal.id });
            await em.save(
              em.create(CotizacionDescuento, {
                versionId,
                descuentoId: d.descuentoId,
                valorPorcentaje: d.valorPorcentaje,
                seccionId: nuevaSeccion.id,
              }),
            );
          }
        }
      } else {
        // Ya hay secciones: copiar los descuentos variables de la primera sección
        const primeraSeccion = seccionesExistentes[0];

        const itemDescs = await em.find(CotizacionItemDescuento, {
          where: { seccionId: primeraSeccion.id },
          relations: ['item'],
        });
        for (const d of itemDescs) {
          await em.save(
            em.create(CotizacionItemDescuento, {
              cotizacionItemId: d.cotizacionItemId,
              descuentoId: d.descuentoId,
              valorPorcentaje: d.valorPorcentaje,
              seccionId: nuevaSeccion.id,
            }),
          );
        }

        const globalDescs = await em.find(CotizacionDescuento, {
          where: { versionId, seccionId: primeraSeccion.id },
        });
        for (const d of globalDescs) {
          await em.save(
            em.create(CotizacionDescuento, {
              versionId,
              descuentoId: d.descuentoId,
              valorPorcentaje: d.valorPorcentaje,
              seccionId: nuevaSeccion.id,
            }),
          );
        }
      }

      await this.historialService.registrar({
        usuarioId: usuarioId ?? null,
        cotizacionId: version.cotizacionId,
        tipoEntidad: TipoEntidad.COTIZACION_VERSION,
        tipoAccion: TipoAccion.CREAR,
        entidadId: nuevaSeccion.id,
        descripcion: `Sección "${nuevaSeccion.nombre}" creada en versión ${version.version}`,
        datosNuevos: { seccionId: nuevaSeccion.id, nombre: nuevaSeccion.nombre, descuentosVariables: dto.descuentosVariables },
      });

      return nuevaSeccion;
    });
  }

  async eliminarSeccion(versionId: number, seccionId: number, usuarioId?: number): Promise<void> {
    const seccion = await this.seccionRepo.findOneBy({ id: seccionId, versionId });
    if (!seccion) throw new NotFoundException(`Sección ${seccionId} no encontrada`);

    const secciones = await this.seccionRepo.find({ where: { versionId } });

    await this.dataSource.transaction(async (em) => {
      // Eliminar descuentos asociados a esta sección
      await em.delete(CotizacionItemDescuento, { seccionId });
      await em.delete(CotizacionDescuento, { seccionId });
      await em.remove(seccion);

      // Si queda solo 1 sección, revertir al modo sin secciones
      if (secciones.length === 2) {
        const restante = secciones.find((s) => s.id !== seccionId)!;
        // Mover descuentos de la sección restante a seccion_id = null
        await em
          .createQueryBuilder()
          .update(CotizacionItemDescuento)
          .set({ seccionId: null })
          .where('seccionId = :id', { id: restante.id })
          .execute();
        await em
          .createQueryBuilder()
          .update(CotizacionDescuento)
          .set({ seccionId: null })
          .where('seccionId = :id', { id: restante.id })
          .execute();
        await em.remove(restante);
      }
    });

    const version = await this.versionRepo.findOneBy({ id: versionId });
    await this.historialService.registrar({
      usuarioId: usuarioId ?? null,
      cotizacionId: version?.cotizacionId ?? null,
      tipoEntidad: TipoEntidad.COTIZACION_VERSION,
      tipoAccion: TipoAccion.ELIMINAR,
      entidadId: seccionId,
      descripcion: `Sección "${seccion.nombre}" eliminada de versión ${versionId}`,
    });
  }

  /**
   * Actualiza TODOS los descuentos de un descuento específico en una sección.
   * Busca tanto a nivel de ítem como global y actualiza todos los que encuentre.
   */
  async updateSeccionDescuento(
    seccionId: number,
    descuentoId: number,
    dto: UpdateSeccionDescuentoDto,
  ): Promise<void> {
    let updated = false;

    // Update all item-level discounts for this descuento+section
    const itemDescs = await this.itemDescRepo.find({ where: { seccionId, descuentoId } });
    for (const d of itemDescs) {
      d.valorPorcentaje = dto.porcentaje;
      await this.itemDescRepo.save(d);
      updated = true;
    }

    // Update all global-level discounts for this descuento+section
    const globalDescs = await this.descRepo.find({ where: { seccionId, descuentoId } });
    for (const d of globalDescs) {
      d.valorPorcentaje = dto.porcentaje;
      await this.descRepo.save(d);
      updated = true;
    }

    if (!updated) {
      throw new NotFoundException(`Descuento ${descuentoId} no encontrado en sección ${seccionId}`);
    }

    // Recalcular
    const seccion = await this.seccionRepo.findOneBy({ id: seccionId });
    if (seccion) await this.recalcularTotal(seccion.versionId);
  }

  // ─── CÁLCULO DE TOTAL (siempre en backend) ────────────────────────────────

  private calcularTotalParaDescuentos(
    items: CotizacionItem[],
    itemDescuentos: CotizacionItemDescuento[],
    globalDescuentos: CotizacionDescuento[],
  ) {
    let subtotalItems = 0;
    let descuentosItems = 0;
    const desglose: object[] = [];

    // Index item discounts by item id
    const descByItem = new Map<number, CotizacionItemDescuento[]>();
    for (const d of itemDescuentos) {
      const arr = descByItem.get(d.cotizacionItemId) ?? [];
      arr.push(d);
      descByItem.set(d.cotizacionItemId, arr);
    }

    for (const item of items) {
      const subtotalItem = Number(item.precioBase);
      let descuentoItemTotal = 0;

      for (const d of descByItem.get(item.id) ?? []) {
        descuentoItemTotal += subtotalItem * (Number(d.valorPorcentaje) / 100);
      }

      const netoItem = subtotalItem - descuentoItemTotal;
      subtotalItems += subtotalItem;
      descuentosItems += descuentoItemTotal;

      desglose.push({
        itemId: item.id,
        hibridoId: item.hibridoId,
        bandaId: item.bandaId,
        bolsas: item.bolsas,
        precioBase: item.precioBase,
        subtotal: subtotalItem,
        descuentos: descuentoItemTotal,
        neto: netoItem,
      });
    }

    const subtotalNeto = subtotalItems - descuentosItems;

    let descuentosGlobales = 0;
    for (const d of globalDescuentos) {
      const pct = Number(d.valorPorcentaje);
      if (pct === 0) continue; // skip comision placeholders (effective % computed on frontend)
      descuentosGlobales += subtotalNeto * (pct / 100);
    }

    const comision = 0;
    const total = subtotalNeto - descuentosGlobales;
    return { subtotalItems, descuentosItems, subtotalNeto, descuentosGlobales, comision, total, desglose };
  }

  async calcularTotal(versionId: number): Promise<{
    subtotalItems: number;
    descuentosItems: number;
    subtotalNeto: number;
    descuentosGlobales: number;
    comision: number;
    total: number;
    desglose: object[];
    secciones?: Array<{
      seccionId: number;
      nombre: string | null;
      subtotalItems: number;
      descuentosItems: number;
      subtotalNeto: number;
      descuentosGlobales: number;
      comision: number;
      total: number;
      desglose: object[];
    }>;
  }> {
    const version = await this.getVersion(
      (await this.versionRepo.findOneBy({ id: versionId }))!.cotizacionId,
      versionId,
    );

    const secciones = version.secciones ?? [];
    const hasSecciones = secciones.length > 0;

    if (!hasSecciones) {
      // Backward compatible: sin secciones, calcular como antes
      return this.calcularTotalParaDescuentos(
        version.items,
        version.items.flatMap((i) => i.descuentos),
        version.descuentos,
      );
    }

    // Con secciones: calcular por sección
    // Descuentos compartidos (seccion_id = null) + descuentos específicos de cada sección
    const sharedItemDescs = version.items.flatMap((i) =>
      i.descuentos.filter((d) => d.seccionId === null),
    );
    const sharedGlobalDescs = version.descuentos.filter((d) => d.seccionId === null);

    const seccionResults = secciones
      .sort((a, b) => a.orden - b.orden)
      .map((sec) => {
        const secItemDescs = version.items.flatMap((i) =>
          i.descuentos.filter((d) => d.seccionId === sec.id),
        );
        const secGlobalDescs = version.descuentos.filter((d) => d.seccionId === sec.id);

        const result = this.calcularTotalParaDescuentos(
          version.items,
          [...sharedItemDescs, ...secItemDescs],
          [...sharedGlobalDescs, ...secGlobalDescs],
        );

        return {
          seccionId: sec.id,
          nombre: sec.nombre,
          ...result,
        };
      });

    // El total general es la suma o el de la primera sección (usamos primera como principal)
    const principal = seccionResults[0] ?? this.calcularTotalParaDescuentos(version.items, [], []);

    return {
      ...principal,
      secciones: seccionResults,
    };
  }

  private async recalcularTotal(versionId: number): Promise<void> {
    const result = await this.calcularTotal(versionId);
    await this.versionRepo.update(versionId, { total: result.total });
  }
}
