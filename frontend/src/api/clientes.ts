import { api } from './client';
import type { Cliente } from './types';

export const clientesApi = {
  getAll: (search?: string) =>
    api.get<Cliente[]>(search ? `/clientes?search=${encodeURIComponent(search)}` : '/clientes'),
  create: (body: { nombre: string; cuit: string; direccion?: string; telefono?: string; email?: string }) =>
    api.post<Cliente>('/clientes', body),
  update: (id: number, body: Partial<{ nombre: string; cuit: string; direccion: string; telefono: string; email: string; activo: boolean }>) =>
    api.patch<Cliente>(`/clientes/${id}`, body),
};
