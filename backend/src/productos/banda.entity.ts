import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cultivo } from './cultivo.entity';

@Entity('bandas')
export class Banda {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cultivo_id' })
  cultivoId: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ default: 0 })
  orden: number;

  @Column({ default: true })
  activo: boolean;

  @ManyToOne(() => Cultivo, (c) => c.bandas)
  @JoinColumn({ name: 'cultivo_id' })
  cultivo: Cultivo;

  @OneToMany('Precio', 'banda')
  precios: any[];
}
