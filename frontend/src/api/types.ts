// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginResponse {
  accessToken: string;
  usuario: { id: number; nombre: string; email: string; rol: 'admin' | 'vendedor' };
}

// ─── Usuarios ─────────────────────────────────────────────────────────────────
export type RolUsuario = 'admin' | 'vendedor';
export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  fechaCreacion: string;
}

// ─── Clientes ─────────────────────────────────────────────────────────────────
export interface Cliente {
  id: number;
  nombre: string;
  razonSocial?: string;
  cuit: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  activo: boolean;
}

// ─── Productos ────────────────────────────────────────────────────────────────
export interface Cultivo {
  id: number;
  nombre: string;
  activo: boolean;
}
export interface Hibrido {
  id: number;
  cultivoId: number;
  nombre: string;
  activo: boolean;
}
export interface Banda {
  id: number;
  cultivoId: number;
  nombre: string;
  activo: boolean;
}

// ─── Precios ──────────────────────────────────────────────────────────────────
export interface Precio {
  id: number;
  hibridoId: number;
  bandaId: number;
  precio: number;
  fecha: string;
}

// ─── Descuentos ───────────────────────────────────────────────────────────────
export type TipoAplicacion = 'global' | 'cultivo' | 'hibrido';
export type ModoDescuento = 'basico' | 'avanzado' | 'selector' | 'manual' | 'comision';
export type CampoCondicion = 'cantidad' | 'cultivo_id' | 'hibrido_id' | 'banda_id' | 'precio' | 'subtotal' | 'ratio_cultivo' | 'volumen' | 'monto' | 'precio_ponderado' | 'subtotal_items' | 'desc_items' | 'total';
export type OperadorCondicion = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'entre';

export interface DescuentoCondicion {
  id: number;
  campo: CampoCondicion;
  operador: OperadorCondicion;
  valor: number;
  valor2: number | null;
  // Condición relativa: cuando valorCampo está definido, el lado derecho es (valorMultiplier × ctx[valorCampo])
  valorCampo: CampoCondicion | null;
  valorMultiplier: number | null;
}
export interface DescuentoRegla {
  id: number;
  nombre: string | null;
  valor: number;
  prioridad: number;
  condiciones: DescuentoCondicion[];
}
export interface Descuento {
  id: number;
  nombre: string;
  tipoAplicacion: TipoAplicacion;
  modo: ModoDescuento;
  valorPorcentaje: number | null;
  comisionMargen: number | null;
  comisionDescuentoId: number | null;
  activo: boolean;
  reglas: DescuentoRegla[];
}
export interface DescuentoAplicado {
  descuentoId: number;
  nombre: string;
  porcentaje: number;
  modo: ModoDescuento;
  reglaId?: number;
}

// ─── Cotizaciones ─────────────────────────────────────────────────────────────
export type EstadoCotizacion = 'borrador' | 'enviada' | 'aprobada' | 'rechazada' | 'cerrada';

export interface CotizacionVersionSeccion {
  id: number;
  versionId: number;
  nombre: string | null;
  orden: number;
}

export interface CotizacionVersionCultivo {
  id: number;
  versionId: number;
  cultivoId: number;
  vigenciaDesde: string | null;
  vigenciaHasta: string | null;
}

export interface CotizacionItemDescuento {
  id: number;
  descuentoId: number;
  valorPorcentaje: number;
  seccionId: number | null;
  descuento?: Descuento;
}
export interface CotizacionItem {
  id: number;
  cultivoId: number;
  hibridoId: number;
  bandaId: number;
  bolsas: number;
  precioBase: number;
  subtotal: number;
  cultivo?: Cultivo;
  hibrido?: Hibrido;
  banda?: Banda;
  descuentos: CotizacionItemDescuento[];
}
export interface CotizacionDescuento {
  id: number;
  descuentoId: number;
  valorPorcentaje: number;
  seccionId: number | null;
  descuento?: Descuento;
}
export interface CotizacionVersion {
  id: number;
  cotizacionId: number;
  version: number;
  nombre: string | null;
  fecha: string;
  usuarioId: number | null;
  total: number;
  comisionMargen: number | null;
  comisionDescuentoId: number | null;
  items: CotizacionItem[];
  descuentos: CotizacionDescuento[];
  secciones?: CotizacionVersionSeccion[];
  cultivoMetadata?: CotizacionVersionCultivo[];
  usuario?: Usuario;
}
export interface Cotizacion {
  id: number;
  numero: string;
  clienteId: number;
  usuarioId: number | null;
  fechaCreacion: string;
  estado: EstadoCotizacion;
  cliente?: Cliente;
  usuario?: Usuario;
  versiones?: CotizacionVersion[];
}
export interface SeccionTotalDesglose {
  seccionId: number;
  nombre: string | null;
  subtotalItems: number;
  descuentosItems: number;
  subtotalNeto: number;
  descuentosGlobales: number;
  comision: number;
  total: number;
  desglose: object[];
}

export interface TotalDesglose {
  subtotalItems: number;
  descuentosItems: number;
  subtotalNeto: number;
  descuentosGlobales: number;
  comision: number;
  total: number;
  desglose: object[];
  secciones?: SeccionTotalDesglose[];
}

// ─── Mensajes ─────────────────────────────────────────────────────────────────
export interface MensajeImagen {
  id: number;
  urlImagen: string;
}
export interface Mensaje {
  id: number;
  usuarioId: number | null;
  contenido: string;
  fijado: boolean;
  fecha: string;
  usuario?: Usuario;
  imagenes?: MensajeImagen[];
}
