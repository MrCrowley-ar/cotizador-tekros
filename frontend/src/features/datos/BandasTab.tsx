import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productosApi } from '../../api/productos';
import { Modal } from '../../components/Modal';
import { Spinner } from '../../components/Spinner';
import { Badge } from '../../components/Badge';
import type { Banda } from '../../api/types';

function BandaModal({ banda, onClose }: { banda?: Banda; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: cultivos = [] } = useQuery({
    queryKey: ['cultivos'],
    queryFn: () => productosApi.getCultivos(false),
  });
  const [nombre, setNombre] = useState(banda?.nombre ?? '');
  const [cultivoId, setCultivoId] = useState<number>(banda?.cultivoId ?? 0);
  const [error, setError] = useState('');

  const createMut = useMutation({
    mutationFn: () => productosApi.createBanda({ cultivoId, nombre }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bandas'] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });
  const updateMut = useMutation({
    mutationFn: (activa: boolean) => productosApi.updateBanda(banda!.id, { nombre, activa }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bandas'] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  const isPending = createMut.isPending || updateMut.isPending;
  const canSave = nombre.trim() && (banda || cultivoId > 0);

  return (
    <Modal title={banda ? 'Editar banda' : 'Nueva banda'} onClose={onClose}>
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
        {!banda && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cultivo</label>
            <select
              value={cultivoId}
              onChange={(e) => setCultivoId(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>Seleccionar cultivo...</option>
              {cultivos.filter((c) => c.activo).map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
          <input
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancelar
          </button>
          {banda && (
            <button
              disabled={isPending}
              onClick={() => updateMut.mutate(!banda.activa)}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {banda.activa ? 'Desactivar' : 'Activar'}
            </button>
          )}
          <button
            disabled={!canSave || isPending}
            onClick={() => banda ? updateMut.mutate(banda.activa) : createMut.mutate()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function BandasTab() {
  const [modal, setModal] = useState<'new' | Banda | null>(null);
  const [cultivoFilter, setCultivoFilter] = useState<number>(0);

  const { data: cultivos = [] } = useQuery({
    queryKey: ['cultivos'],
    queryFn: () => productosApi.getCultivos(false),
  });

  const { data: bandas = [], isLoading } = useQuery({
    queryKey: ['bandas', cultivoFilter],
    queryFn: () =>
      cultivoFilter > 0
        ? productosApi.getBandas(cultivoFilter, false)
        : Promise.resolve([] as Banda[]),
    enabled: cultivoFilter > 0,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <select
          value={cultivoFilter}
          onChange={(e) => setCultivoFilter(Number(e.target.value))}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={0}>Seleccionar cultivo para ver bandas...</option>
          {cultivos.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        <button
          onClick={() => setModal('new')}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Nueva banda
        </button>
      </div>

      {cultivoFilter === 0 ? (
        <p className="text-center py-8 text-gray-400 text-sm">Seleccioná un cultivo para ver sus bandas.</p>
      ) : isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bandas.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => setModal(b)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{b.nombre}</td>
                  <td className="px-4 py-3">
                    <Badge label={b.activa ? 'activa' : 'inactiva'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {bandas.length === 0 && (
            <p className="text-center py-8 text-gray-400 text-sm">Sin bandas para este cultivo.</p>
          )}
        </div>
      )}

      {modal === 'new' && <BandaModal onClose={() => setModal(null)} />}
      {modal && modal !== 'new' && (
        <BandaModal banda={modal as Banda} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
