import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DescuentoRegla } from './descuento-regla.entity';

export enum CampoCondicion {
  CANTIDAD = 'cantidad',
  CULTIVO_ID = 'cultivo_id',
  HIBRIDO_ID = 'hibrido_id',
  BANDA_ID = 'banda_id',
  PRECIO = 'precio',
  SUBTOTAL = 'subtotal',
  RATIO_CULTIVO = 'ratio_cultivo',
  // Agregados de cotización (nivel cultivo o global según alcance del descuento)
  VOLUMEN = 'volumen',
  MONTO = 'monto',
  PRECIO_PONDERADO = 'precio_ponderado',
}

export enum OperadorCondicion {
  EQ = '=',
  NEQ = '!=',
  GT = '>',
  LT = '<',
  GTE = '>=',
  LTE = '<=',
  ENTRE = 'entre',
}

@Entity('descuento_condiciones')
export class DescuentoCondicion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'regla_id' })
  reglaId: number;

  @Column({ type: 'enum', enum: CampoCondicion })
  campo: CampoCondicion;

  @Column({ type: 'enum', enum: OperadorCondicion })
  operador: OperadorCondicion;

  // Valor principal (o límite inferior para operador ENTRE)
  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0 })
  valor: number;

  // Solo para operador ENTRE: límite superior
  @Column({ name: 'valor_2', type: 'decimal', precision: 12, scale: 4, nullable: true })
  valor2: number | null;

  // ── Comparación relativa (si se usan, "valor" es ignorado) ────────────────
  // Permite condiciones del tipo: campo op (valorMultiplier × valorCampo)
  // Ej: "Bolsas >= 1/2 × Monto"
  @Column({ name: 'valor_campo', type: 'enum', enum: CampoCondicion, nullable: true })
  valorCampo: CampoCondicion | null;

  @Column({ name: 'valor_multiplier', type: 'decimal', precision: 8, scale: 6, nullable: true })
  valorMultiplier: number | null;

  @ManyToOne(() => DescuentoRegla, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'regla_id' })
  regla: DescuentoRegla;
}
