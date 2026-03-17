import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
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
import { Cotizacion, EstadoCotizacion } from './cotizacion.entity';

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
  async crear(dto: CreateCotizacionDto): Promise<Cotizacion> {
    const saved = await this.dataSource.transaction(async (em) => {
      const numero = await this.generarNumero();
      const cotizacion = em.create(Cotizacion, { ...dto, numero });
      const savedCot = await em.save(cotizacion);

      const version = em.create(CotizacionVersion, {
        cotizacionId: savedCot.id,
        version: 1,
        usuarioId: dto.usuarioId,
        total: 0,
      });
      await em.save(version);

      return savedCot;
    });

    await this.historialService.registrar({
      usuarioId: dto.usuarioId,
      cotizacionId: saved.id,
      tipoEntidad: TipoEntidad.COTIZACION,
      tipoAccion: TipoAccion.CREAR,
      entidadId: saved.id,
      descripcion: `Cotización ${saved.numero} creada`,
    });

    return saved;
  }

  async updateEstado(id: number, dto: UpdateEstadoDto): Promise<Cotizacion> {
    const cotizacion = await this.findOne(id);
    const estadoPrevio = cotizacion.estado;
    cotizacion.estado = dto.estado;
    const updated = await this.cotizacionRepo.save(cotizacion);

    await this.historialService.registrar({
      usuarioId: dto.usuarioId,
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

  // Clona la última versión: copia items y sus descuentos, y los descuentos globales
  async crearNuevaVersion(cotizacionId: number, usuarioId: number): Promise<CotizacionVersion> {
    const cotizacion = await this.findOne(cotizacionId);
    if (cotizacion.estado !== EstadoCotizacion.BORRADOR) {
      throw new BadRequestException('Solo se pueden crear nuevas versiones de cotizaciones en borrador');
    }

    const nuevaVersion = await this.dataSource.transaction(async (em) => {
      const ultima = await this.getVersion(
        cotizacionId,
        (await this.getUltimaVersion(cotizacionId)).id,
      );

      const nueva = em.create(CotizacionVersion, {
        cotizacionId,
        version: ultima.version + 1,
        usuarioId,
        total: ultima.total,
      });
      const savedVersion = await em.save(nueva);

      // Clonar ítems y sus descuentos
      for (const item of ultima.items) {
        const nuevoItem = em.create(CotizacionItem, {
          versionId: savedVersion.id,
          cultivoId: item.cultivoId,
          hibridoId: item.hibridoId,
          bandaId: item.bandaId,
          cantidad: item.cantidad,
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

  async agregarItem(versionId: number, dto: AddItemDto): Promise<CotizacionItem> {
    const version = await this.versionRepo.findOneBy({ id: versionId });
    if (!version) throw new NotFoundException(`Versión ${versionId} no encontrada`);

    // Congela precio actual
    const precioActual = await this.preciosService.getPrecioActual(dto.hibridoId, dto.bandaId);
    const precioBase = Number(precioActual.precio);
    const subtotal = precioBase * dto.cantidad;

    const item = await this.itemRepo.save(
      this.itemRepo.create({
        versionId,
        cultivoId: dto.cultivoId,
        hibridoId: dto.hibridoId,
        bandaId: dto.bandaId,
        cantidad: dto.cantidad,
        precioBase,
        subtotal,
      }),
    );

    // Aplica descuento por volumen si existe para este cultivo y cantidad
    const descVolumen = await this.descuentosVolumenService.getDescuentoAplicable(
      dto.cultivoId,
      dto.cantidad,
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
      usuarioId: dto.usuarioId,
      cotizacionId: version.cotizacionId,
      tipoEntidad: TipoEntidad.COTIZACION_ITEM,
      tipoAccion: TipoAccion.AGREGAR_ITEM,
      entidadId: item.id,
      descripcion: `Ítem agregado: híbrido ${dto.hibridoId}, banda ${dto.bandaId}, cantidad ${dto.cantidad}, precio base $${precioBase}`,
      datosNuevos: { hibridoId: dto.hibridoId, bandaId: dto.bandaId, cantidad: dto.cantidad, precioBase, subtotal },
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
      datosPrevios: { hibridoId: item.hibridoId, bandaId: item.bandaId, cantidad: item.cantidad, precioBase: item.precioBase },
    });
  }

  // ─── DESCUENTOS POR ÍTEM ──────────────────────────────────────────────────

  async aplicarDescuentoItem(
    itemId: number,
    dto: ApplyDescuentoDto,
  ): Promise<CotizacionItemDescuento> {
    const item = await this.itemRepo.findOneBy({ id: itemId });
    if (!item) throw new NotFoundException(`Ítem ${itemId} no encontrado`);

    const descuento = await this.descuentosService.findOne(dto.descuentoId);

    const aplicado = await this.itemDescRepo.save(
      this.itemDescRepo.create({
        cotizacionItemId: itemId,
        descuentoId: descuento.id,
        valorPorcentaje: Number(descuento.valorPorcentaje),
      }),
    );

    const version = await this.versionRepo.findOneBy({ id: item.versionId });
    await this.recalcularTotal(item.versionId);

    await this.historialService.registrar({
      usuarioId: dto.usuarioId,
      cotizacionId: version?.cotizacionId ?? null,
      tipoEntidad: TipoEntidad.COTIZACION_ITEM,
      tipoAccion: TipoAccion.AGREGAR_DESCUENTO,
      entidadId: aplicado.id,
      descripcion: `Descuento "${descuento.nombre}" (${descuento.valorPorcentaje}%) aplicado al ítem ${itemId}`,
      datosNuevos: { descuentoId: descuento.id, nombre: descuento.nombre, porcentaje: descuento.valorPorcentaje },
    });

    return aplicado;
  }

  async eliminarDescuentoItem(itemId: number, descuentoItemId: number, usuarioId?: number): Promise<void> {
    const d = await this.itemDescRepo.findOneBy({ id: descuentoItemId, cotizacionItemId: itemId });
    if (!d) throw new NotFoundException(`Descuento ${descuentoItemId} no encontrado en ítem ${itemId}`);

    const item = await this.itemRepo.findOneBy({ id: itemId });
    const versionId = item?.versionId;
    const version = versionId ? await this.versionRepo.findOneBy({ id: versionId }) : null;

    await this.itemDescRepo.remove(d);
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
  ): Promise<CotizacionDescuento> {
    const version = await this.versionRepo.findOneBy({ id: versionId });
    if (!version) throw new NotFoundException(`Versión ${versionId} no encontrada`);

    const descuento = await this.descuentosService.findOne(dto.descuentoId);

    const aplicado = await this.descRepo.save(
      this.descRepo.create({
        versionId,
        descuentoId: descuento.id,
        valorPorcentaje: Number(descuento.valorPorcentaje),
      }),
    );

    await this.recalcularTotal(versionId);

    await this.historialService.registrar({
      usuarioId: dto.usuarioId,
      cotizacionId: version.cotizacionId,
      tipoEntidad: TipoEntidad.COTIZACION_VERSION,
      tipoAccion: TipoAccion.AGREGAR_DESCUENTO,
      entidadId: aplicado.id,
      descripcion: `Descuento global "${descuento.nombre}" (${descuento.valorPorcentaje}%) aplicado a versión ${versionId}`,
      datosNuevos: { descuentoId: descuento.id, nombre: descuento.nombre, porcentaje: descuento.valorPorcentaje },
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

  // ─── CÁLCULO DE TOTAL (siempre en backend) ────────────────────────────────

  async calcularTotal(versionId: number): Promise<{
    subtotalItems: number;
    descuentosItems: number;
    subtotalNeto: number;
    descuentosGlobales: number;
    total: number;
    desglose: object[];
  }> {
    const version = await this.getVersion(
      (await this.versionRepo.findOneBy({ id: versionId }))!.cotizacionId,
      versionId,
    );

    let subtotalItems = 0;
    let descuentosItems = 0;
    const desglose: object[] = [];

    for (const item of version.items) {
      const subtotalItem = Number(item.precioBase) * Number(item.cantidad);
      let descuentoItemTotal = 0;

      for (const d of item.descuentos) {
        descuentoItemTotal += subtotalItem * (Number(d.valorPorcentaje) / 100);
      }

      const netoItem = subtotalItem - descuentoItemTotal;
      subtotalItems += subtotalItem;
      descuentosItems += descuentoItemTotal;

      desglose.push({
        itemId: item.id,
        hibridoId: item.hibridoId,
        bandaId: item.bandaId,
        cantidad: item.cantidad,
        precioBase: item.precioBase,
        subtotal: subtotalItem,
        descuentos: descuentoItemTotal,
        neto: netoItem,
      });
    }

    const subtotalNeto = subtotalItems - descuentosItems;

    let descuentosGlobales = 0;
    for (const d of version.descuentos) {
      descuentosGlobales += subtotalNeto * (Number(d.valorPorcentaje) / 100);
    }

    const total = subtotalNeto - descuentosGlobales;
    return { subtotalItems, descuentosItems, subtotalNeto, descuentosGlobales, total, desglose };
  }

  private async recalcularTotal(versionId: number): Promise<void> {
    const result = await this.calcularTotal(versionId);
    await this.versionRepo.update(versionId, { total: result.total });
  }
}
