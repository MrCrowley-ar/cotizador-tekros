import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum RolUsuario {
  ADMIN = 'admin',
  VENDEDOR = 'vendedor',
}

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  nombre: string;

  @Column({ unique: true, length: 200 })
  email: string;

  @Column({ length: 255 })
  password: string;

  @Column({
    type: 'enum',
    enum: RolUsuario,
    default: RolUsuario.VENDEDOR,
  })
  rol: RolUsuario;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @OneToMany('Cotizacion', 'usuario')
  cotizaciones: any[];

  @OneToMany('CotizacionVersion', 'usuario')
  versiones: any[];

  @OneToMany('Mensaje', 'usuario')
  mensajes: any[];
}
