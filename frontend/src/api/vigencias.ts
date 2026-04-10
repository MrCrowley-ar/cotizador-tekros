import { api } from './client';
import type { Vigencia } from './types';

export const vigenciasApi = {
  getAll: () => api.get<Vigencia[]>('/vigencias'),
  setGlobal: (fechaVigencia: string) =>
    api.put<Vigencia>('/vigencias/global', { fechaVigencia }),
  setPorCultivo: (items: Array<{ cultivoId: number; fechaVigencia: string }>) =>
    api.put<Vigencia[]>('/vigencias/cultivos', { items }),
};
