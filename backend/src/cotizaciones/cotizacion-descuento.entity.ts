import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Descuento } from '../descuentos/descuento.entity';
import { CotizacionVersion } from './cotizacion-version.entity';

@Entity('cotizacion_descuentos')
export class CotizacionDescuento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'version_id' })
  versionId: number;

  @Column({ name: 'descuento_id' })
  descuentoId: number;

  // Valor congelado al momento de cotizar.
  @Column({ name: 'valor_porcentaje', type: 'decimal', precision: 5, scale: 2 })
  valorPorcentaje: number;

  @ManyToOne(() => CotizacionVersion, (v) => v.descuentos)
  @JoinColumn({ name: 'version_id' })
  version: CotizacionVersion;

  @ManyToOne(() => Descuento, (d) => d.cotizacionDescuentos)
  @JoinColumn({ name: 'descuento_id' })
  descuento: Descuento;
}
