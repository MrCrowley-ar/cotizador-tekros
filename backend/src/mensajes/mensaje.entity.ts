import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';

@Entity('mensajes')
export class Mensaje {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'usuario_id' })
  usuarioId: number;

  @Column({ type: 'text' })
  contenido: string;

  @CreateDateColumn({ name: 'fecha' })
  fecha: Date;

  @Column({ default: false })
  fijado: boolean;

  @ManyToOne(() => Usuario, (u) => u.mensajes)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @OneToMany('MensajeImagen', 'mensaje')
  imagenes: any[];
}
