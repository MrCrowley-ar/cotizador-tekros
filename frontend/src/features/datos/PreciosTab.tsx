import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productosApi } from '../../api/productos';
import { preciosApi } from '../../api/precios';
import { Spinner } from '../../components/Spinner';

export function PreciosTab() {
  const [cultivoId, setCultivoId] = useState<number>(0);
  const [editCell, setEditCell] = useState<{ hibridoId: number; bandaId: number } | null>(null);
  const [editValue, setEditValue] = useState('');

  const qc = useQueryClient();

  const { data: cultivos = [] } = useQuery({
    queryKey: ['cultivos'],
    queryFn: () => productosApi.getCultivos(true),
  });
  const { data: hibridos = [] } = useQuery({
    queryKey: ['hibridos', cultivoId],
    queryFn: () => productosApi.getHibridos(cultivoId, false),
    enabled: cultivoId > 0,
  });
  const { data: bandas = [] } = useQuery({
    queryKey: ['bandas', cultivoId],
    queryFn: () => productosApi.getBandas(cultivoId, false),
    enabled: cultivoId > 0,
  });
  const { data: matriz = [], isLoading: loadingMatriz } = useQuery({
    queryKey: ['precios-matriz', cultivoId],
    queryFn: () => preciosApi.getMatriz(cultivoId),
    enabled: cultivoId > 0,
  });

  // Build a fast lookup map: "hibridoId-bandaId" → precio
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
      qc.invalidateQueries({ queryKey: ['precios-matriz', cultivoId] });
      setEditCell(null);
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

  return (
    <div>
      <div className="mb-4">
        <select
          value={cultivoId}
          onChange={(e) => { setCultivoId(Number(e.target.value)); setEditCell(null); }}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={0}>Seleccionar cultivo...</option>
          {cultivos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      {cultivoId === 0 ? (
        <p className="text-center py-8 text-gray-400 text-sm">Seleccioná un cultivo para ver la tabla de precios.</p>
      ) : loadingMatriz ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : hibridos.length === 0 || bandas.length === 0 ? (
        <p className="text-center py-8 text-gray-400 text-sm">
          {hibridos.length === 0 ? 'Sin híbridos' : 'Sin bandas'} para este cultivo.
        </p>
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="text-sm border-collapse w-full">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 border-b border-r border-gray-200 whitespace-nowrap">
                  Híbrido
                </th>
                {bandas.map((b) => (
                  <th key={b.id} className="text-center px-4 py-3 border-b border-r border-gray-200 whitespace-nowrap font-medium">
                    {b.nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hibridos.map((h) => (
                <tr key={h.id} className="border-b border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-900 border-r border-gray-200 whitespace-nowrap bg-gray-50">
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
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 px-4 py-2">
            Clic en cualquier celda para ingresar o actualizar el precio. Fecha de vigencia: hoy.
          </p>
        </div>
      )}
    </div>
  );
}
