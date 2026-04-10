import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Cultivo } from '../productos/cultivo.entity';
import { CotizacionVersion } from './cotizacion-version.entity';

// Metadata por cultivo dentro de una versión de cotización.
// Actualmente guarda la vigencia (rango desde/hasta) por cultivo.
@Entity('cotizacion_version_cultivos')
@Unique(['versionId', 'cultivoId'])
export class CotizacionVersionCultivo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'version_id' })
  versionId: number;

  @Column({ name: 'cultivo_id' })
  cultivoId: number;

  @Column({ name: 'vigencia_desde', type: 'date', nullable: true })
  vigenciaDesde: string | null;

  @Column({ name: 'vigencia_hasta', type: 'date', nullable: true })
  vigenciaHasta: string | null;

  @ManyToOne(() => CotizacionVersion, (v) => v.cultivoMetadata, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'version_id' })
  version: CotizacionVersion;

  @ManyToOne(() => Cultivo)
  @JoinColumn({ name: 'cultivo_id' })
  cultivo: Cultivo;
}
