import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientesApi } from '../../api/clientes';
import { Modal } from '../../components/Modal';
import { Spinner } from '../../components/Spinner';
import { Badge } from '../../components/Badge';
import type { Cliente } from '../../api/types';

function ClienteModal({ cliente, onClose }: { cliente?: Cliente; onClose: () => void }) {
  const qc = useQueryClient();
  const [nombre, setNombre] = useState(cliente?.nombre ?? '');
  const [cuit, setCuit] = useState(cliente?.cuit ?? '');
  const [direccion, setDireccion] = useState(cliente?.direccion ?? '');
  const [telefono, setTelefono] = useState(cliente?.telefono ?? '');
  const [email, setEmail] = useState(cliente?.email ?? '');
  const [error, setError] = useState('');

  const createMut = useMutation({
    mutationFn: () => clientesApi.create({ nombre, cuit, direccion, telefono, email }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clientes'] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });
  const updateMut = useMutation({
    mutationFn: (activo: boolean) =>
      clientesApi.update(cliente!.id, { nombre, cuit, direccion, telefono, email, activo }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clientes'] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Modal title={cliente ? 'Editar cliente' : 'Nuevo cliente'} onClose={onClose}>
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CUIT *</label>
            <input
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
              placeholder="20-12345678-9"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
          <input
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancelar
          </button>
          {cliente && (
            <button
              disabled={isPending}
              onClick={() => updateMut.mutate(!cliente.activo)}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {cliente.activo ? 'Desactivar' : 'Activar'}
            </button>
          )}
          <button
            disabled={!nombre.trim() || !cuit.trim() || isPending}
            onClick={() => cliente ? updateMut.mutate(cliente.activo) : createMut.mutate()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function ClientesTab() {
  const [modal, setModal] = useState<'new' | Cliente | null>(null);
  const [search, setSearch] = useState('');
  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes', search],
    queryFn: () => clientesApi.getAll(search || undefined),
  });

  if (isLoading && !search) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o CUIT..."
          className="border rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => setModal('new')}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Nuevo cliente
        </button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">CUIT</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clientes.map((c) => (
              <tr
                key={c.id}
                onClick={() => setModal(c)}
                className="hover:bg-blue-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-medium text-gray-900">{c.nombre}</td>
                <td className="px-4 py-3 font-mono text-gray-600 text-xs">{c.cuit}</td>
                <td className="px-4 py-3 text-gray-500">{c.email ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge label={c.activo ? 'activo' : 'inactivo'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {clientes.length === 0 && (
          <p className="text-center py-8 text-gray-400 text-sm">
            {search ? 'Sin resultados.' : 'Sin clientes aún.'}
          </p>
        )}
      </div>

      {modal === 'new' && <ClienteModal onClose={() => setModal(null)} />}
      {modal && modal !== 'new' && (
        <ClienteModal cliente={modal as Cliente} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
