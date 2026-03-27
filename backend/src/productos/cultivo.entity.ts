import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('cultivos')
export class Cultivo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ default: true })
  activo: boolean;

  @OneToMany('Hibrido', 'cultivo')
  hibridos: any[];

  @OneToMany('Banda', 'cultivo')
  bandas: any[];

  @OneToMany('DescuentoVolumen', 'cultivo')
  descuentosVolumen: any[];
}
