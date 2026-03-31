import { api } from './client';
import type {
  Cotizacion,
  CotizacionVersion,
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
  getTotal: (id: number, vid: number) => api.get<TotalDesglose>(`${ver(id, vid)}/total`),

  addItem: (id: number, vid: number, body: { cultivoId: number; hibridoId: number; bandaId: number; bolsas: number }) =>
    api.post<CotizacionItem>(`${ver(id, vid)}/items`, body),
  deleteItem: (id: number, vid: number, itemId: number) =>
    api.delete(`${ver(id, vid)}/items/${itemId}`),

  applyItemDescuento: (id: number, vid: number, itemId: number, body: { descuentoId: number; porcentaje?: number }) =>
    api.post<CotizacionItemDescuento>(`${ver(id, vid)}/items/${itemId}/descuentos`, body),
  deleteItemDescuento: (id: number, vid: number, itemId: number, did: number) =>
    api.delete(`${ver(id, vid)}/items/${itemId}/descuentos/${did}`),

  applyGlobalDescuento: (id: number, vid: number, body: { descuentoId: number; porcentaje?: number }) =>
    api.post<CotizacionDescuento>(`${ver(id, vid)}/descuentos`, body),
  deleteGlobalDescuento: (id: number, vid: number, did: number) =>
    api.delete(`${ver(id, vid)}/descuentos/${did}`),
};
