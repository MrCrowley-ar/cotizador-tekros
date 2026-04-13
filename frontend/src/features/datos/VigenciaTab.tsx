import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productosApi } from '../../api/productos';
import { vigenciasApi } from '../../api/vigencias';
import { Spinner } from '../../components/Spinner';
import type { Cultivo, Vigencia } from '../../api/types';

type Modo = 'global' | 'cultivo';

const toInputDate = (iso: string | null | undefined): string =>
  iso ? iso.substring(0, 10) : '';

// Formatea YYYY-MM-DD a DD/MM/YYYY local (sin shift de TZ).
const fmtFechaUI = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const [y, m, d] = iso.substring(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '—';
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
};

export function VigenciaTab() {
  const qc = useQueryClient();

  const { data: cultivos = [], isLoading: loadingCultivos } = useQuery({
    queryKey: ['cultivos'],
    queryFn: () => productosApi.getCultivos(false),
  });

  const { data: vigencias = [], isLoading: loadingVigencias, dataUpdatedAt } = useQuery({
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
  const [justSaved, setJustSaved] = useState<boolean>(false);

  // Sync when server data arrives/changes
  useEffect(() => {
    setModo(inferredModo);
    setFechaGlobal(toInputDate(globalVigencia?.fechaVigencia));
    setFechasCultivo(porCultivoMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vigencias]);

  // Auto-hide "guardado" message after 3s
  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 3000);
    return () => clearTimeout(t);
  }, [justSaved]);

  const handleSaveSuccess = () => {
    setError('');
    setJustSaved(true);
    qc.invalidateQueries({ queryKey: ['vigencias'] });
  };

  const setGlobalMut = useMutation({
    mutationFn: (fecha: string) => vigenciasApi.setGlobal(fecha),
    onSuccess: handleSaveSuccess,
    onError: (e: any) => setError(e?.message ?? 'Error al guardar'),
  });

  const setPorCultivoMut = useMutation({
    mutationFn: (items: Array<{ cultivoId: number; fechaVigencia: string }>) =>
      vigenciasApi.setPorCultivo(items),
    onSuccess: handleSaveSuccess,
    onError: (e: any) => setError(e?.message ?? 'Error al guardar'),
  });

  const isLoading = loadingCultivos || loadingVigencias;
  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  const canSaveGlobal = !!fechaGlobal;
  const canSaveCultivo = cultivos.some((c) => !!fechasCultivo[c.id]);

  // ¿Hay cambios sin guardar respecto al servidor?
  const globalDirty = toInputDate(globalVigencia?.fechaVigencia) !== fechaGlobal;
  const cultivoDirty = cultivos.some(
    (c) => (porCultivoMap[c.id] ?? '') !== (fechasCultivo[c.id] ?? ''),
  );

  // Resumen de lo guardado actualmente en el servidor
  const savedSummary: { tipo: 'vacio' | 'global' | 'cultivo'; texto: string } = (() => {
    if (globalVigencia) {
      return {
        tipo: 'global',
        texto: `Global · ${fmtFechaUI(globalVigencia.fechaVigencia)}`,
      };
    }
    const keys = Object.keys(porCultivoMap);
    if (keys.length > 0) {
      return {
        tipo: 'cultivo',
        texto: `Por cultivo · ${keys.length} cultivo(s) con fecha`,
      };
    }
    return { tipo: 'vacio', texto: 'Sin vigencia configurada' };
  })();

  // hora de la última sincronización con el server (formato HH:MM:SS)
  const lastSyncTime = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('es-AR')
    : '—';

  return (
    <div className="space-y-4">
      {/* ── Estado guardado en el servidor (siempre visible) ────────── */}
      <div
        className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${
          savedSummary.tipo === 'vacio'
            ? 'bg-gray-50 border-gray-200'
            : 'bg-emerald-50 border-emerald-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`text-2xl leading-none ${
              savedSummary.tipo === 'vacio' ? 'text-gray-400' : 'text-emerald-600'
            }`}
          >
            {savedSummary.tipo === 'vacio' ? '○' : '✓'}
          </div>
          <div>
            <div className="text-xs text-gray-500">Vigencia guardada en el servidor</div>
            <div
              className={`text-sm font-semibold ${
                savedSummary.tipo === 'vacio' ? 'text-gray-500' : 'text-emerald-800'
              }`}
            >
              {savedSummary.texto}
            </div>
            {savedSummary.tipo === 'cultivo' && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {cultivos
                  .filter((c) => porCultivoMap[c.id])
                  .map((c) => (
                    <span
                      key={c.id}
                      className="text-xs bg-white border border-emerald-200 rounded px-2 py-0.5 text-emerald-800"
                    >
                      {c.nombre}: <strong>{fmtFechaUI(porCultivoMap[c.id])}</strong>
                    </span>
                  ))}
              </div>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] text-gray-400 uppercase">Última sync</div>
          <div className="text-xs text-gray-500 font-mono">{lastSyncTime}</div>
        </div>
      </div>

      {/* ── Toast de "guardado correctamente" ───────────────────────── */}
      {justSaved && (
        <div className="rounded-lg bg-emerald-600 text-white px-4 py-2.5 text-sm font-medium flex items-center gap-2 shadow-sm">
          <span className="text-lg leading-none">✓</span>
          Guardado correctamente
        </div>
      )}

      {/* ── Form ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-1">Configurar vigencia de cotizaciones</h2>
          <p className="text-xs text-gray-500">
            Esta fecha se toma por defecto al crear una cotización. Podés configurarla global (una sola
            fecha para todos los cultivos) o por cada cultivo individualmente.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2 mb-4 flex items-center gap-2">
            <span className="text-base">✕</span>
            {error}
          </p>
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
          <div>
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
                className={`px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 transition-colors ${
                  justSaved && !globalDirty
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {setGlobalMut.isPending
                  ? 'Guardando…'
                  : justSaved && !globalDirty
                    ? '✓ Guardado'
                    : 'Guardar'}
              </button>
            </div>
            {globalDirty && !setGlobalMut.isPending && (
              <p className="text-xs text-amber-700 mt-2">Hay cambios sin guardar.</p>
            )}
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
                  {cultivos.map((c: Cultivo) => {
                    const savedVal = porCultivoMap[c.id] ?? '';
                    const currentVal = fechasCultivo[c.id] ?? '';
                    const isSaved = !!savedVal && savedVal === currentVal;
                    return (
                      <div key={c.id} className="flex items-center gap-3">
                        <div className="flex-1 text-sm text-gray-800">{c.nombre}</div>
                        <input
                          type="date"
                          value={currentVal}
                          onChange={(e) =>
                            setFechasCultivo((prev) => ({ ...prev, [c.id]: e.target.value }))
                          }
                          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="w-5 text-center text-emerald-600" title={isSaved ? 'Guardado' : ''}>
                          {isSaved ? '✓' : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-4">
                  {cultivoDirty && !setPorCultivoMut.isPending ? (
                    <p className="text-xs text-amber-700">Hay cambios sin guardar.</p>
                  ) : (
                    <span />
                  )}
                  <button
                    disabled={!canSaveCultivo || setPorCultivoMut.isPending}
                    onClick={() => {
                      const items = cultivos
                        .filter((c) => !!fechasCultivo[c.id])
                        .map((c) => ({ cultivoId: c.id, fechaVigencia: fechasCultivo[c.id] }));
                      setPorCultivoMut.mutate(items);
                    }}
                    className={`px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 transition-colors ${
                      justSaved && !cultivoDirty
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {setPorCultivoMut.isPending
                      ? 'Guardando…'
                      : justSaved && !cultivoDirty
                        ? '✓ Guardado'
                        : 'Guardar'}
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
