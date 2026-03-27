import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientesApi } from '../../api/clientes';
import { Spinner } from '../../components/Spinner';
import { Badge } from '../../components/Badge';
import type { Cliente } from '../../api/types';

export function ClientesTab() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editRazonSocial, setEditRazonSocial] = useState('');
  const [editCuit, setEditCuit] = useState('');

  const qc = useQueryClient();

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes', search],
    queryFn: () => clientesApi.getAll(search || undefined),
  });

  const createMut = useMutation({
    mutationFn: () => clientesApi.create({
      nombre: editNombre.trim(),
      razonSocial: editRazonSocial.trim() || undefined,
      cuit: editCuit.trim(),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clientes'] }); setEditing(null); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      clientesApi.update(id, {
        nombre: editNombre.trim(),
        razonSocial: editRazonSocial.trim() || undefined,
        cuit: editCuit.trim(),
        activo,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clientes'] }); setEditing(null); },
  });

  const startNew = () => {
    setEditNombre(''); setEditRazonSocial(''); setEditCuit('');
    setEditing('new');
  };

  const startEdit = (c: Cliente) => {
    setEditNombre(c.nombre);
    setEditRazonSocial(c.razonSocial ?? '');
    setEditCuit(c.cuit);
    setEditing(c.id);
  };

  const cancel = () => setEditing(null);
  const canSave = editNombre.trim() && editCuit.trim();

  const inp = (color: 'blue' | 'green') =>
    `w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-${color}-500`;

  if (isLoading && !search) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <div>
      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, razón social o CUIT..."
          className="border rounded-lg px-3 py-2 text-sm w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Nombre contacto</th>
              <th className="text-left px-4 py-3">Razón social</th>
              <th className="text-left px-4 py-3">CUIT</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="px-4 py-3 w-44" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clientes.map((c) =>
              editing === c.id ? (
                <tr key={`${c.id}-edit`} className="bg-blue-50">
                  <td className="px-3 py-2">
                    <input autoFocus value={editNombre} onChange={(e) => setEditNombre(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Escape') cancel(); }}
                      placeholder="Nombre contacto *" className={inp('blue')} />
                  </td>
                  <td className="px-3 py-2">
                    <input value={editRazonSocial} onChange={(e) => setEditRazonSocial(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Escape') cancel(); }}
                      placeholder="Razón social..." className={inp('blue')} />
                  </td>
                  <td className="px-3 py-2">
                    <input value={editCuit} onChange={(e) => setEditCuit(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Escape') cancel(); }}
                      placeholder="CUIT *" className={`${inp('blue')} font-mono`} />
                  </td>
                  <td className="px-4 py-2"><Badge label={c.activo ? 'activo' : 'inactivo'} /></td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 justify-end items-center">
                      <button onClick={() => { if (canSave) updateMut.mutate({ id: c.id, activo: !c.activo }); }}
                        disabled={!canSave || updateMut.isPending}
                        className="px-2 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap">
                        {c.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button onClick={() => { if (canSave) updateMut.mutate({ id: c.id, activo: c.activo }); }}
                        disabled={!canSave || updateMut.isPending}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                        {updateMut.isPending ? '…' : '✓'}
                      </button>
                      <button onClick={cancel} className="px-2 py-1 text-xs text-gray-400 hover:text-gray-700">✕</button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={c.id} onClick={() => startEdit(c)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{c.razonSocial ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-gray-600 text-xs">{c.cuit}</td>
                  <td className="px-4 py-3"><Badge label={c.activo ? 'activo' : 'inactivo'} /></td>
                  <td className="px-4 py-3 text-right text-gray-300 text-xs">editar</td>
                </tr>
              )
            )}

            {editing === 'new' ? (
              <tr className="bg-green-50">
                <td className="px-3 py-2">
                  <input autoFocus value={editNombre} onChange={(e) => setEditNombre(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && canSave) createMut.mutate(); if (e.key === 'Escape') cancel(); }}
                    placeholder="Nombre contacto *" className={inp('green')} />
                </td>
                <td className="px-3 py-2">
                  <input value={editRazonSocial} onChange={(e) => setEditRazonSocial(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && canSave) createMut.mutate(); if (e.key === 'Escape') cancel(); }}
                    placeholder="Razón social..." className={inp('green')} />
                </td>
                <td className="px-3 py-2">
                  <input value={editCuit} onChange={(e) => setEditCuit(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && canSave) createMut.mutate(); if (e.key === 'Escape') cancel(); }}
                    placeholder="CUIT *" className={`${inp('green')} font-mono`} />
                </td>
                <td className="px-4 py-2 text-gray-400 text-xs">—</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1 justify-end items-center">
                    <button onClick={() => { if (canSave) createMut.mutate(); }}
                      disabled={!canSave || createMut.isPending}
                      className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                      {createMut.isPending ? '…' : '✓ Guardar'}
                    </button>
                    <button onClick={cancel} className="px-2 py-1 text-xs text-gray-400 hover:text-gray-700">✕</button>
                  </div>
                </td>
              </tr>
            ) : (
              <tr onClick={startNew}
                className="hover:bg-gray-50 cursor-pointer transition-colors border-t border-dashed border-gray-200">
                <td colSpan={5} className="px-4 py-2 text-sm text-blue-500 font-medium">
                  + Agregar cliente
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {clientes.length === 0 && editing !== 'new' && (
          <p className="text-center py-8 text-gray-400 text-sm">
            {search ? 'Sin resultados.' : 'Sin clientes aún.'}
          </p>
        )}
      </div>
    </div>
  );
}
