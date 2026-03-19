import { api } from './client';
import type { Mensaje } from './types';

export const mensajesApi = {
  getAll: () => api.get<Mensaje[]>('/mensajes'),
  create: (contenido: string) => api.post<Mensaje>('/mensajes', { contenido }),
  toggleFijado: (id: number) => api.patch<Mensaje>(`/mensajes/${id}/toggle-fijado`),
  remove: (id: number) => api.delete(`/mensajes/${id}`),
};
