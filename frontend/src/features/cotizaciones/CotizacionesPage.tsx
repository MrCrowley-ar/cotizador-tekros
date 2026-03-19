import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cotizacionesApi } from '../../api/cotizaciones';
import { clientesApi } from '../../api/clientes';
import { Layout } from '../../components/Layout';
import { Modal } from '../../components/Modal';
import { Badge } from '../../components/Badge';
import { Spinner } from '../../components/Spinner';
import type { Cliente } from '../../api/types';

function NuevaCotizacionModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Cliente | null>(null);

  const { data: clientes = [], isFetching } = useQuery({
    queryKey: ['clientes', search],
    queryFn: () => clientesApi.getAll(search || undefined),
    enabled: search.length >= 1 || search.length === 0,
  });

  const createMut = useMutation({
    mutationFn: (clienteId: number) => cotizacionesApi.create(clienteId),
    onSuccess: (cot) => {
      qc.invalidateQueries({ queryKey: ['cotizaciones'] });
      navigate(`/cotizaciones/${cot.id}`);
    },
  });

  return (
    <Modal title="Nueva cotización" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
          <input
            autoFocus
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
            placeholder="Buscar por nombre o CUIT..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {isFetching && <div className="mt-1"><Spinner /></div>}
          {!selected && clientes.length > 0 && (
            <ul className="border rounded-lg mt-1 max-h-40 overflow-y-auto divide-y">
              {clientes.map((c) => (
                <li
                  key={c.id}
                  onClick={() => { setSelected(c); setSearch(c.nombre); }}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50"
                >
                  <span className="font-medium">{c.nombre}</span>
                  <span className="text-gray-400 ml-2 text-xs">{c.cuit}</span>
                </li>
              ))}
            </ul>
          )}
          {selected && (
            <div className="mt-1 text-xs text-green-700 bg-green-50 rounded px-2 py-1">
              ✓ {selected.nombre} — {selected.cuit}
            </div>
          )}
        </div>
        {createMut.isError && (
          <p className="text-sm text-red-600">{(createMut.error as Error).message}</p>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancelar
          </button>
          <button
            disabled={!selected || createMut.isPending}
            onClick={() => selected && createMut.mutate(selected.id)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {createMut.isPending ? 'Creando…' : 'Crear cotización'}
          </button>
        </div>
      </div>
    </Modal>
  );
}


export function CotizacionesPage() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const { data: cotizaciones = [], isLoading } = useQuery({
    queryKey: ['cotizaciones'],
    queryFn: cotizacionesApi.getAll,
  });

  return (
    <Layout title="Cotizaciones">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Cotizaciones</h1>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Nueva cotización
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner className="w-6 h-6" /></div>
        ) : cotizaciones.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">📄</p>
            <p>Sin cotizaciones aún. Creá la primera.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Número</th>
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-left px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cotizaciones.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/cotizaciones/${c.id}`)}
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-medium text-blue-700">{c.numero}</td>
                    <td className="px-4 py-3 text-gray-800">{c.cliente?.nombre ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(c.fechaCreacion).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {c.versiones?.[0]?.total != null
                        ? `$${Number(c.versiones[0].total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={c.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showModal && <NuevaCotizacionModal onClose={() => setShowModal(false)} />}
    </Layout>
  );
}
