import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Descuento } from '../descuentos/descuento.entity';
import { CotizacionItem } from './cotizacion-item.entity';

@Entity('cotizacion_item_descuentos')
export class CotizacionItemDescuento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cotizacion_item_id' })
  cotizacionItemId: number;

  @Column({ name: 'descuento_id' })
  descuentoId: number;

  // Valor congelado al momento de cotizar.
  @Column({ name: 'valor_porcentaje', type: 'decimal', precision: 5, scale: 2 })
  valorPorcentaje: number;

  @ManyToOne(() => CotizacionItem, (i) => i.descuentos)
  @JoinColumn({ name: 'cotizacion_item_id' })
  item: CotizacionItem;

  @ManyToOne(() => Descuento, (d) => d.itemDescuentos)
  @JoinColumn({ name: 'descuento_id' })
  descuento: Descuento;
}
