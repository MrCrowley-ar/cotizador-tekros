import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';

export enum TipoEntidad {
  COTIZACION = 'cotizacion',
  COTIZACION_VERSION = 'cotizacion_version',
  COTIZACION_ITEM = 'cotizacion_item',
  CLIENTE = 'cliente',
  USUARIO = 'usuario',
  PRECIO = 'precio',
  DESCUENTO = 'descuento',
  DESCUENTO_VOLUMEN = 'descuento_volumen',
  CULTIVO = 'cultivo',
  HIBRIDO = 'hibrido',
  BANDA = 'banda',
  MENSAJE = 'mensaje',
}

export enum TipoAccion {
  CREAR = 'crear',
  ACTUALIZAR = 'actualizar',
  ELIMINAR = 'eliminar',
  CAMBIAR_ESTADO = 'cambiar_estado',
  NUEVA_VERSION = 'nueva_version',
  AGREGAR_ITEM = 'agregar_item',
  ELIMINAR_ITEM = 'eliminar_item',
  AGREGAR_DESCUENTO = 'agregar_descuento',
  ELIMINAR_DESCUENTO = 'eliminar_descuento',
  REGISTRAR_PRECIO = 'registrar_precio',
  ACTIVAR = 'activar',
  DESACTIVAR = 'desactivar',
  FIJAR = 'fijar',
  DESFIJAR = 'desfijar',
}

@Entity('historial_acciones')
export class AccionHistorial {
  @PrimaryGeneratedColumn()
  id: number;

  // Quién realizó la acción (nullable: puede ser acción del sistema)
  @Column({ name: 'usuario_id', nullable: true })
  usuarioId: number | null;

  // A qué cotización afecta (nullable: no todas las acciones son de cotizaciones)
  @Column({ name: 'cotizacion_id', nullable: true })
  cotizacionId: number | null;

  @Column({ name: 'tipo_entidad', type: 'enum', enum: TipoEntidad })
  tipoEntidad: TipoEntidad;

  @Column({ name: 'tipo_accion', type: 'enum', enum: TipoAccion })
  tipoAccion: TipoAccion;

  // ID del registro afectado (ej: id del item, del descuento, del cliente)
  @Column({ name: 'entidad_id', nullable: true })
  entidadId: number | null;

  // Descripción legible por humanos
  @Column({ length: 500 })
  descripcion: string;

  // Estado anterior y nuevo (para auditoría detallada)
  @Column({ name: 'datos_previos', type: 'jsonb', nullable: true })
  datosPrevios: object | null;

  @Column({ name: 'datos_nuevos', type: 'jsonb', nullable: true })
  datosNuevos: object | null;

  @CreateDateColumn({ name: 'fecha' })
  fecha: Date;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario | null;
}
