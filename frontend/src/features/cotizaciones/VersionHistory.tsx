import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cotizacionesApi } from '../../api/cotizaciones';
import { Spinner } from '../../components/Spinner';
import type { CotizacionVersion } from '../../api/types';

interface Props {
  cotizacionId: number;
  currentVersionId: number;
  onSelect: (v: CotizacionVersion) => void;
}

export function VersionHistory({ cotizacionId, currentVersionId, onSelect }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const { data: versiones = [], isLoading } = useQuery({
    queryKey: ['versiones', cotizacionId],
    queryFn: () => cotizacionesApi.getVersiones(cotizacionId),
  });

  const deleteMut = useMutation({
    mutationFn: (vid: number) => cotizacionesApi.deleteVersion(cotizacionId, vid),
    onSuccess: (_data, deletedVid) => {
      qc.invalidateQueries({ queryKey: ['versiones', cotizacionId] });
      // If the deleted version was selected, switch to the latest remaining
      if (deletedVid === currentVersionId) {
        const remaining = versiones.filter((v) => v.id !== deletedVid);
        if (remaining.length > 0) onSelect(remaining[0]);
      }
      setError('');
    },
    onError: (e: any) => {
      setError(e.message ?? 'Error al eliminar');
    },
  });

  if (isLoading) return <Spinner />;

  const filtered = versiones.filter((v) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const label = `v${v.version} ${v.nombre ?? ''}`.toLowerCase();
    return label.includes(q);
  });

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{error}</p>
      )}

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar versión..."
        className="w-full text-xs border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />

      <div className="space-y-1">
        {filtered.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">Sin resultados</p>
        )}
        {filtered.map((v) => {
          const isCurrent = v.id === currentVersionId;
          const canDelete = versiones.length > 1;
          return (
            <div
              key={v.id}
              className={`group flex items-center gap-1 rounded-lg transition-colors ${
                isCurrent ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <button
                onClick={() => onSelect(v)}
                className="flex-1 text-left px-3 py-2 text-sm"
              >
                <div className="font-medium">
                  v{v.version}
                  {v.nombre && (
                    <span className={`ml-1.5 font-normal ${isCurrent ? 'text-blue-200' : 'text-gray-500'}`}>
                      — {v.nombre}
                    </span>
                  )}
                </div>
                <div className={`text-xs ${isCurrent ? 'text-blue-200' : 'text-gray-400'}`}>
                  {new Date(v.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                  {v.usuario && ` · ${v.usuario.nombre}`}
                </div>
              </button>
              {canDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`¿Eliminar versión ${v.version}${v.nombre ? ` (${v.nombre})` : ''}?`)) {
                      deleteMut.mutate(v.id);
                    }
                  }}
                  disabled={deleteMut.isPending}
                  className={`shrink-0 w-6 h-6 mr-1.5 flex items-center justify-center rounded-full text-xs font-bold transition-all
                    ${isCurrent
                      ? 'opacity-50 hover:opacity-100 hover:bg-blue-500 text-blue-200'
                      : 'opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 text-gray-400'
                    }`}
                  title="Eliminar versión"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
