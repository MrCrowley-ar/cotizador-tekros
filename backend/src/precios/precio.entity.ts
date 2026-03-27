import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Banda } from '../productos/banda.entity';
import { Hibrido } from '../productos/hibrido.entity';

// Los precios nunca se actualizan — siempre INSERT.
// El precio vigente es el registro con MAX(fecha) para (hibrido_id, banda_id).
@Entity('precios')
export class Precio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'hibrido_id' })
  hibridoId: number;

  @Column({ name: 'banda_id' })
  bandaId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precio: number;

  @Column({ type: 'date' })
  fecha: Date;

  @ManyToOne(() => Hibrido, (h) => h.precios)
  @JoinColumn({ name: 'hibrido_id' })
  hibrido: Hibrido;

  @ManyToOne(() => Banda, (b) => b.precios)
  @JoinColumn({ name: 'banda_id' })
  banda: Banda;
}
