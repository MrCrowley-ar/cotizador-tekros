import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Descuento } from './descuento.entity';

@Entity('descuento_reglas')
export class DescuentoRegla {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'descuento_id' })
  descuentoId: number;

  // Nombre de la opción (solo usado en modo=selector, ej: "Contado", "30 días")
  @Column({ nullable: true, length: 100 })
  nombre: string | null;

  // Porcentaje a aplicar si todas las condiciones de esta regla se cumplen
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  valor: number;

  // Orden de evaluación: se evalúan de menor a mayor; la primera que pasa gana
  @Column({ default: 0 })
  prioridad: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Descuento, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'descuento_id' })
  descuento: Descuento;

  @OneToMany('DescuentoCondicion', 'regla', { cascade: true })
  condiciones: any[];
}
