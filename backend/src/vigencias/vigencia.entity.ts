import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cultivo } from '../productos/cultivo.entity';

// Catálogo de vigencias configurado en Datos > Vigencia.
// - Un registro con cultivo_id = NULL representa la vigencia GLOBAL.
// - Un registro con cultivo_id ≠ NULL representa la vigencia de ese cultivo.
// El modo activo (global u por cultivo) lo determina la UI: si hay fila global
// se usa esa; si no, se usan las por cultivo.
@Entity('vigencias')
export class Vigencia {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cultivo_id', type: 'integer', nullable: true })
  cultivoId: number | null;

  @Column({ name: 'fecha_vigencia', type: 'date' })
  fechaVigencia: string;

  @ManyToOne(() => Cultivo, { nullable: true })
  @JoinColumn({ name: 'cultivo_id' })
  cultivo: Cultivo | null;
}
