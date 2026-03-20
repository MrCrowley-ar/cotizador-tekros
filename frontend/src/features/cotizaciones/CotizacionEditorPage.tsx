import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cotizacionesApi } from '../../api/cotizaciones';
import { productosApi } from '../../api/productos';
import { Layout } from '../../components/Layout';
import { Badge } from '../../components/Badge';
import { Spinner } from '../../components/Spinner';
import { DiscountSelector } from './DiscountSelector';
import { VersionHistory } from './VersionHistory';
import type { CotizacionVersion, CotizacionItem } from '../../api/types';

// ─── New Item Row ─────────────────────────────────────────────────────────────

function NewItemRow({ cotizacionId, versionId, onDone }: {
  cotizacionId: number; versionId: number; onDone: () => void;
}) {
  const qc = useQueryClient();
  const [cultivoId, setCultivoId] = useState<number | ''>('');
  const [hibridoId, setHibridoId] = useState<number | ''>('');
  const [bandaId, setBandaId] = useState<number | ''>('');
  const [bolsas, setBolsas] = useState('');
  const [error, setError] = useState('');

  const { data: cultivos = [] } = useQuery({ queryKey: ['cultivos'], queryFn: () => productosApi.getCultivos() });
  const { data: hibridos = [] } = useQuery({
    queryKey: ['hibridos', cultivoId],
    queryFn: () => productosApi.getHibridos(Number(cultivoId)),
    enabled: !!cultivoId,
  });
  const { data: bandas = [] } = useQuery({
    queryKey: ['bandas', cultivoId],
    queryFn: () => productosApi.getBandas(Number(cultivoId)),
    enabled: !!cultivoId,
  });

  useEffect(() => { setHibridoId(''); setBandaId(''); }, [cultivoId]);

  const addMut = useMutation({
    mutationFn: () =>
      cotizacionesApi.addItem(cotizacionId, versionId, {
        cultivoId: Number(cultivoId),
        hibridoId: Number(hibridoId),
        bandaId: Number(bandaId),
        bolsas: Number(bolsas),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['version', cotizacionId] });
      onDone();
    },
    onError: (e: any) => setError(e.message),
  });

  const sel = 'border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <tr className="bg-blue-50">
      <td className="px-3 py-2">
        <select value={cultivoId} onChange={(e) => setCultivoId(Number(e.target.value) || '')} className={sel}>
          <option value="">Cultivo</option>
          {cultivos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </td>
      <td className="px-3 py-2">
        <select value={hibridoId} onChange={(e) => setHibridoId(Number(e.target.value) || '')} className={sel} disabled={!cultivoId}>
          <option value="">Híbrido</option>
          {hibridos.map((h) => <option key={h.id} value={h.id}>{h.nombre}</option>)}
        </select>
      </td>
      <td className="px-3 py-2">
        <select value={bandaId} onChange={(e) => setBandaId(Number(e.target.value) || '')} className={sel} disabled={!cultivoId}>
          <option value="">Banda</option>
          {bandas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
        </select>
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min={0}
          step={0.01}
          value={bolsas}
          onChange={(e) => setBolsas(e.target.value)}
          placeholder="Bolsas"
          className={`${sel} w-24`}
        />
      </td>
      <td className="px-3 py-2 text-gray-400 text-sm">—</td>
      <td className="px-3 py-2 text-gray-400 text-sm">—</td>
      <td className="px-3 py-2">
        {error && <span className="text-xs text-red-600">{error}</span>}
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-2">
          <button
            onClick={() => addMut.mutate()}
            disabled={!cultivoId || !hibridoId || !bandaId || !bolsas || addMut.isPending}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {addMut.isPending ? <Spinner /> : 'Agregar'}
          </button>
          <button onClick={onDone} className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700">
            Cancelar
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Item Row ─────────────────────────────────────────────────────────────────

function ItemRow({ item, cotizacionId, version, isEditable }: {
  item: CotizacionItem;
  cotizacionId: number;
  version: CotizacionVersion;
  isEditable: boolean;
}) {
  const qc = useQueryClient();
  const [showDiscount, setShowDiscount] = useState(false);

  const deleteMut = useMutation({
    mutationFn: () => cotizacionesApi.deleteItem(cotizacionId, version.id, item.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['version', cotizacionId] }),
  });
  const deleteDiscMut = useMutation({
    mutationFn: (did: number) => cotizacionesApi.deleteItemDescuento(cotizacionId, version.id, item.id, did),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['version', cotizacionId] }),
  });

  const fmt = (n: number) =>
    n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-2 text-sm text-gray-700">{item.cultivo?.nombre ?? item.cultivoId}</td>
        <td className="px-4 py-2 text-sm text-gray-700">{item.hibrido?.nombre ?? item.hibridoId}</td>
        <td className="px-4 py-2 text-sm text-gray-700">{item.banda?.nombre ?? item.bandaId}</td>
        <td className="px-4 py-2 text-sm text-right text-gray-700">{fmt(Number(item.bolsas))}</td>
        <td className="px-4 py-2 text-sm text-right text-gray-700">${fmt(Number(item.precioBase))}</td>
        <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">${fmt(Number(item.subtotal))}</td>
        <td className="px-4 py-2 text-sm">
          <div className="flex flex-wrap gap-1">
            {item.descuentos.map((d) => (
              <span key={d.id} className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded">
                -{d.valorPorcentaje}%
                {isEditable && (
                  <button onClick={() => deleteDiscMut.mutate(d.id)} className="hover:text-red-600 leading-none">×</button>
                )}
              </span>
            ))}
            {isEditable && (
              <button
                onClick={() => setShowDiscount(true)}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                + descuento
              </button>
            )}
          </div>
        </td>
        <td className="px-4 py-2">
          {isEditable && (
            <button
              onClick={() => deleteMut.mutate()}
              disabled={deleteMut.isPending}
              className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
            >
              ×
            </button>
          )}
        </td>
      </tr>
      {showDiscount && (
        <DiscountSelector
          cotizacionId={cotizacionId}
          version={version}
          item={item}
          onClose={() => setShowDiscount(false)}
        />
      )}
    </>
  );
}

// ─── Totals Panel ─────────────────────────────────────────────────────────────

function TotalsPanel({ cotizacionId, versionId }: { cotizacionId: number; versionId: number }) {
  const { data: totals } = useQuery({
    queryKey: ['total', cotizacionId, versionId],
    queryFn: () => cotizacionesApi.getTotal(cotizacionId, versionId),
  });

  const fmt = (n: number) =>
    n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (!totals) return null;

  return (
    <div className="bg-white rounded-xl border p-4 text-sm space-y-2">
      <div className="flex justify-between text-gray-600">
        <span>Subtotal ítems</span>
        <span>${fmt(totals.subtotalItems)}</span>
      </div>
      {totals.descuentosItems > 0 && (
        <div className="flex justify-between text-orange-600">
          <span>Descuentos ítems</span>
          <span>−${fmt(totals.descuentosItems)}</span>
        </div>
      )}
      <div className="flex justify-between text-gray-600 border-t pt-2">
        <span>Subtotal neto</span>
        <span>${fmt(totals.subtotalNeto)}</span>
      </div>
      {totals.descuentosGlobales > 0 && (
        <div className="flex justify-between text-orange-600">
          <span>Descuentos globales</span>
          <span>−${fmt(totals.descuentosGlobales)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold text-gray-900 text-base border-t pt-2">
        <span>Total</span>
        <span>${fmt(totals.total)}</span>
      </div>
    </div>
  );
}

// ─── Global Discounts ─────────────────────────────────────────────────────────

function GlobalDiscounts({ cotizacionId, version, isEditable }: {
  cotizacionId: number;
  version: CotizacionVersion;
  isEditable: boolean;
}) {
  const qc = useQueryClient();
  const [showSelector, setShowSelector] = useState(false);

  const deleteMut = useMutation({
    mutationFn: (did: number) => cotizacionesApi.deleteGlobalDescuento(cotizacionId, version.id, did),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['version', cotizacionId] }),
  });

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Descuentos globales</h3>
        {isEditable && (
          <button
            onClick={() => setShowSelector(true)}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            + Agregar
          </button>
        )}
      </div>
      {version.descuentos.length === 0 ? (
        <p className="text-xs text-gray-400">Sin descuentos globales</p>
      ) : (
        <div className="space-y-1">
          {version.descuentos.map((d) => (
            <div key={d.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{d.descuento?.nombre ?? `Descuento #${d.descuentoId}`}</span>
              <div className="flex items-center gap-2">
                <span className="text-orange-600 font-medium">−{d.valorPorcentaje}%</span>
                {isEditable && (
                  <button
                    onClick={() => deleteMut.mutate(d.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {showSelector && (
        <DiscountSelector
          cotizacionId={cotizacionId}
          version={version}
          onClose={() => setShowSelector(false)}
        />
      )}
    </div>
  );
}

// ─── Editor Page ──────────────────────────────────────────────────────────────

const ESTADOS = ['borrador', 'enviada', 'aprobada', 'rechazada', 'cerrada'] as const;

export function CotizacionEditorPage() {
  const { id } = useParams<{ id: string }>();
  const cotizacionId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [showNewItem, setShowNewItem] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { data: cotizacion, isLoading: loadingCot } = useQuery({
    queryKey: ['cotizacion', cotizacionId],
    queryFn: () => cotizacionesApi.getOne(cotizacionId),
  });
  const { data: versiones = [] } = useQuery({
    queryKey: ['versiones', cotizacionId],
    queryFn: () => cotizacionesApi.getVersiones(cotizacionId),
    enabled: !!cotizacion,
  });

  // Default to the latest version
  useEffect(() => {
    if (versiones.length > 0 && !selectedVersionId) {
      setSelectedVersionId(versiones[0].id);
    }
  }, [versiones, selectedVersionId]);

  const { data: version, isLoading: loadingVer } = useQuery({
    queryKey: ['version', cotizacionId, selectedVersionId],
    queryFn: () => cotizacionesApi.getVersion(cotizacionId, selectedVersionId!),
    enabled: !!selectedVersionId,
  });

  // Invalidate totals whenever version data changes
  useEffect(() => {
    if (selectedVersionId) {
      qc.invalidateQueries({ queryKey: ['total', cotizacionId, selectedVersionId] });
    }
  }, [version, selectedVersionId, cotizacionId, qc]);

  const newVersionMut = useMutation({
    mutationFn: () => cotizacionesApi.crearVersion(cotizacionId),
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ['versiones', cotizacionId] });
      setSelectedVersionId(v.id);
    },
  });
  const estadoMut = useMutation({
    mutationFn: (estado: string) =>
      cotizacionesApi.updateEstado(cotizacionId, estado as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cotizacion', cotizacionId] }),
  });

  if (loadingCot) {
    return (
      <Layout>
        <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>
      </Layout>
    );
  }
  if (!cotizacion) {
    return <Layout><p className="text-center py-20 text-gray-400">Cotización no encontrada</p></Layout>;
  }

  const isLatestVersion = versiones[0]?.id === selectedVersionId;
  const isEditable = cotizacion.estado === 'borrador' && isLatestVersion;

  return (
    <Layout title={cotizacion.numero}>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/cotizaciones')} className="text-gray-400 hover:text-gray-700">←</button>
            <h1 className="text-xl font-semibold text-gray-900">{cotizacion.numero}</h1>
            <Badge label={cotizacion.estado} />
            {version && <span className="text-sm text-gray-400">v{version.version}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
            >
              📋 Versiones
            </button>
            {isEditable && (
              <button
                onClick={() => newVersionMut.mutate()}
                disabled={newVersionMut.isPending}
                className="px-3 py-1.5 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {newVersionMut.isPending ? <Spinner /> : '+ Nueva versión'}
              </button>
            )}
            {cotizacion.estado === 'borrador' && (
              <select
                value={cotizacion.estado}
                onChange={(e) => estadoMut.mutate(e.target.value)}
                className="text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Client info */}
        <div className="bg-white rounded-xl border px-4 py-3 text-sm text-gray-600 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-medium text-gray-800">{cotizacion.cliente?.nombre}</span>
          {cotizacion.cliente?.razonSocial && (
            <span className="text-gray-500">{cotizacion.cliente.razonSocial}</span>
          )}
          {cotizacion.cliente?.cuit && (
            <span className="text-gray-400 font-mono text-xs">CUIT: {cotizacion.cliente.cuit}</span>
          )}
          <span className="text-gray-400 ml-auto">
            {new Date(cotizacion.fechaCreacion).toLocaleDateString('es-AR', { dateStyle: 'long' })}
          </span>
        </div>

        <div className="flex gap-5">
          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Items table */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h2 className="text-sm font-semibold text-gray-700">Ítems</h2>
                {isEditable && (
                  <button
                    onClick={() => setShowNewItem(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    + Agregar ítem
                  </button>
                )}
              </div>

              {loadingVer ? (
                <div className="flex justify-center py-6"><Spinner /></div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-4 py-2">Cultivo</th>
                      <th className="text-left px-4 py-2">Híbrido</th>
                      <th className="text-left px-4 py-2">Banda</th>
                      <th className="text-right px-4 py-2">Bolsas</th>
                      <th className="text-right px-4 py-2">P. Base</th>
                      <th className="text-right px-4 py-2">Subtotal</th>
                      <th className="text-left px-4 py-2">Descuentos</th>
                      <th className="px-4 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {version?.items?.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        cotizacionId={cotizacionId}
                        version={version}
                        isEditable={isEditable}
                      />
                    ))}
                    {showNewItem && version && (
                      <NewItemRow
                        cotizacionId={cotizacionId}
                        versionId={version.id}
                        onDone={() => setShowNewItem(false)}
                      />
                    )}
                    {!showNewItem && (!version?.items || version.items.length === 0) && (
                      <tr>
                        <td colSpan={8} className="px-4 py-6 text-center text-gray-400 text-xs">
                          Sin ítems. {isEditable && 'Hacé clic en "+ Agregar ítem" para comenzar.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Global discounts */}
            {version && (
              <GlobalDiscounts
                cotizacionId={cotizacionId}
                version={version}
                isEditable={isEditable}
              />
            )}
          </div>

          {/* Right column */}
          <div className="w-72 shrink-0 space-y-4">
            {selectedVersionId && (
              <TotalsPanel cotizacionId={cotizacionId} versionId={selectedVersionId} />
            )}
            {showHistory && (
              <div className="bg-white rounded-xl border p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Historial de versiones</h3>
                <VersionHistory
                  cotizacionId={cotizacionId}
                  currentVersionId={selectedVersionId ?? 0}
                  onSelect={(v) => setSelectedVersionId(v.id)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
