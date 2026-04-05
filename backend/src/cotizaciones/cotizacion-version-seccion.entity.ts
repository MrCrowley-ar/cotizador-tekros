import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CotizacionVersion } from './cotizacion-version.entity';

@Entity('cotizacion_version_secciones')
export class CotizacionVersionSeccion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'version_id' })
  versionId: number;

  @Column({ length: 200, nullable: true })
  nombre: string | null;

  @Column({ default: 0 })
  orden: number;

  @ManyToOne(() => CotizacionVersion, (v) => v.secciones)
  @JoinColumn({ name: 'version_id' })
  version: CotizacionVersion;
}
