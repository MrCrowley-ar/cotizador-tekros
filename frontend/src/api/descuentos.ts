import { api } from './client';
import type { Descuento, DescuentoAplicado, TipoAplicacion } from './types';

export interface CreateDescuentoPayload {
  nombre: string;
  tipoAplicacion?: TipoAplicacion;
  modo?: 'basico' | 'avanzado';
  valorPorcentaje?: number;
  fechaVigencia: string;
  reglas?: Array<{
    valor: number;
    prioridad?: number;
    condiciones: Array<{
      campo: string;
      operador: string;
      valor: number;
      valor2?: number;
    }>;
  }>;
}

export const descuentosApi = {
  getAll: (soloActivos = false) =>
    api.get<Descuento[]>(`/descuentos?soloActivos=${soloActivos}`),
  getOne: (id: number) => api.get<Descuento>(`/descuentos/${id}`),
  create: (body: CreateDescuentoPayload) => api.post<Descuento>('/descuentos', body),
  toggle: (id: number) => api.patch<Descuento>(`/descuentos/${id}/toggle`),
  getUso: (id: number) => api.get<{ count: number }>(`/descuentos/${id}/uso`),
  update: (id: number, body: Partial<CreateDescuentoPayload>) =>
    api.patch<Descuento>(`/descuentos/${id}`, body),
  delete: (id: number) => api.delete(`/descuentos/${id}`),
  evaluar: (body: {
    cantidad?: number;
    tipoAplicacion: TipoAplicacion;
    cultivoId?: number;
    hibridoId?: number;
    bandaId?: number;
    precio?: number;
    subtotal?: number;
  }) => api.post<DescuentoAplicado[]>('/descuentos/evaluar', body),
};
