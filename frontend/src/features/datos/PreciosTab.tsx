import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productosApi } from '../../api/productos';
import { preciosApi } from '../../api/precios';
import { Modal } from '../../components/Modal';
import { Spinner } from '../../components/Spinner';

function NuevoPrecioModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [hibridoId, setHibridoId] = useState<number>(0);
  const [bandaId, setBandaId] = useState<number>(0);
  const [cultivoId, setCultivoId] = useState<number>(0);
  const [precio, setPrecio] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

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

  const createMut = useMutation({
    mutationFn: () =>
      preciosApi.registrar({ hibridoId, bandaId, precio: Number(precio), fecha }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['precios'] });
      onClose();
    },
    onError: (e: any) => setError(e.message),
  });

  const canSave = hibridoId > 0 && bandaId > 0 && precio && fecha;

  return (
    <Modal title="Registrar precio" onClose={onClose}>
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cultivo</label>
          <select
            value={cultivoId}
            onChange={(e) => { setCultivoId(Number(e.target.value)); setHibridoId(0); setBandaId(0); }}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={0}>Seleccionar cultivo...</option>
            {cultivos.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Híbrido</label>
          <select
            value={hibridoId}
            onChange={(e) => setHibridoId(Number(e.target.value))}
            disabled={cultivoId === 0}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          >
            <option value={0}>Seleccionar híbrido...</option>
            {hibridos.map((h) => (
              <option key={h.id} value={h.id}>{h.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Banda</label>
          <select
            value={bandaId}
            onChange={(e) => setBandaId(Number(e.target.value))}
            disabled={cultivoId === 0}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          >
            <option value={0}>Seleccionar banda...</option>
            {bandas.map((b) => (
              <option key={b.id} value={b.id}>{b.nombre}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio ($)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha vigencia</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancelar
          </button>
          <button
            disabled={!canSave || createMut.isPending}
            onClick={() => createMut.mutate()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {createMut.isPending ? 'Registrando…' : 'Registrar precio'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function PreciosTab() {
  const [showModal, setShowModal] = useState(false);
  const [cultivoId, setCultivoId] = useState<number>(0);
  const [hibridoId, setHibridoId] = useState<number>(0);
  const [bandaId, setBandaId] = useState<number>(0);

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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <select
            value={cultivoId}
            onChange={(e) => { setCultivoId(Number(e.target.value)); setHibridoId(0); setBandaId(0); }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={0}>Cultivo...</option>
            {cultivos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select
            value={hibridoId}
            onChange={(e) => setHibridoId(Number(e.target.value))}
            disabled={cultivoId === 0}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          >
            <option value={0}>Híbrido...</option>
            {hibridos.map((h) => <option key={h.id} value={h.id}>{h.nombre}</option>)}
          </select>
          <select
            value={bandaId}
            onChange={(e) => setBandaId(Number(e.target.value))}
            disabled={cultivoId === 0}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          >
            <option value={0}>Banda...</option>
            {bandas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Registrar precio
        </button>
      </div>

      {hibridoId === 0 || bandaId === 0 ? (
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
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-right px-4 py-3">Precio</th>
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
                </tr>
              ))}
            </tbody>
          </table>
          {historico.length === 0 && (
            <p className="text-center py-8 text-gray-400 text-sm">Sin precios registrados.</p>
          )}
        </div>
      )}

      {showModal && <NuevoPrecioModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
