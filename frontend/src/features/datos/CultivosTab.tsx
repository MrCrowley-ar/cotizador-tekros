import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productosApi } from '../../api/productos';
import { Modal } from '../../components/Modal';
import { Spinner } from '../../components/Spinner';
import { Badge } from '../../components/Badge';
import type { Cultivo } from '../../api/types';

function CultivoModal({ cultivo, onClose }: { cultivo?: Cultivo; onClose: () => void }) {
  const qc = useQueryClient();
  const [nombre, setNombre] = useState(cultivo?.nombre ?? '');
  const [error, setError] = useState('');

  const createMut = useMutation({
    mutationFn: () => productosApi.createCultivo(nombre),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cultivos'] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });
  const updateMut = useMutation({
    mutationFn: (activo: boolean) => productosApi.updateCultivo(cultivo!.id, { nombre, activo }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cultivos'] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Modal title={cultivo ? 'Editar cultivo' : 'Nuevo cultivo'} onClose={onClose}>
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
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
          {cultivo && (
            <button
              disabled={isPending}
              onClick={() => updateMut.mutate(!cultivo.activo)}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {cultivo.activo ? 'Desactivar' : 'Activar'}
            </button>
          )}
          <button
            disabled={!nombre.trim() || isPending}
            onClick={() => cultivo ? updateMut.mutate(cultivo.activo) : createMut.mutate()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function CultivosTab() {
  const [modal, setModal] = useState<'new' | Cultivo | null>(null);
  const { data: cultivos = [], isLoading } = useQuery({
    queryKey: ['cultivos'],
    queryFn: () => productosApi.getCultivos(false),
  });

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setModal('new')}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Nuevo cultivo
        </button>
      </div>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cultivos.map((c) => (
              <tr
                key={c.id}
                onClick={() => setModal(c)}
                className="hover:bg-blue-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-medium text-gray-900">{c.nombre}</td>
                <td className="px-4 py-3">
                  <Badge label={c.activo ? 'activo' : 'inactivo'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cultivos.length === 0 && (
          <p className="text-center py-8 text-gray-400 text-sm">Sin cultivos aún.</p>
        )}
      </div>
      {modal === 'new' && <CultivoModal onClose={() => setModal(null)} />}
      {modal && modal !== 'new' && (
        <CultivoModal cultivo={modal as Cultivo} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
