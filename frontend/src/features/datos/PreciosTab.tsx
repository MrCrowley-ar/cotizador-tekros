import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productosApi } from '../../api/productos';
import { preciosApi } from '../../api/precios';
import { Spinner } from '../../components/Spinner';
import type { Cultivo, Hibrido, Banda } from '../../api/types';

// ─── Tabla de precios por cultivo ─────────────────────────────────────────────

function CultivoTable({ cultivo }: { cultivo: Cultivo }) {
  const qc = useQueryClient();

  const [editCell, setEditCell] = useState<{ hibridoId: number; bandaId: number } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Agregar banda
  const [addingBanda, setAddingBanda] = useState(false);
  const [newBandaNombre, setNewBandaNombre] = useState('');

  const { data: hibridos = [] } = useQuery({
    queryKey: ['hibridos', cultivo.id],
    queryFn: () => productosApi.getHibridos(cultivo.id, false),
  });
  const { data: bandas = [] } = useQuery({
    queryKey: ['bandas', cultivo.id],
    queryFn: () => productosApi.getBandas(cultivo.id, false),
  });
  const { data: matriz = [], isLoading: loadingMatriz } = useQuery({
    queryKey: ['precios-matriz', cultivo.id],
    queryFn: () => preciosApi.getMatriz(cultivo.id),
  });

  const precioMap = new Map<string, number>(
    matriz.map((p) => [`${p.hibridoId}-${p.bandaId}`, Number(p.precio)])
  );

  const saveMut = useMutation({
    mutationFn: ({ hibridoId, bandaId }: { hibridoId: number; bandaId: number }) =>
      preciosApi.registrar({
        hibridoId,
        bandaId,
        precio: Number(editValue),
        fecha: new Date().toISOString().split('T')[0],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['precios-matriz', cultivo.id] });
      setEditCell(null);
    },
  });

  const createBandaMut = useMutation({
    mutationFn: () =>
      productosApi.createBanda({ cultivoId: cultivo.id, nombre: newBandaNombre.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bandas', cultivo.id] });
      setNewBandaNombre('');
      setAddingBanda(false);
    },
  });

  const openCell = (hibridoId: number, bandaId: number) => {
    const current = precioMap.get(`${hibridoId}-${bandaId}`);
    setEditValue(current != null ? String(current) : '');
    setEditCell({ hibridoId, bandaId });
  };

  const saveCell = () => {
    if (!editCell || !editValue || Number(editValue) <= 0) return;
    saveMut.mutate(editCell);
  };

  const fmt = (v: number) =>
    v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const isEditing = (hibridoId: number, bandaId: number) =>
    editCell?.hibridoId === hibridoId && editCell?.bandaId === bandaId;

  const isEmpty = hibridos.length === 0 || bandas.length === 0;

  return (
    <div className="bg-white rounded-xl border overflow-x-auto">
      {/* Header del cultivo */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <span className="font-semibold text-gray-800 text-sm">{cultivo.nombre}</span>
        <button
          onClick={() => { setAddingBanda(true); setNewBandaNombre(''); }}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-200 rounded px-2 py-1 hover:bg-blue-50 transition-colors"
        >
          + Agregar banda
        </button>
      </div>

      {loadingMatriz ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : hibridos.length === 0 ? (
        <p className="text-center py-6 text-gray-400 text-xs">Sin híbridos para este cultivo.</p>
      ) : (
        <table className="text-sm border-collapse w-full">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3 border-b border-r border-gray-200 whitespace-nowrap sticky left-0 bg-gray-50">
                Híbrido
              </th>
              {bandas.map((b) => (
                <th
                  key={b.id}
                  className="text-center px-4 py-3 border-b border-r border-gray-200 whitespace-nowrap font-medium"
                >
                  {b.nombre}
                </th>
              ))}
              {/* Columna de nueva banda si se está agregando */}
              {addingBanda && (
                <th className="px-3 py-2 border-b border-gray-200 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      value={newBandaNombre}
                      onChange={(e) => setNewBandaNombre(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newBandaNombre.trim()) createBandaMut.mutate();
                        if (e.key === 'Escape') { setAddingBanda(false); setNewBandaNombre(''); }
                      }}
                      placeholder="Nombre banda..."
                      className="border rounded px-2 py-1 text-xs w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => { if (newBandaNombre.trim()) createBandaMut.mutate(); }}
                      disabled={!newBandaNombre.trim() || createBandaMut.isPending}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {createBandaMut.isPending ? '…' : '✓'}
                    </button>
                    <button
                      onClick={() => { setAddingBanda(false); setNewBandaNombre(''); }}
                      className="px-1 py-1 text-xs text-gray-400 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {hibridos.map((h) => (
              <tr key={h.id} className="border-b border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-900 border-r border-gray-200 whitespace-nowrap bg-gray-50 sticky left-0">
                  {h.nombre}
                </td>
                {bandas.map((b) => {
                  const precio = precioMap.get(`${h.id}-${b.id}`);
                  const editing = isEditing(h.id, b.id);
                  return (
                    <td
                      key={b.id}
                      className={`px-3 py-2 text-right border-r border-gray-100 ${
                        editing ? 'bg-blue-50 p-1' : 'hover:bg-blue-50 cursor-pointer'
                      }`}
                      onClick={() => !editing && openCell(h.id, b.id)}
                    >
                      {editing ? (
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-gray-400 text-xs">$</span>
                          <input
                            autoFocus
                            type="number"
                            min={0}
                            step={0.01}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveCell();
                              if (e.key === 'Escape') setEditCell(null);
                            }}
                            className="w-24 border rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={saveCell}
                            disabled={!editValue || Number(editValue) <= 0 || saveMut.isPending}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            {saveMut.isPending ? '…' : '✓'}
                          </button>
                          <button
                            onClick={() => setEditCell(null)}
                            className="px-1 py-1 text-xs text-gray-400 hover:text-gray-700"
                          >
                            ✕
                          </button>
                        </div>
                      ) : precio != null ? (
                        <span className="text-gray-900 font-medium">${fmt(precio)}</span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  );
                })}
                {addingBanda && (
                  <td className="px-3 py-2 bg-blue-50 border-r border-gray-100" />
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="text-xs text-gray-400 px-4 py-2">
        Clic en una celda para ingresar o actualizar el precio. Fecha de vigencia: hoy.
      </p>
    </div>
  );
}

// ─── PreciosTab ───────────────────────────────────────────────────────────────

export function PreciosTab() {
  const { data: cultivos = [], isLoading } = useQuery({
    queryKey: ['cultivos'],
    queryFn: () => productosApi.getCultivos(true),
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner /></div>;
  }

  if (cultivos.length === 0) {
    return <p className="text-center py-8 text-gray-400 text-sm">Sin cultivos activos.</p>;
  }

  return (
    <div className="space-y-8">
      {cultivos.map((cultivo) => (
        <CultivoTable key={cultivo.id} cultivo={cultivo} />
      ))}
    </div>
  );
}
