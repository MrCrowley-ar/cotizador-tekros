import { api } from './client';
import type {
  Cotizacion,
  CotizacionVersion,
  CotizacionVersionSeccion,
  CotizacionItem,
  CotizacionItemDescuento,
  CotizacionDescuento,
  TotalDesglose,
  EstadoCotizacion,
} from './types';

const base = (id: number) => `/cotizaciones/${id}`;
const ver = (id: number, vid: number) => `${base(id)}/versiones/${vid}`;

export const cotizacionesApi = {
  getAll: () => api.get<Cotizacion[]>('/cotizaciones'),
  getOne: (id: number) => api.get<Cotizacion>(base(id)),
  create: (clienteId: number) => api.post<Cotizacion>('/cotizaciones', { clienteId }),
  updateEstado: (id: number, estado: EstadoCotizacion) =>
    api.patch<Cotizacion>(`${base(id)}/estado`, { estado }),

  getVersiones: (id: number) => api.get<CotizacionVersion[]>(`${base(id)}/versiones`),
  getVersion: (id: number, vid: number) => api.get<CotizacionVersion>(ver(id, vid)),
  crearVersion: (id: number, nombre?: string) =>
    api.post<CotizacionVersion>(`${base(id)}/versiones`, nombre ? { nombre } : {}),
  deleteVersion: (id: number, vid: number) =>
    api.delete(`${ver(id, vid)}`),
  getTotal: (id: number, vid: number) => api.get<TotalDesglose>(`${ver(id, vid)}/total`),

  addItem: (id: number, vid: number, body: { cultivoId: number; hibridoId: number; bandaId: number; bolsas: number }) =>
    api.post<CotizacionItem>(`${ver(id, vid)}/items`, body),
  deleteItem: (id: number, vid: number, itemId: number) =>
    api.delete(`${ver(id, vid)}/items/${itemId}`),
  updateItemComision: (id: number, vid: number, itemId: number, porcentaje: number) =>
    api.patch(`${ver(id, vid)}/items/${itemId}/comision`, { porcentaje }),

  applyItemDescuento: (id: number, vid: number, itemId: number, body: { descuentoId: number; porcentaje?: number }) =>
    api.post<CotizacionItemDescuento>(`${ver(id, vid)}/items/${itemId}/descuentos`, body),
  deleteItemDescuento: (id: number, vid: number, itemId: number, did: number) =>
    api.delete(`${ver(id, vid)}/items/${itemId}/descuentos/${did}`),

  applyGlobalDescuento: (id: number, vid: number, body: { descuentoId: number; porcentaje?: number }) =>
    api.post<CotizacionDescuento>(`${ver(id, vid)}/descuentos`, body),
  deleteGlobalDescuento: (id: number, vid: number, did: number) =>
    api.delete(`${ver(id, vid)}/descuentos/${did}`),

  // Comisión
  updateComision: (id: number, vid: number, body: { margen: number; descuento: number }) =>
    api.patch(`${ver(id, vid)}/comision`, body),
  deleteComision: (id: number, vid: number) =>
    api.delete(`${ver(id, vid)}/comision`),

  // Secciones
  getSecciones: (id: number, vid: number) =>
    api.get<CotizacionVersionSeccion[]>(`${ver(id, vid)}/secciones`),
  crearSeccion: (id: number, vid: number, body: { nombre?: string; descuentosVariables: number[] }) =>
    api.post<CotizacionVersionSeccion>(`${ver(id, vid)}/secciones`, body),
  deleteSeccion: (id: number, vid: number, seccionId: number) =>
    api.delete(`${ver(id, vid)}/secciones/${seccionId}`),
  updateSeccionDescuento: (id: number, vid: number, seccionId: number, did: number, porcentaje: number) =>
    api.patch(`${ver(id, vid)}/secciones/${seccionId}/descuentos/${did}`, { porcentaje }),
};
