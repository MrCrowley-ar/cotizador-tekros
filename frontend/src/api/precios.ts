import { api } from './client';
import type { Precio } from './types';

export const preciosApi = {
  registrar: (body: { hibridoId: number; bandaId: number; precio: number; fecha: string }) =>
    api.post<Precio>('/precios', body),
  getActual: (hibridoId: number, bandaId: number) =>
    api.get<Precio>(`/precios/actual?hibridoId=${hibridoId}&bandaId=${bandaId}`),
  getHistorico: (hibridoId: number, bandaId: number) =>
    api.get<Precio[]>(`/precios/historico?hibridoId=${hibridoId}&bandaId=${bandaId}`),
  getMatriz: (cultivoId: number) =>
    api.get<Precio[]>(`/precios/matriz?cultivoId=${cultivoId}`),
};
