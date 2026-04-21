import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Descuento } from '../descuentos/descuento.entity';
import { DescuentoRegla } from '../descuentos/descuento-regla.entity';
import { CotizacionVersion } from './cotizacion-version.entity';
import { CotizacionVersionSeccion } from './cotizacion-version-seccion.entity';

@Entity('cotizacion_descuentos')
export class CotizacionDescuento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'version_id' })
  versionId: number;

  @Column({ name: 'descuento_id', nullable: true })
  descuentoId: number | null;

  // Valor congelado al momento de cotizar.
  @Column({ name: 'valor_porcentaje', type: 'decimal', precision: 5, scale: 2 })
  valorPorcentaje: number;

  // Regla específica elegida en descuentos modo selector/avanzado. Permite
  // distinguir entre reglas con el mismo valor porcentual.
  @Column({ name: 'regla_id', nullable: true })
  reglaId: number | null;

  @ManyToOne(() => CotizacionVersion, (v) => v.descuentos)
  @JoinColumn({ name: 'version_id' })
  version: CotizacionVersion;

  @Column({ name: 'seccion_id', nullable: true })
  seccionId: number | null;

  @ManyToOne(() => Descuento, (d) => d.cotizacionDescuentos)
  @JoinColumn({ name: 'descuento_id' })
  descuento: Descuento;

  @ManyToOne(() => CotizacionVersionSeccion, { nullable: true })
  @JoinColumn({ name: 'seccion_id' })
  seccion: CotizacionVersionSeccion | null;

  @ManyToOne(() => DescuentoRegla, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'regla_id' })
  regla: DescuentoRegla | null;
}
