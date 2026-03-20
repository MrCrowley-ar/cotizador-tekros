import { api } from './client';
import type { Cultivo, Hibrido, Banda } from './types';

export const productosApi = {
  getCultivos: (soloActivos = true) =>
    api.get<Cultivo[]>(`/cultivos?soloActivos=${soloActivos}`),
  createCultivo: (nombre: string) => api.post<Cultivo>('/cultivos', { nombre }),
  updateCultivo: (id: number, body: Partial<{ nombre: string; activo: boolean }>) =>
    api.patch<Cultivo>(`/cultivos/${id}`, body),

  getHibridos: (cultivoId: number, soloActivos = true) =>
    api.get<Hibrido[]>(`/cultivos/${cultivoId}/hibridos?soloActivos=${soloActivos}`),
  createHibrido: (body: { cultivoId: number; nombre: string; volumen?: number }) =>
    api.post<Hibrido>('/hibridos', body),
  updateHibrido: (id: number, body: Partial<{ nombre: string; activo: boolean; volumen: number | null }>) =>
    api.patch<Hibrido>(`/hibridos/${id}`, body),

  getBandas: (cultivoId: number, soloActivas = true) =>
    api.get<Banda[]>(`/cultivos/${cultivoId}/bandas?soloActivas=${soloActivas}`),
  createBanda: (body: { cultivoId: number; nombre: string }) =>
    api.post<Banda>('/bandas', body),
  updateBanda: (id: number, body: Partial<{ nombre: string; activa: boolean }>) =>
    api.patch<Banda>(`/bandas/${id}`, body),
};
