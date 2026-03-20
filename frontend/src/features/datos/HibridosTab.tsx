import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productosApi } from '../../api/productos';
import { Spinner } from '../../components/Spinner';
import { Badge } from '../../components/Badge';
import type { Hibrido } from '../../api/types';

export function HibridosTab() {
  const [cultivoFilter, setCultivoFilter] = useState<number>(0);
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editVolumen, setEditVolumen] = useState('');

  const qc = useQueryClient();

  const { data: cultivos = [] } = useQuery({
    queryKey: ['cultivos'],
    queryFn: () => productosApi.getCultivos(false),
  });

  const { data: hibridos = [], isLoading } = useQuery({
    queryKey: ['hibridos', cultivoFilter],
    queryFn: () =>
      cultivoFilter > 0
        ? productosApi.getHibridos(cultivoFilter, false)
        : Promise.resolve([] as Hibrido[]),
    enabled: cultivoFilter > 0,
  });

  const createMut = useMutation({
    mutationFn: () => productosApi.createHibrido({
      cultivoId: cultivoFilter,
      nombre: editNombre.trim(),
      volumen: editVolumen !== '' ? Number(editVolumen) : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hibridos'] }); setEditing(null); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, nombre, activo, volumen }: { id: number; nombre: string; activo: boolean; volumen?: number | null }) =>
      productosApi.updateHibrido(id, { nombre, activo, volumen }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hibridos'] }); setEditing(null); },
  });

  const startNew = () => { setEditNombre(''); setEditVolumen(''); setEditing('new'); };
  const startEdit = (h: Hibrido) => {
    setEditNombre(h.nombre);
    setEditVolumen(h.volumen != null ? String(h.volumen) : '');
    setEditing(h.id);
  };
  const cancel = () => setEditing(null);

  const fmtVolumen = (v?: number | null) =>
    v != null ? Number(v).toLocaleString('es-AR') : '—';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <select
          value={cultivoFilter}
          onChange={(e) => { setCultivoFilter(Number(e.target.value)); setEditing(null); }}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={0}>Seleccionar cultivo para ver híbridos...</option>
          {cultivos.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      {cultivoFilter === 0 ? (
        <p className="text-center py-8 text-gray-400 text-sm">Seleccioná un cultivo para ver sus híbridos.</p>
      ) : isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-right px-4 py-3">Volumen</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="px-4 py-3 w-40" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {hibridos.map((h) =>
                editing === h.id ? (
                  <tr key={h.id} className="bg-blue-50">
                    <td className="px-3 py-2">
                      <input
                        autoFocus
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') cancel();
                        }}
                        className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={editVolumen}
                        onChange={(e) => setEditVolumen(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Escape') cancel(); }}
                        placeholder="—"
                        className="w-24 border rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Badge label={h.activo ? 'activo' : 'inactivo'} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 justify-end items-center">
                        <button
                          onClick={() => updateMut.mutate({
                            id: h.id,
                            nombre: editNombre.trim() || h.nombre,
                            activo: !h.activo,
                            volumen: editVolumen !== '' ? Number(editVolumen) : null,
                          })}
                          disabled={updateMut.isPending}
                          className="px-2 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
                        >
                          {h.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => {
                            if (editNombre.trim()) updateMut.mutate({
                              id: h.id,
                              nombre: editNombre.trim(),
                              activo: h.activo,
                              volumen: editVolumen !== '' ? Number(editVolumen) : null,
                            });
                          }}
                          disabled={!editNombre.trim() || updateMut.isPending}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {updateMut.isPending ? '…' : '✓'}
                        </button>
                        <button onClick={cancel} className="px-2 py-1 text-xs text-gray-400 hover:text-gray-700">
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={h.id}
                    onClick={() => startEdit(h)}
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{h.nombre}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmtVolumen(h.volumen)}</td>
                    <td className="px-4 py-3"><Badge label={h.activo ? 'activo' : 'inactivo'} /></td>
                    <td className="px-4 py-3 text-right text-gray-300 text-xs">editar</td>
                  </tr>
                )
              )}

              {editing === 'new' ? (
                <tr className="bg-green-50">
                  <td className="px-3 py-2">
                    <input
                      autoFocus
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && editNombre.trim()) createMut.mutate();
                        if (e.key === 'Escape') cancel();
                      }}
                      placeholder="Nombre del híbrido..."
                      className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={editVolumen}
                      onChange={(e) => setEditVolumen(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && editNombre.trim()) createMut.mutate();
                        if (e.key === 'Escape') cancel();
                      }}
                      placeholder="—"
                      className="w-24 border rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </td>
                  <td className="px-4 py-2 text-gray-400 text-xs">—</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 justify-end items-center">
                      <button
                        onClick={() => { if (editNombre.trim()) createMut.mutate(); }}
                        disabled={!editNombre.trim() || createMut.isPending}
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {createMut.isPending ? '…' : '✓ Guardar'}
                      </button>
                      <button onClick={cancel} className="px-2 py-1 text-xs text-gray-400 hover:text-gray-700">
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr
                  onClick={startNew}
                  className="hover:bg-gray-50 cursor-pointer transition-colors border-t border-dashed border-gray-200"
                >
                  <td colSpan={4} className="px-4 py-2 text-sm text-blue-500 font-medium">
                    + Agregar híbrido
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
