import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cotizacionesApi } from '../../api/cotizaciones';
import { productosApi } from '../../api/productos';
import { descuentosApi } from '../../api/descuentos';
import { Layout } from '../../components/Layout';
import { Badge } from '../../components/Badge';
import { Spinner } from '../../components/Spinner';
import { VersionHistory } from './VersionHistory';
import type { CotizacionVersion, CotizacionItem, Cultivo, Descuento } from '../../api/types';

// ─── New Item Row (per cultivo) ───────────────────────────────────────────────

function NewItemRowForCultivo({ cotizacionId, versionId, cultivoId, onDone }: {
  cotizacionId: number; versionId: number; cultivoId: number; onDone: () => void;
}) {
  const qc = useQueryClient();
  const [hibridoId, setHibridoId] = useState<number | ''>('');
  const [bandaId, setBandaId] = useState<number | ''>('');
  const [bolsas, setBolsas] = useState('');
  const [error, setError] = useState('');

  const { data: hibridos = [] } = useQuery({
    queryKey: ['hibridos', cultivoId],
    queryFn: () => productosApi.getHibridos(cultivoId),
  });
  const { data: bandas = [] } = useQuery({
    queryKey: ['bandas', cultivoId],
    queryFn: () => productosApi.getBandas(cultivoId),
  });

  const addMut = useMutation({
    mutationFn: () =>
      cotizacionesApi.addItem(cotizacionId, versionId, {
        cultivoId,
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
        <select value={hibridoId} onChange={(e) => setHibridoId(Number(e.target.value) || '')} className={sel}>
          <option value="">Híbrido</option>
          {hibridos.map((h) => <option key={h.id} value={h.id}>{h.nombre}</option>)}
        </select>
      </td>
      <td className="px-3 py-2">
        <select value={bandaId} onChange={(e) => setBandaId(Number(e.target.value) || '')} className={sel}>
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
            disabled={!hibridoId || !bandaId || !bolsas || addMut.isPending}
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

  const deleteMut = useMutation({
    mutationFn: () => cotizacionesApi.deleteItem(cotizacionId, version.id, item.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['version', cotizacionId] }),
  });
  const deleteDiscMut = useMutation({
    mutationFn: (did: number) => cotizacionesApi.deleteItemDescuento(cotizacionId, version.id, item.id, did),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['version', cotizacionId] });
      qc.invalidateQueries({ queryKey: ['total', cotizacionId] });
    },
  });

  const fmt = (n: number) =>
    n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <tr className="hover:bg-gray-50">
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
  );
}

// ─── Cultivo Section ──────────────────────────────────────────────────────────

function CultivoSection({ cultivo, items, cotizacionId, version, isEditable }: {
  cultivo: Cultivo;
  items: CotizacionItem[];
  cotizacionId: number;
  version: CotizacionVersion;
  isEditable: boolean;
}) {
  const [showNewItem, setShowNewItem] = useState(false);

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-800">{cultivo.nombre}</h2>
        {isEditable && (
          <button
            onClick={() => setShowNewItem(true)}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            + Agregar ítem
          </button>
        )}
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
          <tr>
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
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              cotizacionId={cotizacionId}
              version={version}
              isEditable={isEditable}
            />
          ))}
          {showNewItem && (
            <NewItemRowForCultivo
              cotizacionId={cotizacionId}
              versionId={version.id}
              cultivoId={cultivo.id}
              onDone={() => setShowNewItem(false)}
            />
          )}
          {!showNewItem && items.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-5 text-center text-gray-400 text-xs">
                Sin ítems. {isEditable && 'Hacé clic en "+ Agregar ítem" para comenzar.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Cultivo Selector ─────────────────────────────────────────────────────────

function CultivoSelector({ cultivos, activeCultivoIds, withItemIds, onToggle }: {
  cultivos: Cultivo[];
  activeCultivoIds: Set<number>;
  withItemIds: Set<number>;
  onToggle: (id: number) => void;
}) {
  if (cultivos.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border px-4 py-3">
      <p className="text-xs font-medium text-gray-500 mb-2">Cultivos</p>
      <div className="flex flex-wrap gap-2">
        {cultivos.map((c) => {
          const hasItems = withItemIds.has(c.id);
          const isActive = activeCultivoIds.has(c.id);
          return (
            <label
              key={c.id}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border cursor-pointer transition-colors select-none
                ${isActive
                  ? 'bg-blue-50 border-blue-300 text-blue-800'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}
                ${hasItems ? 'cursor-default' : ''}`}
            >
              <input
                type="checkbox"
                checked={isActive}
                disabled={hasItems}
                onChange={() => onToggle(c.id)}
                className="rounded text-blue-600"
              />
              {c.nombre}
              {hasItems && <span className="text-xs text-blue-500">({withItemIds.has(c.id) ? '●' : ''})</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ─── Totals Panel ─────────────────────────────────────────────────────────────

function TotalsPanel({ cotizacionId, versionId }: { cotizacionId: number; versionId: number }) {
  const { data: totals } = useQuery({
    queryKey: ['total', cotizacionId, versionId],
    queryFn: () => cotizacionesApi.getTotal(cotizacionId, versionId),
  });

  const fmt = (n: number | null | undefined) =>
    (n ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

// ─── Descuentos Panel ─────────────────────────────────────────────────────────

function DescuentosPanel({ cotizacionId, version, isEditable }: {
  cotizacionId: number;
  version: CotizacionVersion;
  isEditable: boolean;
}) {
  const qc = useQueryClient();
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [noAplicaId, setNoAplicaId] = useState<number | null>(null);

  const { data: descuentos = [] } = useQuery({
    queryKey: ['descuentos', 'activos'],
    queryFn: () => descuentosApi.getAll(true),
  });

  function isApplied(desc: Descuento): boolean {
    if (desc.tipoAplicacion === 'global') {
      return version.descuentos.some((d) => d.descuentoId === desc.id);
    }
    return version.items.some((item) => item.descuentos.some((d) => d.descuentoId === desc.id));
  }

  function getAppliedPct(desc: Descuento): number | null {
    if (desc.tipoAplicacion === 'global') {
      return version.descuentos.find((d) => d.descuentoId === desc.id)?.valorPorcentaje ?? null;
    }
    for (const item of version.items) {
      const found = item.descuentos.find((d) => d.descuentoId === desc.id);
      if (found) return found.valorPorcentaje;
    }
    return null;
  }

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['version', cotizacionId] });
    qc.invalidateQueries({ queryKey: ['total', cotizacionId] });
  }

  function showNoAplica(id: number) {
    setNoAplicaId(id);
    setTimeout(() => setNoAplicaId(null), 2000);
  }

  function markPending(id: number, on: boolean) {
    setPendingIds((prev) => {
      const next = new Set(prev);
      on ? next.add(id) : next.delete(id);
      return next;
    });
  }

  async function applyDescuento(desc: Descuento) {
    markPending(desc.id, true);
    try {
      if (desc.modo === 'basico') {
        if (desc.tipoAplicacion === 'global') {
          await cotizacionesApi.applyGlobalDescuento(cotizacionId, version.id, {
            descuentoId: desc.id,
            porcentaje: desc.valorPorcentaje,
          });
        } else {
          if (version.items.length === 0) { showNoAplica(desc.id); return; }
          await Promise.all(
            version.items.map((item) =>
              cotizacionesApi.applyItemDescuento(cotizacionId, version.id, item.id, {
                descuentoId: desc.id,
                porcentaje: desc.valorPorcentaje,
              })
            )
          );
        }
      } else {
        // avanzado
        if (desc.tipoAplicacion === 'global') {
          const results = await descuentosApi.evaluar({ tipoAplicacion: 'global' });
          const match = results.find((r) => r.descuentoId === desc.id);
          if (!match) { showNoAplica(desc.id); return; }
          await cotizacionesApi.applyGlobalDescuento(cotizacionId, version.id, {
            descuentoId: desc.id,
            porcentaje: match.porcentaje,
          });
        } else {
          if (version.items.length === 0) { showNoAplica(desc.id); return; }
          let applied = false;
          for (const item of version.items) {
            const results = await descuentosApi.evaluar({
              tipoAplicacion: desc.tipoAplicacion as 'global',
              cultivoId: item.cultivoId,
              hibridoId: item.hibridoId,
              bandaId: item.bandaId,
              cantidad: Number(item.bolsas),
            });
            const match = results.find((r) => r.descuentoId === desc.id);
            if (match) {
              await cotizacionesApi.applyItemDescuento(cotizacionId, version.id, item.id, {
                descuentoId: desc.id,
                porcentaje: match.porcentaje,
              });
              applied = true;
            }
          }
          if (!applied) { showNoAplica(desc.id); return; }
        }
      }
      invalidate();
    } catch {
      // silently fail
    } finally {
      markPending(desc.id, false);
    }
  }

  async function removeDescuento(desc: Descuento) {
    markPending(desc.id, true);
    try {
      if (desc.tipoAplicacion === 'global') {
        const applied = version.descuentos.find((d) => d.descuentoId === desc.id);
        if (applied) {
          await cotizacionesApi.deleteGlobalDescuento(cotizacionId, version.id, applied.id);
        }
      } else {
        for (const item of version.items) {
          const itemDesc = item.descuentos.find((d) => d.descuentoId === desc.id);
          if (itemDesc) {
            await cotizacionesApi.deleteItemDescuento(cotizacionId, version.id, item.id, itemDesc.id);
          }
        }
      }
      invalidate();
    } finally {
      markPending(desc.id, false);
    }
  }

  async function toggleDescuento(desc: Descuento) {
    if (!isEditable || pendingIds.has(desc.id)) return;
    if (isApplied(desc)) {
      await removeDescuento(desc);
    } else {
      await applyDescuento(desc);
    }
  }

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Descuentos disponibles</h3>
      {descuentos.length === 0 ? (
        <p className="text-xs text-gray-400">Sin descuentos activos</p>
      ) : (
        <div className="space-y-2">
          {descuentos.map((desc) => {
            const applied = isApplied(desc);
            const pct = getAppliedPct(desc);
            const pending = pendingIds.has(desc.id);
            const noAplica = noAplicaId === desc.id;
            return (
              <label
                key={desc.id}
                className={`flex items-center gap-2 text-sm rounded-lg px-2 py-1.5 transition-colors
                  ${applied ? 'bg-orange-50' : 'hover:bg-gray-50'}
                  ${isEditable ? 'cursor-pointer' : 'cursor-default opacity-60'}`}
              >
                {pending ? (
                  <Spinner className="w-4 h-4 shrink-0 text-blue-500" />
                ) : (
                  <input
                    type="checkbox"
                    checked={applied}
                    disabled={!isEditable}
                    onChange={() => toggleDescuento(desc)}
                    className="rounded text-blue-600 cursor-pointer"
                  />
                )}
                <span className={`flex-1 leading-tight ${applied ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                  {desc.nombre}
                  <span className="block text-xs text-gray-400 font-normal">
                    {desc.tipoAplicacion} · {desc.modo}
                  </span>
                </span>
                {noAplica ? (
                  <span className="text-xs text-gray-400 italic">No aplica</span>
                ) : applied && pct != null ? (
                  <span className="text-xs font-semibold text-orange-600">−{pct}%</span>
                ) : (
                  <span className="text-xs text-gray-400">{desc.valorPorcentaje ?? '?'}%</span>
                )}
              </label>
            );
          })}
        </div>
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
  const [selectedCultivos, setSelectedCultivos] = useState<Set<number>>(new Set());
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
  const { data: cultivos = [] } = useQuery({
    queryKey: ['cultivos'],
    queryFn: () => productosApi.getCultivos(),
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

  // Cultivos that already have items — always shown, checkbox disabled
  const existingCultivoIds = new Set(version?.items?.map((i) => i.cultivoId) ?? []);
  const activeCultivoIds = new Set([...existingCultivoIds, ...selectedCultivos]);

  function toggleCultivo(id: number) {
    if (existingCultivoIds.has(id)) return;
    setSelectedCultivos((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const activeCultivos = cultivos
    .filter((c) => activeCultivoIds.has(c.id))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

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

        {/* Cultivo selector */}
        <CultivoSelector
          cultivos={cultivos}
          activeCultivoIds={activeCultivoIds}
          withItemIds={existingCultivoIds}
          onToggle={toggleCultivo}
        />

        <div className="flex gap-5">
          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-4">
            {loadingVer ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : activeCultivos.length === 0 ? (
              <div className="bg-white rounded-xl border px-4 py-10 text-center text-gray-400 text-sm">
                {isEditable
                  ? 'Seleccioná un cultivo arriba para comenzar a cargar ítems.'
                  : 'Sin ítems en esta versión.'}
              </div>
            ) : (
              activeCultivos.map((cultivo) => (
                <CultivoSection
                  key={cultivo.id}
                  cultivo={cultivo}
                  items={(version?.items ?? []).filter((i) => i.cultivoId === cultivo.id)}
                  cotizacionId={cotizacionId}
                  version={version!}
                  isEditable={isEditable}
                />
              ))
            )}
          </div>

          {/* Right column */}
          <div className="w-72 shrink-0 space-y-4">
            {selectedVersionId && (
              <TotalsPanel cotizacionId={cotizacionId} versionId={selectedVersionId} />
            )}
            {version && (
              <DescuentosPanel
                cotizacionId={cotizacionId}
                version={version}
                isEditable={isEditable}
              />
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
