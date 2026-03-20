import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productosApi } from '../../api/productos';
import { preciosApi } from '../../api/precios';
import { Spinner } from '../../components/Spinner';

export function PreciosTab() {
  const [cultivoId, setCultivoId] = useState<number>(0);
  const [hibridoId, setHibridoId] = useState<number>(0);
  const [bandaId, setBandaId] = useState<number>(0);
  const [addingNew, setAddingNew] = useState(false);
  const [newPrecio, setNewPrecio] = useState('');
  const [newFecha, setNewFecha] = useState(new Date().toISOString().split('T')[0]);

  const qc = useQueryClient();

  const { data: cultivos = [] } = useQuery({
    queryKey: ['cultivos'],
    queryFn: () => productosApi.getCultivos(true),
  });
  const { data: hibridos = [] } = useQuery({
    queryKey: ['hibridos', cultivoId],
    queryFn: () => productosApi.getHibridos(cultivoId, true),
    enabled: cultivoId > 0,
  });
  const { data: bandas = [] } = useQuery({
    queryKey: ['bandas', cultivoId],
    queryFn: () => productosApi.getBandas(cultivoId, true),
    enabled: cultivoId > 0,
  });
  const { data: historico = [], isLoading } = useQuery({
    queryKey: ['precios', hibridoId, bandaId],
    queryFn: () => preciosApi.getHistorico(hibridoId, bandaId),
    enabled: hibridoId > 0 && bandaId > 0,
  });

  const createMut = useMutation({
    mutationFn: () =>
      preciosApi.registrar({ hibridoId, bandaId, precio: Number(newPrecio), fecha: newFecha }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['precios'] });
      setAddingNew(false);
      setNewPrecio('');
      setNewFecha(new Date().toISOString().split('T')[0]);
    },
  });

  const canSave = newPrecio && Number(newPrecio) > 0 && newFecha;

  const startNew = () => {
    setNewPrecio('');
    setNewFecha(new Date().toISOString().split('T')[0]);
    setAddingNew(true);
  };

  const cancel = () => setAddingNew(false);

  const filterReady = hibridoId > 0 && bandaId > 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <select
          value={cultivoId}
          onChange={(e) => { setCultivoId(Number(e.target.value)); setHibridoId(0); setBandaId(0); setAddingNew(false); }}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={0}>Cultivo...</option>
          {cultivos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select
          value={hibridoId}
          onChange={(e) => { setHibridoId(Number(e.target.value)); setAddingNew(false); }}
          disabled={cultivoId === 0}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
        >
          <option value={0}>Híbrido...</option>
          {hibridos.map((h) => <option key={h.id} value={h.id}>{h.nombre}</option>)}
        </select>
        <select
          value={bandaId}
          onChange={(e) => { setBandaId(Number(e.target.value)); setAddingNew(false); }}
          disabled={cultivoId === 0}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
        >
          <option value={0}>Banda...</option>
          {bandas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
        </select>
      </div>

      {!filterReady ? (
        <p className="text-center py-8 text-gray-400 text-sm">
          Seleccioná híbrido y banda para ver el historial de precios.
        </p>
      ) : isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Fecha vigencia</th>
                <th className="text-right px-4 py-3">Precio</th>
                <th className="px-4 py-3 w-32" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {historico.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-gray-700">
                    {new Date(p.fecha).toLocaleDateString('es-AR')}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    ${Number(p.precio).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </td>
                  <td />
                </tr>
              ))}

              {addingNew ? (
                <tr className="bg-green-50">
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={newFecha}
                      onChange={(e) => setNewFecha(e.target.value)}
                      className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-gray-500 text-sm">$</span>
                      <input
                        autoFocus
                        type="number"
                        min={0}
                        step={0.01}
                        value={newPrecio}
                        onChange={(e) => setNewPrecio(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && canSave) createMut.mutate();
                          if (e.key === 'Escape') cancel();
                        }}
                        placeholder="0.00"
                        className="w-28 border rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 justify-end items-center">
                      <button
                        onClick={() => { if (canSave) createMut.mutate(); }}
                        disabled={!canSave || createMut.isPending}
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
                  <td colSpan={3} className="px-4 py-2 text-sm text-blue-500 font-medium">
                    + Registrar precio
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
