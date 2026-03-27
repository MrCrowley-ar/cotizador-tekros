import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cultivo } from '../productos/cultivo.entity';

@Entity('descuentos_volumen')
export class DescuentoVolumen {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cultivo_id' })
  cultivoId: number;

  @Column({ name: 'cantidad_min', type: 'decimal', precision: 10, scale: 2 })
  cantidadMin: number;

  // null = sin límite superior (banda abierta)
  @Column({
    name: 'cantidad_max',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  cantidadMax: number | null;

  @Column({ name: 'valor_porcentaje', type: 'decimal', precision: 5, scale: 2 })
  valorPorcentaje: number;

  @Column({ type: 'date' })
  fecha: Date;

  @ManyToOne(() => Cultivo, (c) => c.descuentosVolumen)
  @JoinColumn({ name: 'cultivo_id' })
  cultivo: Cultivo;
}
