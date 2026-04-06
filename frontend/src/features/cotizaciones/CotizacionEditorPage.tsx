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
import { useCotizacionExportPng } from './CotizacionExportPng';
import { FeedPanelInline } from '../feed/FeedPanel';
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

function NewItemRowForCultivo({ cotizacionId, versionId, cultivoId, onDone, discountCount, activeDescuentos, cultivoVolumen, cultivoMonto, totalBolsas, version }: {
  cotizacionId: number; versionId: number; cultivoId: number; onDone: () => void;
  discountCount: number;
  activeDescuentos: Descuento[];
  cultivoVolumen: number;
  cultivoMonto: number;
  totalBolsas: number;
  version: CotizacionVersion;
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
          } else if (desc.modo === 'selector') {
            // selector discounts are applied via the dropdown, skip
          } else {
            const newBolsas = Number(bolsas);
            const volumen = cultivoVolumen + newBolsas;
            const monto = cultivoMonto;
            const precioPonderado = volumen > 0 ? Math.round((monto / volumen) * 1e4) / 1e4 : undefined;
            const allTotalBolsas = totalBolsas + newBolsas;
            const ratioCultivo = allTotalBolsas > 0 ? Math.round((volumen / allTotalBolsas) * 1e6) / 1e6 : 0;
            const subtotalItems = (version.items ?? []).reduce((s, i) => s + Number(i.subtotal), 0);
            const results = await descuentosApi.evaluar({
              tipoAplicacion: desc.tipoAplicacion as 'global',
              cultivoId,
              hibridoId: Number(hibridoId),
              bandaId: Number(bandaId),
              cantidad: newBolsas,
              volumen,
              monto,
              ...(precioPonderado != null ? { precioPonderado } : {}),
              ratioCultivo,
              subtotalItems,
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
  const [editingManual, setEditingManual] = useState<Record<number, string>>({});

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

  function invalidate() {
    qc.refetchQueries({ queryKey: ['version', cotizacionId, version.id] });
    qc.refetchQueries({ queryKey: ['total', cotizacionId, version.id] });
  }

  async function saveManualPct(descId: number, pctStr: string) {
    const pct = Number(pctStr);
    if (isNaN(pct) || pct < 0 || pct > 100) return;
    // Remove existing then re-apply
    const existing = item.descuentos.find((x) => x.descuentoId === descId);
    if (existing) {
      await cotizacionesApi.deleteItemDescuento(cotizacionId, version.id, item.id, existing.descuentoId);
    }
    await cotizacionesApi.applyItemDescuento(cotizacionId, version.id, item.id, {
      descuentoId: descId,
      porcentaje: pct,
    });
    setEditingManual((prev) => { const n = { ...prev }; delete n[descId]; return n; });
    invalidate();
  }

  // Subtotal = precioBase (no se multiplica por bolsas) × descuentos aplicados
  const bruto = Number(item.precioBase);
  const subtotal = activeDescuentos.reduce((acc, d) => {
    const applied = item.descuentos.find((x) => x.descuentoId === d.id);
    if (!applied) return acc;
    return acc * (1 - Number(applied.valorPorcentaje) / 100);
  }, bruto);

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">{item.hibrido?.nombre ?? item.hibridoId}</td>
      <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">{item.banda?.nombre ?? item.bandaId}</td>
      <td className="px-4 py-2 text-sm text-right text-gray-700">{Math.round(Number(item.bolsas)).toLocaleString('es-AR')}</td>
      <td className="px-4 py-2 text-sm text-right text-gray-500 whitespace-nowrap">${fmt(Number(item.precioBase))}</td>
      {activeDescuentos.map((d) => {
        const applied = item.descuentos.find((x) => x.descuentoId === d.id);
        const isManual = d.modo === 'manual';

        if (isManual && isEditable) {
          const currentPct = applied ? String(Number(applied.valorPorcentaje)) : '0';
          const editing = editingManual[d.id];
          return (
            <td key={d.id} className="px-1 py-1 text-sm text-right whitespace-nowrap">
              <div className="inline-flex items-center gap-0.5">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={editing ?? currentPct}
                  onChange={(e) => setEditingManual((prev) => ({ ...prev, [d.id]: e.target.value }))}
                  onBlur={(e) => {
                    if (e.target.value !== currentPct) saveManualPct(d.id, e.target.value);
                    else setEditingManual((prev) => { const n = { ...prev }; delete n[d.id]; return n; });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  }}
                  className="w-16 text-xs text-right border rounded px-1.5 py-1 text-orange-600 font-medium focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
                <span className="text-xs text-orange-600 font-medium">%</span>
              </div>
            </td>
          );
        }

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

function CultivoSection({ cultivo, items, cotizacionId, version, isEditable, activeDescuentos, cultivoVolumen, cultivoMonto, totalBolsas }: {
  cultivo: Cultivo;
  items: CotizacionItem[];
  cotizacionId: number;
  version: CotizacionVersion;
  isEditable: boolean;
  activeDescuentos: Descuento[];
  cultivoVolumen: number;
  cultivoMonto: number;
  totalBolsas: number;
}) {
  const [showNewItem, setShowNewItem] = useState(false);

  const totalCols = 6 + activeDescuentos.length;

  const fmt = (n: number) =>
    n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Compute totals for the footer row
  const totalBolsasCultivo = items.reduce((s, i) => s + Math.round(Number(i.bolsas)), 0);
  const totalMontoUSD = items.reduce((s, item) => {
    const subtUnit = activeDescuentos.reduce((acc, d) => {
      const applied = item.descuentos.find((x) => x.descuentoId === d.id);
      if (!applied) return acc;
      return acc * (1 - Number(applied.valorPorcentaje) / 100);
    }, Number(item.precioBase));
    return s + subtUnit * Number(item.bolsas);
  }, 0);
  const precioPonderado = totalBolsasCultivo > 0 ? totalMontoUSD / totalBolsasCultivo : 0;

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
                cultivoVolumen={cultivoVolumen}
                cultivoMonto={cultivoMonto}
                totalBolsas={totalBolsas}
                version={version}
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
          {items.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold text-sm">
                <td className="px-4 py-2 text-orange-600 uppercase">Total</td>
                <td className="px-4 py-2"></td>
                <td className="px-4 py-2 text-right text-orange-600">{totalBolsasCultivo.toLocaleString('es-AR')}</td>
                <td className="px-4 py-2"></td>
                {activeDescuentos.map((d) => (
                  <td key={d.id} className="px-4 py-2"></td>
                ))}
                <td className="px-4 py-2 text-right text-gray-700">${fmt(precioPonderado)}</td>
                <td className="px-4 py-2"></td>
              </tr>
            </tfoot>
          )}
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

// ─── Cultivo Stats Panel ──────────────────────────────────────────────────────

function CultivoStatsPanel({ version, cultivos }: { version: CotizacionVersion; cultivos: Cultivo[] }) {
  const items = version.items ?? [];
  if (items.length === 0) return null;

  const byCultivo = new Map<number, { nombre: string; bolsas: number; monto: number }>();
  for (const item of items) {
    const nombre =
      item.cultivo?.nombre ??
      cultivos.find((c) => c.id === item.cultivoId)?.nombre ??
      String(item.cultivoId);
    const cur = byCultivo.get(item.cultivoId) ?? { nombre, bolsas: 0, monto: 0 };
    cur.bolsas += Number(item.bolsas);
    // Monto = sum of (precio con descuentos × bolsas) per cultivo
    const precioConDesc = (item.descuentos ?? []).reduce(
      (acc, d) => acc * (1 - Number(d.valorPorcentaje) / 100),
      Number(item.precioBase),
    );
    cur.monto += precioConDesc * Number(item.bolsas);
    byCultivo.set(item.cultivoId, cur);
  }

  const fmt = (n: number) =>
    n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="bg-white rounded-xl border p-4 text-sm">
      {Array.from(byCultivo.entries()).map(([cultivoId, stats], idx) => {
        const precioPonderado = stats.bolsas > 0 ? stats.monto / stats.bolsas : 0;
        return (
          <div key={cultivoId} className={idx > 0 ? 'mt-3 pt-3 border-t' : ''}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {stats.nombre}
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-gray-600">
                <span>Volumen</span>
                <span>{stats.bolsas.toLocaleString('es-AR')} bolsas</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Monto</span>
                <span>${fmt(stats.monto)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>P. ponderado</span>
                <span>${fmt(precioPonderado)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Item Discounts Panel (right sidebar) ─────────────────────────────────────

function ItemDescuentosPanel({ isEditable, activeIds, pendingIds, allDescuentos, onToggle, onApplySelector, version, excludeIds }: {
  isEditable: boolean;
  activeIds: Set<number>;
  pendingIds: Set<number>;
  allDescuentos: Descuento[];
  onToggle: (desc: Descuento) => void;
  onApplySelector: (desc: Descuento, pct: number | null) => void;
  version: CotizacionVersion | undefined;
  excludeIds?: Set<number>;
}) {
  // Show non-global discounts + global selectors/manual (apply per-item)
  const nonGlobal = allDescuentos.filter((d) =>
    (d.tipoAplicacion !== 'global' || d.modo === 'selector' || d.modo === 'manual')
    && !(excludeIds?.has(d.id)),
  );
  if (nonGlobal.length === 0) return null;

  // Find currently applied pct for selector discounts
  function getAppliedSelectorPct(descId: number): number | null {
    if (!version) return null;
    for (const item of version.items ?? []) {
      const found = item.descuentos.find((d) => d.descuentoId === descId);
      if (found) return Number(found.valorPorcentaje);
    }
    return null;
  }

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Descuentos</h3>
      <div className="space-y-2">
        {nonGlobal.map((desc) => {
          const applied = activeIds.has(desc.id);
          const pending = pendingIds.has(desc.id);
          const isSelector = desc.modo === 'selector';
          const reglasSorted = [...(desc.reglas ?? [])].sort((a, b) => a.prioridad - b.prioridad);
          const appliedPct = isSelector ? getAppliedSelectorPct(desc.id) : null;
          const currentReglaId = isSelector && appliedPct != null
            ? (reglasSorted.find((r) => Number(r.valor) === appliedPct)?.id ?? '')
            : '';

          if (isSelector) {
            return (
              <div key={desc.id} className={`rounded-lg px-2 py-1.5 ${applied ? 'bg-orange-50' : ''} ${!isEditable ? 'opacity-60' : ''}`}>
                <div className="text-xs font-medium text-gray-600 mb-1">{desc.nombre}</div>
                <div className="flex items-center gap-2">
                  {pending ? (
                    <Spinner className="w-4 h-4 shrink-0 text-orange-500" />
                  ) : (
                    <select
                      disabled={!isEditable}
                      value={currentReglaId}
                      onChange={(e) => {
                        const reglaId = Number(e.target.value);
                        if (!reglaId) {
                          onApplySelector(desc, null);
                        } else {
                          const regla = reglasSorted.find((r) => r.id === reglaId);
                          if (regla) onApplySelector(desc, Number(regla.valor));
                        }
                      }}
                      className="flex-1 text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-400 disabled:cursor-default"
                    >
                      <option value="">— Ninguno —</option>
                      {reglasSorted.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nombre ?? `Opción ${r.prioridad}`} — {r.valor}%
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            );
          }

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

function DescuentosGlobalesPanel({ cotizacionId, version, isEditable, excludeIds }: {
  cotizacionId: number;
  version: CotizacionVersion;
  isEditable: boolean;
  excludeIds?: Set<number>;
}) {
  const qc = useQueryClient();
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [noAplicaId, setNoAplicaId] = useState<number | null>(null);

  const { data: allDescuentos = [] } = useQuery({
    queryKey: ['descuentos', 'activos'],
    queryFn: () => descuentosApi.getAll(true),
  });

  // Exclude selectors/manual — they're handled in ItemDescuentosPanel and shown as table columns
  // Also exclude section-variable discounts
  const descuentos = allDescuentos.filter((d) =>
    d.tipoAplicacion === 'global' && d.modo !== 'selector' && d.modo !== 'manual'
    && !(excludeIds?.has(d.id)),
  );
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

  async function applyDescuento(desc: Descuento, selectorPct?: number) {
    markPending(desc.id, true);
    try {
      let porcentaje: number | undefined;
      if (desc.modo === 'basico') {
        porcentaje = Number(desc.valorPorcentaje);
      } else if (desc.modo === 'selector') {
        if (selectorPct === undefined) return;
        porcentaje = selectorPct;
      } else {
        const results = await descuentosApi.evaluar({ tipoAplicacion: 'global' });
        const match = results.find((r) => r.descuentoId === desc.id);
        if (!match) { showNoAplica(desc.id); return; }
        porcentaje = match.porcentaje;
      }
      await cotizacionesApi.applyGlobalDescuento(cotizacionId, version.id, {
        descuentoId: desc.id,
        porcentaje,
      });
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
      <div className="space-y-2">
        {descuentos.map((desc) => {
          const applied = isApplied(desc);
          const pct = getAppliedPct(desc);
          const pending = pendingIds.has(desc.id);
          const noAplica = noAplicaId === desc.id;
          const isSelector = desc.modo === 'selector';
          const reglasSorted = [...(desc.reglas ?? [])].sort((a, b) => a.prioridad - b.prioridad);
          const currentReglaId = isSelector && pct != null
            ? (reglasSorted.find((r) => Number(r.valor) === Number(pct))?.id ?? '')
            : '';

          if (isSelector) {
            return (
              <div key={desc.id} className={`rounded-lg px-2 py-1.5 ${applied ? 'bg-orange-50' : ''} ${!isEditable ? 'opacity-60' : ''}`}>
                <div className="text-xs font-medium text-gray-600 mb-1">{desc.nombre}</div>
                <div className="flex items-center gap-2">
                  {pending ? (
                    <Spinner className="w-4 h-4 shrink-0 text-blue-500" />
                  ) : (
                    <select
                      disabled={!isEditable}
                      value={currentReglaId}
                      onChange={async (e) => {
                        const reglaId = Number(e.target.value);
                        if (!reglaId) {
                          await removeDescuento(desc);
                        } else {
                          const regla = reglasSorted.find((r) => r.id === reglaId);
                          if (regla) await applyDescuento(desc, Number(regla.valor));
                        }
                      }}
                      className="flex-1 text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:cursor-default"
                    >
                      <option value="">— Ninguno —</option>
                      {reglasSorted.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nombre ?? `Opción ${r.prioridad}`} — {r.valor}%
                        </option>
                      ))}
                    </select>
                  )}
                  {applied && pct != null && (
                    <span className="text-xs font-semibold text-orange-600 shrink-0">−{pct}%</span>
                  )}
                </div>
              </div>
            );
          }

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

const ESTADOS = ['generado', 'enviado', 'aceptado', 'perdido'] as const;
const ESTADO_LABEL: Record<string, string> = {
  generado: 'Generado',
  enviado:  'Enviado',
  aceptado: 'Aceptado',
  perdido:  'Perdido',
  // legacy
  borrador:  'Generado',
  enviada:   'Enviado',
  aprobada:  'Aceptado',
  rechazada: 'Perdido',
  cerrada:   'Perdido',
};

export function CotizacionEditorPage() {
  const { id } = useParams<{ id: string }>();
  const cotizacionId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [selectedCultivos, setSelectedCultivos] = useState<Set<number>>(new Set());
  const [showHistory, setShowHistory] = useState(false);
  const [rightWidth, setRightWidth] = useState(288);
  const [confirmEstado, setConfirmEstado] = useState<string | null>(null);

  // Discount state lifted to page level
  const [activeDiscountIds, setActiveDiscountIds] = useState<Set<number>>(new Set());
  const [pendingDiscountIds, setPendingDiscountIds] = useState<Set<number>>(new Set());

  // Section state
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showSeccionModal, setShowSeccionModal] = useState(false);
  const [seccionVariables, setSeccionVariables] = useState<Set<number>>(new Set());

  // Close dropdown on outside click
  useEffect(() => {
    if (!showAddMenu) return;
    const handler = () => setShowAddMenu(false);
    const timer = setTimeout(() => document.addEventListener('click', handler), 0);
    return () => { clearTimeout(timer); document.removeEventListener('click', handler); };
  }, [showAddMenu]);

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
  const { data: totals } = useQuery({
    queryKey: ['total', cotizacionId, selectedVersionId],
    queryFn: () => cotizacionesApi.getTotal(cotizacionId, selectedVersionId!),
    enabled: !!selectedVersionId,
    staleTime: 0,
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

  // Sync active discounts from version data (items → applied discount IDs)
  // Derives from version.items so it updates on every refetch, not just version switch
  const serverDiscountIds = useMemo(() => {
    if (!version) return new Set<number>();
    return new Set(
      (version.items ?? []).flatMap((i) => i.descuentos.map((d) => d.descuentoId))
    );
  }, [version]);

  useEffect(() => {
    if (!version) return;
    setActiveDiscountIds(serverDiscountIds);
  }, [serverDiscountIds]);

  useEffect(() => {
    if (selectedVersionId) {
      qc.refetchQueries({ queryKey: ['total', cotizacionId, selectedVersionId] });
    }
  }, [version, selectedVersionId, cotizacionId, qc]);

  // Active discounts as full objects (for passing to CultivoSection)
  // Include global selectors and manual discounts alongside non-global discounts
  const activeDescuentos = useMemo(
    () => allDescuentos.filter((d) =>
      (d.tipoAplicacion !== 'global' || d.modo === 'selector' || d.modo === 'manual') && activeDiscountIds.has(d.id)
    ),
    [allDescuentos, activeDiscountIds],
  );

  // PNG export
  const pngExport = useCotizacionExportPng({
    cotizacion: cotizacion ?? undefined,
    version: version ?? undefined,
    totals: totals ?? undefined,
    allDescuentos,
    activeDescuentos,
  });

  // Stats por cultivo: volumen (bolsas), monto (suma subtotales), precio ponderado
  // Se guardan como variables disponibles para el evaluador de descuentos
  const cultivoStats = useMemo(() => {
    const items = version?.items ?? [];
    const map = new Map<number, { bolsas: number; monto: number }>();
    for (const item of items) {
      const cur = map.get(item.cultivoId) ?? { bolsas: 0, monto: 0 };
      cur.bolsas += Number(item.bolsas);
      cur.monto += Number(item.precioBase);
      map.set(item.cultivoId, cur);
    }
    return map;
  }, [version]);

  const totalBolsas = useMemo(
    () => [...cultivoStats.values()].reduce((sum, s) => sum + s.bolsas, 0),
    [cultivoStats],
  );

  // ratio de bolsas de un cultivo sobre el total (para descuento cross selling)
  const getRatioCultivo = (cultivoId: number) =>
    totalBolsas > 0 ? Math.round(((cultivoStats.get(cultivoId)?.bolsas ?? 0) / totalBolsas) * 1e6) / 1e6 : 0;

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
        } else if (desc.modo === 'selector') {
          // selector discounts must be applied via the dropdown — skip auto-eval
        } else if (desc.modo === 'manual') {
          // manual discounts: apply with 0% initially, user edits % per item in the table
          await Promise.all(
            allItems.map((item) =>
              cotizacionesApi.applyItemDescuento(cotizacionId, version.id, item.id, {
                descuentoId: desc.id,
                porcentaje: 0,
              })
            )
          );
        } else {
          // Pre-compute global totals once (outside the per-item loop)
          const subtotalItems = allItems.reduce((s, i) => s + Number(i.subtotal), 0);
          const descuentosItemsVal = allItems.reduce((s, i) => {
            const pct = (i.descuentos ?? []).reduce((dp, d) => dp + Number(d.valorPorcentaje), 0);
            return s + Number(i.subtotal) * pct / 100;
          }, 0);
          const totalCotizacion = Number(version.total ?? 0);

          for (const item of allItems) {
            const stats = cultivoStats.get(item.cultivoId) ?? { bolsas: 0, monto: 0 };
            const precioPonderado = stats.bolsas > 0 ? Math.round((stats.monto / stats.bolsas) * 1e4) / 1e4 : undefined;
            const results = await descuentosApi.evaluar({
              tipoAplicacion: desc.tipoAplicacion as 'global',
              cultivoId: item.cultivoId,
              hibridoId: item.hibridoId,
              bandaId: item.bandaId,
              cantidad: Number(item.bolsas),
              precio: Number(item.precioBase),
              subtotal: Number(item.subtotal),
              ratioCultivo: getRatioCultivo(item.cultivoId),
              volumen: stats.bolsas,
              monto: stats.monto,
              ...(precioPonderado != null ? { precioPonderado } : {}),
              subtotalItems,
              descuentosItems: descuentosItemsVal,
              totalCotizacion,
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

  async function applySelector(desc: Descuento, porcentaje: number | null) {
    if (!isEditable || !version) return;
    markDiscPending(desc.id, true);
    const allItems = version.items ?? [];
    try {
      // Remove existing application first
      await Promise.all(
        allItems.flatMap((item) => {
          const found = item.descuentos.find((d) => d.descuentoId === desc.id);
          return found
            ? [cotizacionesApi.deleteItemDescuento(cotizacionId, version.id, item.id, found.descuentoId)]
            : [];
        })
      );
      if (porcentaje !== null) {
        await Promise.all(
          allItems.map((item) =>
            cotizacionesApi.applyItemDescuento(cotizacionId, version.id, item.id, {
              descuentoId: desc.id,
              porcentaje,
            })
          )
        );
        setActiveDiscountIds((prev) => { const n = new Set(prev); n.add(desc.id); return n; });
      } else {
        setActiveDiscountIds((prev) => { const n = new Set(prev); n.delete(desc.id); return n; });
      }
      invalidateVersion();
    } catch { /* silent */ } finally {
      markDiscPending(desc.id, false);
    }
  }

  const newVersionMut = useMutation({
    mutationFn: (nombre?: string) => cotizacionesApi.crearVersion(cotizacionId, nombre),
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

  const seccionMut = useMutation({
    mutationFn: (body: { nombre?: string; descuentosVariables: number[] }) =>
      cotizacionesApi.crearSeccion(cotizacionId, selectedVersionId!, body),
    onSuccess: () => {
      invalidateVersion();
      setShowSeccionModal(false);
      setSeccionVariables(new Set());
    },
  });

  const deleteSeccionMut = useMutation({
    mutationFn: (seccionId: number) =>
      cotizacionesApi.deleteSeccion(cotizacionId, selectedVersionId!, seccionId),
    onSuccess: () => invalidateVersion(),
  });

  // IDs of discounts managed by sections (should be hidden from the right panel)
  const hasSecciones = (version?.secciones ?? []).length > 0;
  const sectionVariableDescIds = useMemo(() => {
    const ids = new Set<number>();
    if (!version || !hasSecciones) return ids;
    for (const item of version.items ?? []) {
      for (const d of item.descuentos ?? []) {
        if (d.seccionId && d.descuentoId) ids.add(d.descuentoId);
      }
    }
    for (const d of version.descuentos ?? []) {
      if (d.seccionId && d.descuentoId) ids.add(d.descuentoId);
    }
    return ids;
  }, [version, hasSecciones]);

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
  const isLocked = cotizacion.estado === 'enviado' || cotizacion.estado === 'enviada';
  const isEditable = !isLocked && isLatestVersion;

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
        {/* Header + Client info */}
        <div className="flex items-center justify-between shrink-0 flex-wrap gap-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => navigate('/cotizaciones')} className="text-gray-400 hover:text-gray-700">←</button>
            <h1 className="text-xl font-semibold text-gray-900">{cotizacion.numero}</h1>
            <Badge label={cotizacion.estado} />
            {version && (
              <span className="text-sm text-gray-400">
                v{version.version}{version.nombre ? ` — ${version.nombre}` : ''}
              </span>
            )}
            <span className="text-gray-300">|</span>
            <span className="text-sm font-medium text-gray-700">{cotizacion.cliente?.nombre}</span>
            {cotizacion.cliente?.razonSocial && (
              <span className="text-sm text-gray-500">{cotizacion.cliente.razonSocial}</span>
            )}
            {cotizacion.cliente?.cuit && (
              <span className="text-xs text-gray-400 font-mono">CUIT: {cotizacion.cliente.cuit}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {new Date(cotizacion.fechaCreacion).toLocaleDateString('es-AR', { dateStyle: 'long' })}
            </span>
            {version && totals && (
              <button
                onClick={pngExport.download}
                className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Descargar PNG
              </button>
            )}
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
            >
              📋 Versiones
            </button>
            {isLatestVersion && (
              <div className="relative">
                <button
                  onClick={() => setShowAddMenu((v) => !v)}
                  disabled={newVersionMut.isPending || seccionMut.isPending}
                  className="px-3 py-1.5 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {newVersionMut.isPending || seccionMut.isPending ? <Spinner /> : '+'}
                </button>
                {showAddMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-20 min-w-[180px]">
                    <button
                      onClick={() => {
                        setShowAddMenu(false);
                        const nombre = prompt('Nombre para la nueva versión (opcional):');
                        if (nombre === null) return;
                        newVersionMut.mutate(nombre.trim() || undefined);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 rounded-t-lg"
                    >
                      Nueva versión
                    </button>
                    <button
                      onClick={() => {
                        setShowAddMenu(false);
                        setShowSeccionModal(true);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 rounded-b-lg border-t"
                    >
                      Agregar sección
                    </button>
                  </div>
                )}
              </div>
            )}
            <select
              value={cotizacion.estado}
              onChange={(e) => setConfirmEstado(e.target.value)}
              disabled={estadoMut.isPending}
              className="text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {ESTADOS.map((e) => (
                <option key={e} value={e}>{ESTADO_LABEL[e]}</option>
              ))}
              {!ESTADOS.includes(cotizacion.estado as any) && (
                <option value={cotizacion.estado}>{ESTADO_LABEL[cotizacion.estado] ?? cotizacion.estado}</option>
              )}
            </select>
          </div>
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
            ) : (version?.secciones ?? []).length > 0 ? (
              /* ── Renderizado con secciones ── */
              (() => {
                // Identify variable discount IDs (those with seccionId !== null)
                const variableDescIds = new Set<number>();
                for (const item of version!.items ?? []) {
                  for (const d of item.descuentos) {
                    if (d.seccionId && d.descuentoId) variableDescIds.add(d.descuentoId);
                  }
                }
                for (const d of version!.descuentos ?? []) {
                  if (d.seccionId && d.descuentoId) variableDescIds.add(d.descuentoId);
                }
                const variableDescs = allDescuentos.filter((d) => variableDescIds.has(d.id));

                return (version!.secciones ?? [])
                  .sort((a, b) => a.orden - b.orden)
                  .map((seccion) => {
                    const secTotal = totals?.secciones?.find((s) => s.seccionId === seccion.id);

                    const getSeccionPct = (descId: number): number | null => {
                      for (const item of version!.items ?? []) {
                        const found = item.descuentos.find(
                          (d) => d.descuentoId === descId && d.seccionId === seccion.id,
                        );
                        if (found) return Number(found.valorPorcentaje);
                      }
                      const globalFound = (version!.descuentos ?? []).find(
                        (d) => d.descuentoId === descId && d.seccionId === seccion.id,
                      );
                      if (globalFound) return Number(globalFound.valorPorcentaje);
                      return null;
                    };

                    // Render variable discount selectors inline
                    const discountSelectors = variableDescs.map((desc) => {
                      const appliedPct = getSeccionPct(desc.id);
                      const isSelMode = desc.modo === 'selector';
                      const reglasSorted = [...(desc.reglas ?? [])].sort((a, b) => a.prioridad - b.prioridad);
                      const currentReglaId = isSelMode && appliedPct != null
                        ? (reglasSorted.find((r) => Number(r.valor) === appliedPct)?.id ?? '')
                        : '';

                      const updatePct = async (pct: number) => {
                        await cotizacionesApi.updateSeccionDescuento(
                          cotizacionId, version!.id, seccion.id, desc.id, pct,
                        );
                        invalidateVersion();
                      };

                      return (
                        <span key={desc.id} className="inline-flex items-center gap-1.5 bg-orange-50 rounded px-2 py-0.5">
                          <span className="text-xs font-medium text-gray-600">{desc.nombre}:</span>
                          {isSelMode ? (
                            <select
                              disabled={!isEditable}
                              value={currentReglaId}
                              onChange={(e) => {
                                const regla = reglasSorted.find((r) => r.id === Number(e.target.value));
                                updatePct(regla ? Number(regla.valor) : 0);
                              }}
                              className="text-xs border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-orange-400 disabled:cursor-default"
                            >
                              <option value="">— Ninguno —</option>
                              {reglasSorted.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.nombre ?? `Opción ${r.prioridad}`} — {r.valor}%
                                </option>
                              ))}
                            </select>
                          ) : (
                            <>
                              <input
                                type="number"
                                disabled={!isEditable}
                                defaultValue={appliedPct ?? 0}
                                key={`${seccion.id}-${desc.id}-${appliedPct}`}
                                min={0} max={100} step={0.5}
                                onBlur={(e) => {
                                  const pct = Math.max(0, Math.min(100, Number(e.target.value)));
                                  if (pct !== appliedPct) updatePct(pct);
                                }}
                                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                className="w-14 text-xs border rounded px-1.5 py-0.5 text-right focus:outline-none focus:ring-1 focus:ring-orange-400 disabled:cursor-default"
                              />
                              <span className="text-xs text-gray-400">%</span>
                            </>
                          )}
                        </span>
                      );
                    });

                    return (
                      <div key={seccion.id} className="space-y-4">
                        {/* Section label + selectors inline, directly above tables */}
                        <div className="flex items-center gap-2 flex-wrap px-1">
                          <h3 className="text-sm font-semibold text-gray-700">
                            {seccion.nombre ?? `Sección ${seccion.orden + 1}`}
                          </h3>
                          {discountSelectors}
                          {secTotal && (
                            <span className="text-xs text-gray-500 ml-auto">
                              Total: ${secTotal.total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                          {isEditable && (version!.secciones ?? []).length > 1 && (
                            <button
                              onClick={() => deleteSeccionMut.mutate(seccion.id)}
                              disabled={deleteSeccionMut.isPending}
                              className="text-xs text-red-400 hover:text-red-600"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        {activeCultivos.map((cultivo) => {
                          const stats = cultivoStats.get(cultivo.id) ?? { bolsas: 0, monto: 0 };
                          const itemsWithSeccion = (version?.items ?? [])
                            .filter((i) => i.cultivoId === cultivo.id)
                            .map((item) => ({
                              ...item,
                              descuentos: item.descuentos.filter(
                                (d) => !d.seccionId || d.seccionId === seccion.id,
                              ),
                            }));
                          return (
                            <CultivoSection
                              key={`${seccion.id}-${cultivo.id}`}
                              cultivo={cultivo}
                              items={itemsWithSeccion}
                              cotizacionId={cotizacionId}
                              version={version!}
                              isEditable={isEditable}
                              activeDescuentos={activeDescuentos}
                              cultivoVolumen={stats.bolsas}
                              cultivoMonto={stats.monto}
                              totalBolsas={totalBolsas}
                            />
                          );
                        })}
                        <hr className="border-gray-200" />
                      </div>
                    );
                  });
              })()
            ) : (
              /* ── Renderizado sin secciones (default) ── */
              activeCultivos.map((cultivo) => {
                const stats = cultivoStats.get(cultivo.id) ?? { bolsas: 0, monto: 0 };
                return (
                  <CultivoSection
                    key={cultivo.id}
                    cultivo={cultivo}
                    items={(version?.items ?? []).filter((i) => i.cultivoId === cultivo.id)}
                    cotizacionId={cotizacionId}
                    version={version!}
                    isEditable={isEditable}
                    activeDescuentos={activeDescuentos}
                    cultivoVolumen={stats.bolsas}
                    cultivoMonto={stats.monto}
                    totalBolsas={totalBolsas}
                  />
                );
              })
            )}
          </div>

          <ResizeDivider onDrag={(dx) => setRightWidth((w) => Math.max(200, Math.min(600, w + dx)))} />

          {/* Right panel — independent scroll */}
          <div style={{ width: rightWidth }} className="shrink-0 overflow-y-auto space-y-4">
            <ItemDescuentosPanel
              isEditable={isEditable}
              activeIds={activeDiscountIds}
              pendingIds={pendingDiscountIds}
              allDescuentos={allDescuentos}
              onToggle={toggleDiscount}
              onApplySelector={applySelector}
              version={version}
              excludeIds={sectionVariableDescIds}
            />
            {version && (
              <DescuentosGlobalesPanel
                cotizacionId={cotizacionId}
                version={version}
                isEditable={isEditable}
                excludeIds={sectionVariableDescIds}
              />
            )}
            <FeedPanelInline />
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

      {/* ── Modal crear sección ── */}
      {showSeccionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-[440px] p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Agregar sección</h3>
            <p className="text-sm text-gray-600">
              Seleccioná los descuentos que van a <strong>variar</strong> entre secciones.
              Los demás se comparten automáticamente.
            </p>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {allDescuentos.filter((d) => {
                // Show discounts active in items OR in global descuentos
                if (activeDiscountIds.has(d.id)) return true;
                if (version?.descuentos?.some((vd) => vd.descuentoId === d.id)) return true;
                return false;
              }).map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={seccionVariables.has(d.id)}
                    onChange={() => setSeccionVariables((prev) => {
                      const n = new Set(prev);
                      n.has(d.id) ? n.delete(d.id) : n.add(d.id);
                      return n;
                    })}
                  />
                  <span>{d.nombre}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {d.valorPorcentaje != null ? `${d.valorPorcentaje}%` : d.modo}
                  </span>
                </label>
              ))}
              {allDescuentos.filter((d) =>
                activeDiscountIds.has(d.id) || version?.descuentos?.some((vd) => vd.descuentoId === d.id)
              ).length === 0 && (
                <p className="text-sm text-gray-400 italic">No hay descuentos activos en esta versión.</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setShowSeccionModal(false); setSeccionVariables(new Set()); }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => seccionMut.mutate({ descuentosVariables: [...seccionVariables] })}
                disabled={seccionMut.isPending || seccionVariables.size === 0}
                className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                {seccionMut.isPending ? <Spinner /> : 'Crear sección'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmación de cambio de estado ── */}
      {confirmEstado && (() => {
        const desde = ESTADO_LABEL[cotizacion.estado] ?? cotizacion.estado;
        const hacia = ESTADO_LABEL[confirmEstado] ?? confirmEstado;
        const bloqueaEdicion = confirmEstado === 'enviado';
        const desbloqueaEdicion = isLocked && confirmEstado !== 'enviado';
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-[400px] p-6 space-y-4">
              <h3 className="text-base font-semibold text-gray-900">Cambiar estado</h3>
              <p className="text-sm text-gray-600">
                ¿Cambiar de <span className="font-medium">{desde}</span> a{' '}
                <span className="font-medium">{hacia}</span>?
              </p>
              {bloqueaEdicion && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  La cotización quedará <strong>bloqueada para edición</strong> hasta que cambies el estado nuevamente.
                </p>
              )}
              {desbloqueaEdicion && (
                <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                  La cotización volverá a estar <strong>disponible para edición</strong>.
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  onClick={() => setConfirmEstado(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  disabled={estadoMut.isPending}
                  onClick={() => { estadoMut.mutate(confirmEstado); setConfirmEstado(null); }}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {estadoMut.isPending ? 'Cambiando…' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {/* Hidden node for PNG export */}
      {version && totals && pngExport.node}
    </Layout>
  );
}
