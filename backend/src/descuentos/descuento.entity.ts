import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum TipoAplicacion {
  GLOBAL = 'global',
  CULTIVO = 'cultivo',
  HIBRIDO = 'hibrido',
}

export enum ModoDescuento {
  BASICO = 'basico',
  AVANZADO = 'avanzado',
  SELECTOR = 'selector',
  MANUAL = 'manual',
  COMISION = 'comision',
}

// El nombre puede repetirse en distintas fechas (historial de cambios).
// Modo básico: porcentaje fijo en valorPorcentaje.
// Modo avanzado: porcentaje definido por reglas (valorPorcentaje = null).
@Entity('descuentos')
export class Descuento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  nombre: string;

  @Column({
    name: 'tipo_aplicacion',
    type: 'enum',
    enum: TipoAplicacion,
    default: TipoAplicacion.GLOBAL,
  })
  tipoAplicacion: TipoAplicacion;

  @Column({
    type: 'enum',
    enum: ModoDescuento,
    default: ModoDescuento.BASICO,
  })
  modo: ModoDescuento;

  // Solo para modo BASICO; null en modo AVANZADO (el % viene de las reglas)
  @Column({
    name: 'valor_porcentaje',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  valorPorcentaje: number | null;

  @Column({ name: 'fecha_vigencia', type: 'date' })
  fechaVigencia: Date;

  @Column({ default: true })
  activo: boolean;

  // Solo para modo COMISION: margen % y descuento referenciado
  @Column({
    name: 'comision_margen',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  comisionMargen: number | null;

  @Column({
    name: 'comision_descuento_id',
    type: 'integer',
    nullable: true,
  })
  comisionDescuentoId: number | null;

  @OneToMany('DescuentoRegla', 'descuento', { cascade: true })
  reglas: any[];

  @OneToMany('CotizacionItemDescuento', 'descuento')
  itemDescuentos: any[];

  @OneToMany('CotizacionDescuento', 'descuento')
  cotizacionDescuentos: any[];
}
