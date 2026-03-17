import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DescuentosService } from '../descuentos/descuentos.service';
import { DescuentosVolumenService } from '../descuentos/descuentos-volumen.service';
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
    return this.dataSource.transaction(async (em) => {
      const numero = await this.generarNumero();
      const cotizacion = em.create(Cotizacion, { ...dto, numero });
      const saved = await em.save(cotizacion);

      const version = em.create(CotizacionVersion, {
        cotizacionId: saved.id,
        version: 1,
        usuarioId: dto.usuarioId,
        total: 0,
      });
      await em.save(version);

      return saved;
    });
  }

  async updateEstado(id: number, dto: UpdateEstadoDto): Promise<Cotizacion> {
    const cotizacion = await this.findOne(id);
    cotizacion.estado = dto.estado;
    return this.cotizacionRepo.save(cotizacion);
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

    return this.dataSource.transaction(async (em) => {
      const ultima = await this.getVersion(
        cotizacionId,
        (await this.getUltimaVersion(cotizacionId)).id,
      );

      const nuevaVersion = em.create(CotizacionVersion, {
        cotizacionId,
        version: ultima.version + 1,
        usuarioId,
        total: ultima.total,
      });
      const savedVersion = await em.save(nuevaVersion);

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

    // Recalcula total de la versión
    await this.recalcularTotal(versionId);

    return item;
  }

  async eliminarItem(versionId: number, itemId: number): Promise<void> {
    const item = await this.itemRepo.findOneBy({ id: itemId, versionId });
    if (!item) throw new NotFoundException(`Ítem ${itemId} no encontrado en versión ${versionId}`);
    await this.itemRepo.remove(item);
    await this.recalcularTotal(versionId);
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

    await this.recalcularTotal(item.versionId);
    return aplicado;
  }

  async eliminarDescuentoItem(itemId: number, descuentoItemId: number): Promise<void> {
    const d = await this.itemDescRepo.findOneBy({ id: descuentoItemId, cotizacionItemId: itemId });
    if (!d) throw new NotFoundException(`Descuento ${descuentoItemId} no encontrado en ítem ${itemId}`);
    const versionId = (await this.itemRepo.findOneBy({ id: itemId }))?.versionId;
    await this.itemDescRepo.remove(d);
    if (versionId) await this.recalcularTotal(versionId);
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
    return aplicado;
  }

  async eliminarDescuentoGlobal(versionId: number, descuentoVersionId: number): Promise<void> {
    const d = await this.descRepo.findOneBy({ id: descuentoVersionId, versionId });
    if (!d) throw new NotFoundException(`Descuento ${descuentoVersionId} no encontrado en versión ${versionId}`);
    await this.descRepo.remove(d);
    await this.recalcularTotal(versionId);
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
