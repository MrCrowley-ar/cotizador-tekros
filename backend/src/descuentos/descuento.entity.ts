import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

// El nombre puede repetirse en distintas fechas (historial de cambios).
// El descuento vigente es el activo con MAX(fecha) para ese nombre.
@Entity('descuentos')
export class Descuento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  nombre: string;

  @Column({ name: 'valor_porcentaje', type: 'decimal', precision: 5, scale: 2 })
  valorPorcentaje: number;

  @Column({ type: 'date' })
  fecha: Date;

  @Column({ default: true })
  activo: boolean;

  @OneToMany('CotizacionItemDescuento', 'descuento')
  itemDescuentos: any[];

  @OneToMany('CotizacionDescuento', 'descuento')
  cotizacionDescuentos: any[];
}
