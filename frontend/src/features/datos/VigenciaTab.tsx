import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productosApi } from '../../api/productos';
import { vigenciasApi } from '../../api/vigencias';
import { Spinner } from '../../components/Spinner';
import type { Cultivo, Vigencia } from '../../api/types';

type Modo = 'global' | 'cultivo';

const toInputDate = (iso: string | null | undefined): string =>
  iso ? iso.substring(0, 10) : '';

export function VigenciaTab() {
  const qc = useQueryClient();

  const { data: cultivos = [], isLoading: loadingCultivos } = useQuery({
    queryKey: ['cultivos'],
    queryFn: () => productosApi.getCultivos(false),
  });

  const { data: vigencias = [], isLoading: loadingVigencias } = useQuery({
    queryKey: ['vigencias'],
    queryFn: () => vigenciasApi.getAll(),
  });

  const globalVigencia: Vigencia | undefined = useMemo(
    () => vigencias.find((v) => v.cultivoId == null),
    [vigencias],
  );
  const porCultivoMap: Record<number, string> = useMemo(() => {
    const map: Record<number, string> = {};
    for (const v of vigencias) {
      if (v.cultivoId != null) map[v.cultivoId] = toInputDate(v.fechaVigencia);
    }
    return map;
  }, [vigencias]);

  const inferredModo: Modo =
    globalVigencia ? 'global' : Object.keys(porCultivoMap).length > 0 ? 'cultivo' : 'global';

  const [modo, setModo] = useState<Modo>(inferredModo);
  const [fechaGlobal, setFechaGlobal] = useState<string>(toInputDate(globalVigencia?.fechaVigencia));
  const [fechasCultivo, setFechasCultivo] = useState<Record<number, string>>(porCultivoMap);
  const [error, setError] = useState<string>('');

  // Sync when server data arrives/changes
  useEffect(() => {
    setModo(inferredModo);
    setFechaGlobal(toInputDate(globalVigencia?.fechaVigencia));
    setFechasCultivo(porCultivoMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vigencias]);

  const setGlobalMut = useMutation({
    mutationFn: (fecha: string) => vigenciasApi.setGlobal(fecha),
    onSuccess: () => {
      setError('');
      qc.invalidateQueries({ queryKey: ['vigencias'] });
    },
    onError: (e: any) => setError(e?.message ?? 'Error al guardar'),
  });

  const setPorCultivoMut = useMutation({
    mutationFn: (items: Array<{ cultivoId: number; fechaVigencia: string }>) =>
      vigenciasApi.setPorCultivo(items),
    onSuccess: () => {
      setError('');
      qc.invalidateQueries({ queryKey: ['vigencias'] });
    },
    onError: (e: any) => setError(e?.message ?? 'Error al guardar'),
  });

  const isLoading = loadingCultivos || loadingVigencias;
  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  const canSaveGlobal = !!fechaGlobal;
  const canSaveCultivo = cultivos.some((c) => !!fechasCultivo[c.id]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-1">Vigencia de cotizaciones</h2>
          <p className="text-xs text-gray-500">
            Esta fecha se toma por defecto al crear una cotización. Podés configurarla global (una sola fecha
            para todos los cultivos) o por cada cultivo individualmente.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2 mb-4">{error}</p>
        )}

        {/* Modo toggle */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <button
            type="button"
            onClick={() => setModo('global')}
            className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
              modo === 'global'
                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className={`text-sm font-medium ${modo === 'global' ? 'text-blue-700' : 'text-gray-800'}`}>
              Global
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Una sola fecha para todos los cultivos</div>
          </button>
          <button
            type="button"
            onClick={() => setModo('cultivo')}
            className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
              modo === 'cultivo'
                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className={`text-sm font-medium ${modo === 'cultivo' ? 'text-blue-700' : 'text-gray-800'}`}>
              Por cultivo
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Una fecha por cada uno de los {cultivos.length} cultivo(s)
            </div>
          </button>
        </div>

        {/* Modo global */}
        {modo === 'global' && (
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-xs">
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de vigencia *</label>
              <input
                type="date"
                value={fechaGlobal}
                onChange={(e) => setFechaGlobal(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              disabled={!canSaveGlobal || setGlobalMut.isPending}
              onClick={() => setGlobalMut.mutate(fechaGlobal)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {setGlobalMut.isPending ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        )}

        {/* Modo por cultivo */}
        {modo === 'cultivo' && (
          <div>
            {cultivos.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No hay cultivos configurados.</p>
            ) : (
              <>
                <div className="space-y-2">
                  {cultivos.map((c: Cultivo) => (
                    <div key={c.id} className="flex items-center gap-3">
                      <div className="flex-1 text-sm text-gray-800">{c.nombre}</div>
                      <input
                        type="date"
                        value={fechasCultivo[c.id] ?? ''}
                        onChange={(e) =>
                          setFechasCultivo((prev) => ({ ...prev, [c.id]: e.target.value }))
                        }
                        className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-4">
                  <button
                    disabled={!canSaveCultivo || setPorCultivoMut.isPending}
                    onClick={() => {
                      const items = cultivos
                        .filter((c) => !!fechasCultivo[c.id])
                        .map((c) => ({ cultivoId: c.id, fechaVigencia: fechasCultivo[c.id] }));
                      setPorCultivoMut.mutate(items);
                    }}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {setPorCultivoMut.isPending ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
