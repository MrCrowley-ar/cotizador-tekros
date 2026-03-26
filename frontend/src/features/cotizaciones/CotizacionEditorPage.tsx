import { useState, useEffect, useMemo, useRef } from 'react';
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

// ─── Resize Divider ───────────────────────────────────────────────────────────

function ResizeDivider({ onDrag }: { onDrag: (dx: number) => void }) {
  const state = useRef({ active: false, x: 0, fn: onDrag });
  state.current.fn = onDrag;

  useEffect(() => {
    const mm = (e: MouseEvent) => {
      if (!state.current.active) return;
      state.current.fn(state.current.x - e.clientX);
      state.current.x = e.clientX;
    };
    const mu = () => { state.current.active = false; };
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup', mu);
    return () => {
      window.removeEventListener('mousemove', mm);
      window.removeEventListener('mouseup', mu);
    };
  }, []);

  return (
    <div
      className="w-3 mx-0.5 shrink-0 cursor-col-resize flex items-stretch justify-center group select-none"
      onMouseDown={(e) => { state.current.active = true; state.current.x = e.clientX; e.preventDefault(); }}
    >
      <div className="w-px bg-gray-200 group-hover:bg-blue-400 transition-colors" />
    </div>
  );
}

// ─── New Item Row (per cultivo) ───────────────────────────────────────────────

function NewItemRowForCultivo({ cotizacionId, versionId, cultivoId, onDone, discountCount, activeDescuentos }: {
  cotizacionId: number; versionId: number; cultivoId: number; onDone: () => void;
  discountCount: number;
  activeDescuentos: Descuento[];
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
    mutationFn: async () => {
      const newItem = await cotizacionesApi.addItem(cotizacionId, versionId, {
        cultivoId,
        hibridoId: Number(hibridoId),
        bandaId: Number(bandaId),
        bolsas: Number(bolsas),
      });

      // Auto-apply active discounts to the new item
      for (const desc of activeDescuentos) {
        try {
          if (desc.modo === 'basico') {
            await cotizacionesApi.applyItemDescuento(cotizacionId, versionId, newItem.id, {
              descuentoId: desc.id,
              porcentaje: Number(desc.valorPorcentaje),
            });
          } else {
            const results = await descuentosApi.evaluar({
              tipoAplicacion: desc.tipoAplicacion as 'global',
              cultivoId,
              hibridoId: Number(hibridoId),
              bandaId: Number(bandaId),
              cantidad: Number(bolsas),
              // precio/subtotal not available for new item before price calculation
            });
            const match = results.find((r) => r.descuentoId === desc.id);
            if (match) {
              await cotizacionesApi.applyItemDescuento(cotizacionId, versionId, newItem.id, {
                descuentoId: desc.id,
                porcentaje: match.porcentaje,
              });
            }
          }
        } catch {
          // Skip if discount doesn't apply to this item
        }
      }

      return newItem;
    },
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['version', cotizacionId, versionId] });
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
      {Array.from({ length: discountCount }).map((_, i) => <td key={i} />)}
      <td className="px-3 py-2 text-gray-400 text-sm">—</td>
      <td className="px-3 py-2">
        {error && <span className="text-xs text-red-600 block mb-1">{error}</span>}
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

function ItemRow({ item, cotizacionId, version, isEditable, activeDescuentos }: {
  item: CotizacionItem;
  cotizacionId: number;
  version: CotizacionVersion;
  isEditable: boolean;
  activeDescuentos: Descuento[];
}) {
  const qc = useQueryClient();
  const [deleteError, setDeleteError] = useState('');

  const deleteMut = useMutation({
    mutationFn: () => cotizacionesApi.deleteItem(cotizacionId, version.id, item.id),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['version', cotizacionId, version.id] });
      qc.refetchQueries({ queryKey: ['total', cotizacionId, version.id] });
    },
    onError: (e: any) => setDeleteError(e.message),
  });

  const fmt = (n: number) =>
    n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Subtotal = bruto × all applied discount multipliers
  const bruto = Number(item.subtotal);
  const subtotal = activeDescuentos.reduce((acc, d) => {
    const applied = item.descuentos.find((x) => x.descuentoId === d.id);
    if (!applied) return acc;
    return acc * (1 - Number(applied.valorPorcentaje) / 100);
  }, bruto);

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">{item.hibrido?.nombre ?? item.hibridoId}</td>
      <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">{item.banda?.nombre ?? item.bandaId}</td>
      <td className="px-4 py-2 text-sm text-right text-gray-700">{fmt(Number(item.bolsas))}</td>
      <td className="px-4 py-2 text-sm text-right text-gray-500 whitespace-nowrap">${fmt(Number(item.precioBase))}</td>
      {activeDescuentos.map((d) => {
        const applied = item.descuentos.find((x) => x.descuentoId === d.id);
        return (
          <td key={d.id} className="px-4 py-2 text-sm text-right whitespace-nowrap">
            {applied ? (
              <span className="text-orange-600 text-xs font-medium">
                −{Number(applied.valorPorcentaje)}%
              </span>
            ) : (
              <span className="text-gray-300 text-xs">—</span>
            )}
          </td>
        );
      })}
      <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900 whitespace-nowrap">
        ${fmt(subtotal)}
      </td>
      <td className="px-4 py-2">
        {deleteError && <span className="text-xs text-red-600 block mb-1">{deleteError}</span>}
        {isEditable && (
          <button
            onClick={() => { setDeleteError(''); deleteMut.mutate(); }}
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

function CultivoSection({ cultivo, items, cotizacionId, version, isEditable, activeDescuentos }: {
  cultivo: Cultivo;
  items: CotizacionItem[];
  cotizacionId: number;
  version: CotizacionVersion;
  isEditable: boolean;
  activeDescuentos: Descuento[];
}) {
  const [showNewItem, setShowNewItem] = useState(false);

  const totalCols = 6 + activeDescuentos.length;

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

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2 whitespace-nowrap">Híbrido</th>
              <th className="text-left px-4 py-2 whitespace-nowrap">Banda</th>
              <th className="text-right px-4 py-2">Bolsas</th>
              <th className="text-right px-4 py-2 whitespace-nowrap">P. Base</th>
              {activeDescuentos.map((d) => (
                <th key={d.id} className="px-4 py-2 text-right whitespace-nowrap normal-case tracking-normal text-orange-500 font-medium">
                  {d.nombre}
                </th>
              ))}
              <th className="text-right px-4 py-2 whitespace-nowrap normal-case tracking-normal text-gray-700 font-semibold">
                Subtotal
              </th>
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
                activeDescuentos={activeDescuentos}
              />
            ))}
            {showNewItem && (
              <NewItemRowForCultivo
                cotizacionId={cotizacionId}
                versionId={version.id}
                cultivoId={cultivo.id}
                onDone={() => setShowNewItem(false)}
                discountCount={activeDescuentos.length}
                activeDescuentos={activeDescuentos}
              />
            )}
            {!showNewItem && items.length === 0 && (
              <tr>
                <td colSpan={totalCols} className="px-4 py-5 text-center text-gray-400 text-xs">
                  Sin ítems. {isEditable && 'Hacé clic en "+ Agregar ítem" para comenzar.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
              {hasItems && <span className="text-xs text-blue-500">●</span>}
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
    staleTime: 0,
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
          <span>Desc. ítems</span>
          <span>−${fmt(totals.descuentosItems)}</span>
        </div>
      )}
      <div className="flex justify-between text-gray-600 border-t pt-2">
        <span>Subtotal neto</span>
        <span>${fmt(totals.subtotalNeto)}</span>
      </div>
      {totals.descuentosGlobales > 0 && (
        <div className="flex justify-between text-orange-600">
          <span>Desc. globales</span>
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

// ─── Item Discounts Panel (right sidebar) ─────────────────────────────────────

function ItemDescuentosPanel({ isEditable, activeIds, pendingIds, allDescuentos, onToggle }: {
  isEditable: boolean;
  activeIds: Set<number>;
  pendingIds: Set<number>;
  allDescuentos: Descuento[];
  onToggle: (desc: Descuento) => void;
}) {
  const nonGlobal = allDescuentos.filter((d) => d.tipoAplicacion !== 'global');
  if (nonGlobal.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Descuentos</h3>
      <div className="space-y-1">
        {nonGlobal.map((desc) => {
          const applied = activeIds.has(desc.id);
          const pending = pendingIds.has(desc.id);
          return (
            <label
              key={desc.id}
              className={`flex items-center gap-2 text-sm rounded-lg px-2 py-1.5 transition-colors select-none
                ${applied ? 'bg-orange-50' : 'hover:bg-gray-50'}
                ${isEditable ? 'cursor-pointer' : 'cursor-default opacity-60'}`}
            >
              {pending ? (
                <Spinner className="w-4 h-4 shrink-0 text-orange-500" />
              ) : (
                <input
                  type="checkbox"
                  checked={applied}
                  disabled={!isEditable}
                  onChange={() => onToggle(desc)}
                  className="rounded text-orange-500 cursor-pointer"
                />
              )}
              <span className={`flex-1 leading-tight ${applied ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                {desc.nombre}
              </span>
              {desc.modo === 'basico' && desc.valorPorcentaje != null && (
                <span className="text-xs text-gray-400">{desc.valorPorcentaje}%</span>
              )}
              {desc.modo === 'avanzado' && (
                <span className="text-xs text-gray-400">{desc.reglas?.length ?? 0} reglas</span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ─── Global Discounts Panel (right sidebar) ───────────────────────────────────

function DescuentosGlobalesPanel({ cotizacionId, version, isEditable }: {
  cotizacionId: number;
  version: CotizacionVersion;
  isEditable: boolean;
}) {
  const qc = useQueryClient();
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [noAplicaId, setNoAplicaId] = useState<number | null>(null);

  const { data: allDescuentos = [] } = useQuery({
    queryKey: ['descuentos', 'activos'],
    queryFn: () => descuentosApi.getAll(true),
  });

  const descuentos = allDescuentos.filter((d) => d.tipoAplicacion === 'global');
  if (descuentos.length === 0) return null;

  function isApplied(desc: Descuento) {
    return version.descuentos.some((d) => d.descuentoId === desc.id);
  }
  function getAppliedPct(desc: Descuento) {
    return version.descuentos.find((d) => d.descuentoId === desc.id)?.valorPorcentaje ?? null;
  }
  function invalidate() {
    qc.refetchQueries({ queryKey: ['version', cotizacionId, version.id] });
    qc.refetchQueries({ queryKey: ['total', cotizacionId, version.id] });
  }
  function showNoAplica(id: number) {
    setNoAplicaId(id);
    setTimeout(() => setNoAplicaId(null), 2000);
  }
  function markPending(id: number, on: boolean) {
    setPendingIds((prev) => { const next = new Set(prev); on ? next.add(id) : next.delete(id); return next; });
  }

  async function applyDescuento(desc: Descuento) {
    markPending(desc.id, true);
    try {
      if (desc.modo === 'basico') {
        await cotizacionesApi.applyGlobalDescuento(cotizacionId, version.id, {
          descuentoId: desc.id,
          porcentaje: Number(desc.valorPorcentaje),
        });
      } else {
        const results = await descuentosApi.evaluar({ tipoAplicacion: 'global' });
        const match = results.find((r) => r.descuentoId === desc.id);
        if (!match) { showNoAplica(desc.id); return; }
        await cotizacionesApi.applyGlobalDescuento(cotizacionId, version.id, {
          descuentoId: desc.id,
          porcentaje: match.porcentaje,
        });
      }
      invalidate();
    } catch { /* silently fail */ } finally {
      markPending(desc.id, false);
    }
  }

  async function removeDescuento(desc: Descuento) {
    markPending(desc.id, true);
    try {
      const applied = version.descuentos.find((d) => d.descuentoId === desc.id);
      if (applied) {
        await cotizacionesApi.deleteGlobalDescuento(cotizacionId, version.id, applied.id);
      }
      invalidate();
    } finally {
      markPending(desc.id, false);
    }
  }

  async function toggle(desc: Descuento) {
    if (!isEditable || pendingIds.has(desc.id)) return;
    if (isApplied(desc)) await removeDescuento(desc);
    else await applyDescuento(desc);
  }

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Descuentos globales</h3>
      <div className="space-y-1">
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
                  onChange={() => toggle(desc)}
                  className="rounded text-blue-600 cursor-pointer"
                />
              )}
              <span className={`flex-1 leading-tight ${applied ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                {desc.nombre}
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
  const [rightWidth, setRightWidth] = useState(288);

  // Discount state lifted to page level
  const [activeDiscountIds, setActiveDiscountIds] = useState<Set<number>>(new Set());
  const [pendingDiscountIds, setPendingDiscountIds] = useState<Set<number>>(new Set());

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
  const { data: allDescuentos = [] } = useQuery({
    queryKey: ['descuentos', 'activos'],
    queryFn: () => descuentosApi.getAll(true),
  });

  useEffect(() => {
    if (versiones.length > 0 && !selectedVersionId) {
      setSelectedVersionId(versiones[0].id);
    }
  }, [versiones, selectedVersionId]);

  const { data: version, isLoading: loadingVer } = useQuery({
    queryKey: ['version', cotizacionId, selectedVersionId],
    queryFn: () => cotizacionesApi.getVersion(cotizacionId, selectedVersionId!),
    enabled: !!selectedVersionId,
    staleTime: 0,
  });

  // Sync active discounts from version on version change
  useEffect(() => {
    if (!version) return;
    const applied = new Set(
      (version.items ?? []).flatMap((i) => i.descuentos.map((d) => d.descuentoId))
    );
    setActiveDiscountIds(applied);
  }, [version?.id]); // only on version switch, not every refetch

  useEffect(() => {
    if (selectedVersionId) {
      qc.refetchQueries({ queryKey: ['total', cotizacionId, selectedVersionId] });
    }
  }, [version, selectedVersionId, cotizacionId, qc]);

  // Active discounts as full objects (for passing to CultivoSection)
  const activeDescuentos = useMemo(
    () => allDescuentos.filter((d) => d.tipoAplicacion !== 'global' && activeDiscountIds.has(d.id)),
    [allDescuentos, activeDiscountIds],
  );

  function markDiscPending(id: number, on: boolean) {
    setPendingDiscountIds((prev) => { const n = new Set(prev); on ? n.add(id) : n.delete(id); return n; });
  }

  function invalidateVersion() {
    qc.refetchQueries({ queryKey: ['version', cotizacionId, selectedVersionId] });
    qc.refetchQueries({ queryKey: ['total', cotizacionId, selectedVersionId] });
  }

  async function toggleDiscount(desc: Descuento) {
    if (!isEditable || pendingDiscountIds.has(desc.id) || !version) return;
    markDiscPending(desc.id, true);

    const isActive = activeDiscountIds.has(desc.id);
    const allItems = version.items ?? [];

    // Optimistic update
    setActiveDiscountIds((prev) => {
      const n = new Set(prev);
      isActive ? n.delete(desc.id) : n.add(desc.id);
      return n;
    });

    try {
      if (isActive) {
        await Promise.all(
          allItems.flatMap((item) => {
            const found = item.descuentos.find((d) => d.descuentoId === desc.id);
            if (!found) return [];
            return [cotizacionesApi.deleteItemDescuento(cotizacionId, version.id, item.id, found.descuentoId)];
          })
        );
      } else {
        if (desc.modo === 'basico') {
          await Promise.all(
            allItems.map((item) =>
              cotizacionesApi.applyItemDescuento(cotizacionId, version.id, item.id, {
                descuentoId: desc.id,
                porcentaje: Number(desc.valorPorcentaje),
              })
            )
          );
        } else {
          const rulesCampos = new Set(
            (desc.reglas ?? []).flatMap((r) => r.condiciones?.map((c) => c.campo) ?? [])
          );
          for (const item of allItems) {
            const results = await descuentosApi.evaluar({
              tipoAplicacion: desc.tipoAplicacion as 'global',
              cultivoId: item.cultivoId,
              hibridoId: item.hibridoId,
              bandaId: item.bandaId,
              cantidad: Number(item.bolsas),
              ...(rulesCampos.has('precio')   && { precio:   Number(item.precioBase) }),
              ...(rulesCampos.has('subtotal') && { subtotal: Number(item.subtotal) }),
            });
            const match = results.find((r) => r.descuentoId === desc.id);
            if (match) {
              await cotizacionesApi.applyItemDescuento(cotizacionId, version.id, item.id, {
                descuentoId: desc.id,
                porcentaje: match.porcentaje,
              });
            }
          }
        }
      }
      invalidateVersion();
    } catch {
      // Revert optimistic update on error
      setActiveDiscountIds((prev) => {
        const n = new Set(prev);
        isActive ? n.add(desc.id) : n.delete(desc.id);
        return n;
      });
    } finally {
      markDiscPending(desc.id, false);
    }
  }

  const newVersionMut = useMutation({
    mutationFn: () => cotizacionesApi.crearVersion(cotizacionId),
    onSuccess: (v) => {
      qc.refetchQueries({ queryKey: ['versiones', cotizacionId] });
      setSelectedVersionId(v.id);
    },
  });
  const estadoMut = useMutation({
    mutationFn: (estado: string) =>
      cotizacionesApi.updateEstado(cotizacionId, estado as any),
    onSuccess: () => qc.refetchQueries({ queryKey: ['cotizacion', cotizacionId] }),
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
    <Layout title={cotizacion.numero} fullHeight>
      <div className="h-full flex flex-col gap-3 p-5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
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
        <div className="bg-white rounded-xl border px-4 py-2.5 text-sm text-gray-600 flex flex-wrap items-center gap-x-4 gap-y-1 shrink-0">
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
        <div className="shrink-0">
          <CultivoSelector
            cultivos={cultivos}
            activeCultivoIds={activeCultivoIds}
            withItemIds={existingCultivoIds}
            onToggle={toggleCultivo}
          />
        </div>

        {/* Main area — fills remaining height, both sides scroll independently */}
        <div className="flex-1 flex min-h-0">
          {/* Tables */}
          <div className="flex-1 overflow-y-auto min-w-0 space-y-4 pr-1">
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
                  activeDescuentos={activeDescuentos}
                />
              ))
            )}
          </div>

          <ResizeDivider onDrag={(dx) => setRightWidth((w) => Math.max(200, Math.min(600, w + dx)))} />

          {/* Right panel — independent scroll */}
          <div style={{ width: rightWidth }} className="shrink-0 overflow-y-auto space-y-4">
            {selectedVersionId && (
              <TotalsPanel cotizacionId={cotizacionId} versionId={selectedVersionId} />
            )}
            <ItemDescuentosPanel
              isEditable={isEditable}
              activeIds={activeDiscountIds}
              pendingIds={pendingDiscountIds}
              allDescuentos={allDescuentos}
              onToggle={toggleDiscount}
            />
            {version && (
              <DescuentosGlobalesPanel
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
