import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Descuento } from '../descuentos/descuento.entity';
import { CotizacionItem } from './cotizacion-item.entity';
import { CotizacionVersionSeccion } from './cotizacion-version-seccion.entity';

@Entity('cotizacion_item_descuentos')
export class CotizacionItemDescuento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cotizacion_item_id' })
  cotizacionItemId: number;

  @Column({ name: 'descuento_id', nullable: true })
  descuentoId: number | null;

  // Valor congelado al momento de cotizar.
  @Column({ name: 'valor_porcentaje', type: 'decimal', precision: 5, scale: 2 })
  valorPorcentaje: number;

  @Column({ name: 'es_comision', default: false })
  esComision: boolean;

  @ManyToOne(() => CotizacionItem, (i) => i.descuentos)
  @JoinColumn({ name: 'cotizacion_item_id' })
  item: CotizacionItem;

  @Column({ name: 'seccion_id', nullable: true })
  seccionId: number | null;

  @ManyToOne(() => Descuento, (d) => d.itemDescuentos)
  @JoinColumn({ name: 'descuento_id' })
  descuento: Descuento;

  @ManyToOne(() => CotizacionVersionSeccion, { nullable: true })
  @JoinColumn({ name: 'seccion_id' })
  seccion: CotizacionVersionSeccion | null;
}
