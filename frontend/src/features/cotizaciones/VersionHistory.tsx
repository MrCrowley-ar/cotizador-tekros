import { useQuery } from '@tanstack/react-query';
import { cotizacionesApi } from '../../api/cotizaciones';
import { Spinner } from '../../components/Spinner';
import type { CotizacionVersion } from '../../api/types';

interface Props {
  cotizacionId: number;
  currentVersionId: number;
  onSelect: (v: CotizacionVersion) => void;
}

export function VersionHistory({ cotizacionId, currentVersionId, onSelect }: Props) {
  const { data: versiones = [], isLoading } = useQuery({
    queryKey: ['versiones', cotizacionId],
    queryFn: () => cotizacionesApi.getVersiones(cotizacionId),
  });

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-1">
      {versiones.map((v) => (
        <button
          key={v.id}
          onClick={() => onSelect(v)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
            v.id === currentVersionId
              ? 'bg-blue-600 text-white'
              : 'hover:bg-gray-100 text-gray-700'
          }`}
        >
          <div className="font-medium">Versión {v.version}</div>
          <div className={`text-xs ${v.id === currentVersionId ? 'text-blue-200' : 'text-gray-400'}`}>
            {new Date(v.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
            {v.usuario && ` · ${v.usuario.nombre}`}
          </div>
        </button>
      ))}
    </div>
  );
}
