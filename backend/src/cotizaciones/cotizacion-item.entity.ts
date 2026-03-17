import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Banda } from '../productos/banda.entity';
import { Cultivo } from '../productos/cultivo.entity';
import { Hibrido } from '../productos/hibrido.entity';
import { CotizacionVersion } from './cotizacion-version.entity';

@Entity('cotizacion_items')
export class CotizacionItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'version_id' })
  versionId: number;

  @Column({ name: 'cultivo_id' })
  cultivoId: number;

  @Column({ name: 'hibrido_id' })
  hibridoId: number;

  @Column({ name: 'banda_id' })
  bandaId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cantidad: number;

  // Precio congelado al momento de generar la versión — no se actualiza aunque cambie el catálogo.
  @Column({ name: 'precio_base', type: 'decimal', precision: 10, scale: 2 })
  precioBase: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @ManyToOne(() => CotizacionVersion, (v) => v.items)
  @JoinColumn({ name: 'version_id' })
  version: CotizacionVersion;

  @ManyToOne(() => Cultivo)
  @JoinColumn({ name: 'cultivo_id' })
  cultivo: Cultivo;

  @ManyToOne(() => Hibrido)
  @JoinColumn({ name: 'hibrido_id' })
  hibrido: Hibrido;

  @ManyToOne(() => Banda)
  @JoinColumn({ name: 'banda_id' })
  banda: Banda;

  @OneToMany('CotizacionItemDescuento', 'item')
  descuentos: any[];
}
