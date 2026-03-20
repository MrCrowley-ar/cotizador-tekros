import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cultivo } from './cultivo.entity';

@Entity('hibridos')
export class Hibrido {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cultivo_id' })
  cultivoId: number;

  @Column({ length: 200 })
  nombre: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: null })
  volumen: number | null;

  @ManyToOne(() => Cultivo, (c) => c.hibridos)
  @JoinColumn({ name: 'cultivo_id' })
  cultivo: Cultivo;

  @OneToMany('Precio', 'hibrido')
  precios: any[];
}
