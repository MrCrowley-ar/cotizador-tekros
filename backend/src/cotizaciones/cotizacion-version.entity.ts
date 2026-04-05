import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';
import { Cotizacion } from './cotizacion.entity';

// Las versiones nunca se modifican — cada cambio genera una nueva versión.
@Entity('cotizacion_versiones')
@Unique(['cotizacionId', 'version'])
export class CotizacionVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cotizacion_id' })
  cotizacionId: number;

  @Column()
  version: number;

  @Column({ length: 200, nullable: true })
  nombre: string | null;

  @CreateDateColumn({ name: 'fecha' })
  fecha: Date;

  @Column({ name: 'usuario_id' })
  usuarioId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @ManyToOne(() => Cotizacion, (c) => c.versiones)
  @JoinColumn({ name: 'cotizacion_id' })
  cotizacion: Cotizacion;

  @ManyToOne(() => Usuario, (u) => u.versiones)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @OneToMany('CotizacionItem', 'version')
  items: any[];

  @OneToMany('CotizacionDescuento', 'version')
  descuentos: any[];

  @OneToMany('CotizacionVersionSeccion', 'version')
  secciones: any[];
}
