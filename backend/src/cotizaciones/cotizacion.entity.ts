import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cliente } from '../clientes/cliente.entity';
import { Usuario } from '../usuarios/usuario.entity';

export enum EstadoCotizacion {
  BORRADOR = 'borrador',
  ENVIADA = 'enviada',
  APROBADA = 'aprobada',
  RECHAZADA = 'rechazada',
  CERRADA = 'cerrada',
}

@Entity('cotizaciones')
export class Cotizacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  numero: string;

  @Column({ name: 'cliente_id' })
  clienteId: number;

  @Column({ name: 'usuario_id' })
  usuarioId: number;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @Column({
    type: 'enum',
    enum: EstadoCotizacion,
    default: EstadoCotizacion.BORRADOR,
  })
  estado: EstadoCotizacion;

  @ManyToOne(() => Cliente, (c) => c.cotizaciones)
  @JoinColumn({ name: 'cliente_id' })
  cliente: Cliente;

  @ManyToOne(() => Usuario, (u) => u.cotizaciones)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @OneToMany('CotizacionVersion', 'cotizacion')
  versiones: any[];
}
