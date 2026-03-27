import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Mensaje } from './mensaje.entity';

@Entity('mensaje_imagenes')
export class MensajeImagen {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'mensaje_id' })
  mensajeId: number;

  @Column({ name: 'url_imagen', length: 500 })
  urlImagen: string;

  @ManyToOne(() => Mensaje, (m) => m.imagenes)
  @JoinColumn({ name: 'mensaje_id' })
  mensaje: Mensaje;
}
