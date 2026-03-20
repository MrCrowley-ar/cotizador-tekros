import { api, getToken } from './client';
import type { Mensaje } from './types';

export const mensajesApi = {
  getAll: () => api.get<Mensaje[]>('/mensajes'),
  create: (contenido: string, imagenes?: string[]) =>
    api.post<Mensaje>('/mensajes', { contenido, imagenes }),
  toggleFijado: (id: number) => api.patch<Mensaje>(`/mensajes/${id}/toggle-fijado`),
  remove: (id: number) => api.delete(`/mensajes/${id}`),

  uploadImagen: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const token = getToken();
    const res = await fetch('/api/mensajes/upload', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? `Error ${res.status}`);
    }
    return res.json();
  },
};
