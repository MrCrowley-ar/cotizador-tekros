import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { descuentosApi } from '../../api/descuentos';
import { productosApi } from '../../api/productos';
import { Modal } from '../../components/Modal';
import { Spinner } from '../../components/Spinner';
import { Badge } from '../../components/Badge';
import type { Descuento } from '../../api/types';

// ─── Tipos internos ───────────────────────────────────────────────────────────

type ModoValor = 'fijo' | 'por_cultivo' | 'por_rango' | 'por_selector';
type DriverRango = 'cantidad' | 'precio' | 'subtotal' | 'ratio_cultivo';

interface Tramo { id: string; desde: string; pct: string }
interface OpcionSelector { id: string; nombre: string; pct: string }

let _ctr = 0;
function newId() { return `i${++_ctr}`; }

// ─── Helpers para display ─────────────────────────────────────────────────────

function inferirModoValor(d: Descuento): ModoValor {
  if (d.modo === 'selector') return 'por_selector';
  if (d.modo === 'basico') return 'fijo';
  const todasCultivoId = (d.reglas ?? []).every(
    (r) => r.condiciones?.length === 1 && r.condiciones[0].campo === 'cultivo_id',
  );
  if (todasCultivoId) return 'por_cultivo';
  const tieneRango = (d.reglas ?? []).some((r) =>
    r.condiciones?.some((c) =>
      c.campo === 'cantidad' || c.campo === 'precio' ||
      c.campo === 'subtotal' || c.campo === 'ratio_cultivo',
    ),
  );
  if (tieneRango) return 'por_rango';
  return 'fijo';
}

function inferirDriverRango(d: Descuento): DriverRango {
  for (const r of d.reglas ?? []) {
    for (const c of r.condiciones ?? []) {
      if (c.campo === 'precio') return 'precio';
      if (c.campo === 'subtotal') return 'subtotal';
      if (c.campo === 'ratio_cultivo') return 'ratio_cultivo';
      if (c.campo === 'cantidad') return 'cantidad';
    }
  }
  return 'cantidad';
}

const MODO_LABEL: Record<ModoValor, string> = {
  fijo: 'Fijo',
  por_cultivo: 'Por cultivo',
  por_rango: 'Por rango',
  por_selector: 'Por selector',
};

const DRIVER_LABEL: Record<DriverRango, string> = {
  cantidad: 'Bolsas',
  precio: 'Precio base ($)',
  subtotal: 'Subtotal ($)',
  ratio_cultivo: 'Ratio cultivo',
};

// ─── Modal de formulario ──────────────────────────────────────────────────────

function DescuentoFormModal({ initial, onClose }: { initial?: Descuento; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!initial;

  const [nombre, setNombre] = useState(initial?.nombre ?? '');
  const [fechaVigencia, setFechaVigencia] = useState(
    initial?.fechaVigencia
      ? new Date(initial.fechaVigencia).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  );
  const [error, setError] = useState('');

  // ── Modo de valor ──
  const [modoValor, setModoValor] = useState<ModoValor>(
    initial ? inferirModoValor(initial) : 'fijo',
  );

  // Fijo
  const [pctFijo, setPctFijo] = useState(
    initial?.valorPorcentaje != null ? String(initial.valorPorcentaje) : '',
  );

  // Por cultivo
  const [pctPorCultivo, setPctPorCultivo] = useState<Record<number, string>>(() => {
    if (!initial || inferirModoValor(initial) !== 'por_cultivo') return {};
    const map: Record<number, string> = {};
    (initial.reglas ?? []).forEach((r) => {
      const cond = r.condiciones?.find((c) => c.campo === 'cultivo_id');
      if (cond) map[cond.valor] = String(r.valor);
    });
    return map;
  });

  // Por rango
  const [driver, setDriver] = useState<DriverRango>(
    initial ? inferirDriverRango(initial) : 'cantidad',
  );
  const [tramos, setTramos] = useState<Tramo[]>(() => {
    if (!initial || inferirModoValor(initial) !== 'por_rango') return [];
    return [...(initial.reglas ?? [])]
      .sort((a, b) => b.prioridad - a.prioridad)
      .map((r) => {
        const gteC = r.condiciones?.find((c) => c.operador === '>=' || c.operador === '>');
        return { id: newId(), desde: String(gteC?.valor ?? 0), pct: String(r.valor) };
      })
      .filter((t) => t.desde !== '0');
  });
  const [pctDefault, setPctDefault] = useState(() => {
    if (!initial || inferirModoValor(initial) !== 'por_rango') return '';
    const def = (initial.reglas ?? []).find((r) => {
      const gteC = r.condiciones?.find((c) => c.operador === '>=' || c.operador === '>');
      return !gteC || Number(gteC.valor) === 0;
    });
    return def ? String(def.valor) : '';
  });

  // Por selector
  const [opciones, setOpciones] = useState<OpcionSelector[]>(() => {
    if (!initial || inferirModoValor(initial) !== 'por_selector') return [];
    return [...(initial.reglas ?? [])]
      .sort((a, b) => a.prioridad - b.prioridad)
      .map((r) => ({ id: newId(), nombre: r.nombre ?? '', pct: String(r.valor) }));
  });

  // Cultivos (para "Por cultivo")
  const { data: cultivos = [] } = useQuery({
    queryKey: ['cultivos'],
    queryFn: () => productosApi.getCultivos(true),
    enabled: modoValor === 'por_cultivo',
  });

  // ── Guardar ──
  const saveMut = useMutation({
    mutationFn: () => {
      type CondOp = '>=' | '=';

      if (modoValor === 'fijo') {
        const payload = {
          nombre, tipoAplicacion: 'global' as const,
          modo: 'basico' as const,
          valorPorcentaje: Number(pctFijo),
          fechaVigencia,
        };
        return isEdit ? descuentosApi.update(initial!.id, payload) : descuentosApi.create(payload);
      }

      if (modoValor === 'por_cultivo') {
        const reglas = cultivos
          .filter((c) => pctPorCultivo[c.id] && Number(pctPorCultivo[c.id]) > 0)
          .map((c, i) => ({
            valor: Number(pctPorCultivo[c.id]),
            prioridad: i + 1,
            condiciones: [{ campo: 'cultivo_id' as const, operador: '=' as CondOp, valor: c.id }],
          }));
        const payload = {
          nombre, tipoAplicacion: 'cultivo' as const,
          modo: 'avanzado' as const, fechaVigencia, reglas,
        };
        return isEdit ? descuentosApi.update(initial!.id, payload) : descuentosApi.create(payload);
      }

      if (modoValor === 'por_rango') {
        const tramosValidos = [...tramos]
          .filter((t) => t.desde !== '' && Number(t.desde) > 0 && t.pct !== '')
          .sort((a, b) => Number(b.desde) - Number(a.desde));
        const reglas = [
          ...tramosValidos.map((t, i) => ({
            valor: Number(t.pct),
            prioridad: tramosValidos.length + 1 - i,
            condiciones: [{ campo: driver as string, operador: '>=' as CondOp, valor: Number(t.desde) }],
          })),
          ...(pctDefault !== ''
            ? [{ valor: Number(pctDefault), prioridad: 1,
                condiciones: [{ campo: driver as string, operador: '>=' as CondOp, valor: 0 }] }]
            : []),
        ];
        const payload = {
          nombre, tipoAplicacion: 'hibrido' as const,
          modo: 'avanzado' as const, fechaVigencia, reglas,
        };
        return isEdit ? descuentosApi.update(initial!.id, payload) : descuentosApi.create(payload);
      }

      // por_selector
      const reglas = opciones
        .filter((o) => o.nombre.trim() !== '' && o.pct !== '')
        .map((o, i) => ({
          nombre: o.nombre.trim(),
          valor: Number(o.pct),
          prioridad: i + 1,
          condiciones: [] as any[],
        }));
      const payload = {
        nombre, tipoAplicacion: 'global' as const,
        modo: 'selector' as const, fechaVigencia, reglas,
      };
      return isEdit ? descuentosApi.update(initial!.id, payload) : descuentosApi.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['descuentos'] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  // ── Validación ──
  const canSave = (() => {
    if (!nombre.trim() || !fechaVigencia) return false;
    if (modoValor === 'fijo') return pctFijo !== '' && Number(pctFijo) >= 0;
    if (modoValor === 'por_cultivo')
      return cultivos.some((c) => pctPorCultivo[c.id] && Number(pctPorCultivo[c.id]) > 0);
    if (modoValor === 'por_rango')
      return pctDefault !== '' || tramos.some((t) => t.desde !== '' && Number(t.desde) > 0 && t.pct !== '');
    // por_selector
    return opciones.some((o) => o.nombre.trim() !== '' && o.pct !== '');
  })();

  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';
  const inputCls = 'border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  const modoCards: { value: ModoValor; label: string; desc: string }[] = [
    { value: 'fijo', label: 'Fijo', desc: 'Un % igual para todos los ítems' },
    { value: 'por_cultivo', label: 'Por cultivo', desc: '% distinto según el cultivo' },
    { value: 'por_rango', label: 'Por rango', desc: '% según bolsas, precio u otra variable' },
    { value: 'por_selector', label: 'Por selector', desc: 'El usuario elige la opción al cotizar' },
  ];

  return (
    <Modal title={isEdit ? `Editar: ${initial!.nombre}` : 'Nuevo descuento'} onClose={onClose}>
      <div className="space-y-5 max-h-[76vh] overflow-y-auto pr-1">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

        {/* Nombre + Fecha */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Nombre *</label>
            <input
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="ej: Pre-campaña Soja 2025"
              className={`w-full ${inputCls}`}
            />
          </div>
          <div>
            <label className={labelCls}>Vigencia hasta *</label>
            <input
              type="date"
              value={fechaVigencia}
              onChange={(e) => setFechaVigencia(e.target.value)}
              className={`w-full ${inputCls}`}
            />
          </div>
        </div>

        {/* Modo de valor */}
        <div>
          <label className={labelCls}>¿Cómo se determina el porcentaje?</label>
          <div className="grid grid-cols-2 gap-2">
            {modoCards.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setModoValor(m.value)}
                className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  modoValor === m.value
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className={`text-sm font-medium ${modoValor === m.value ? 'text-blue-700' : 'text-gray-800'}`}>
                  {m.label}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* ── Fijo ── */}
        {modoValor === 'fijo' && (
          <div>
            <label className={labelCls}>Porcentaje de descuento *</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={pctFijo}
                onChange={(e) => setPctFijo(e.target.value)}
                placeholder="ej: 5.00"
                className={`${inputCls} w-32 text-right`}
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>
        )}

        {/* ── Por cultivo ── */}
        {modoValor === 'por_cultivo' && (
          <div>
            <label className={labelCls}>Porcentaje por cultivo *</label>
            <p className="text-xs text-gray-400 mb-2">
              Dejá en 0 o vacío los cultivos sin descuento (no se aplica).
            </p>
            {cultivos.length === 0 ? (
              <div className="flex justify-center py-4"><Spinner /></div>
            ) : (
              <div className="space-y-2">
                {cultivos.map((c) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-28 shrink-0">{c.nombre}</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={pctPorCultivo[c.id] ?? ''}
                      onChange={(e) =>
                        setPctPorCultivo((prev) => ({ ...prev, [c.id]: e.target.value }))
                      }
                      placeholder="0"
                      className={`${inputCls} w-24 text-right`}
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Por rango ── */}
        {modoValor === 'por_rango' && (
          <div className="space-y-3">
            <div>
              <label className={labelCls}>¿Qué variable define el rango?</label>
              <div className="flex gap-2 flex-wrap">
                {(Object.entries(DRIVER_LABEL) as [DriverRango, string][]).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setDriver(v)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      driver === v
                        ? 'bg-blue-600 border-blue-600 text-white font-medium'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {driver === 'ratio_cultivo' && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1.5">
                  El ratio se calcula como bolsas del cultivo ÷ total de bolsas de la cotización.
                  Usá 0.33 como umbral para "1/3 del total".
                </p>
              )}
            </div>

            <div className="space-y-2">
              {[...tramos]
                .sort((a, b) => Number(b.desde) - Number(a.desde))
                .map((t) => (
                  <div key={t.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5 group">
                    <span className="text-xs font-semibold text-blue-700 shrink-0 w-4">SI</span>
                    <span className="text-xs text-gray-500 shrink-0">{DRIVER_LABEL[driver]}</span>
                    <span className="text-xs font-mono text-blue-500 shrink-0">≥</span>
                    <input
                      type="number"
                      min={0}
                      step={driver === 'ratio_cultivo' ? 0.01 : 1}
                      value={t.desde}
                      onChange={(e) =>
                        setTramos((prev) =>
                          prev.map((x) => x.id === t.id ? { ...x, desde: e.target.value } : x)
                        )
                      }
                      className="w-20 border rounded-md px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="umbral"
                    />
                    <span className="text-xs text-gray-400 mx-0.5">→</span>
                    <span className="text-xs text-gray-500 shrink-0">aplicar</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={t.pct}
                      onChange={(e) =>
                        setTramos((prev) =>
                          prev.map((x) => x.id === t.id ? { ...x, pct: e.target.value } : x)
                        )
                      }
                      className="w-16 border rounded-md px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                    <span className="text-xs text-gray-500">%</span>
                    <button
                      type="button"
                      onClick={() => setTramos((prev) => prev.filter((x) => x.id !== t.id))}
                      className="ml-auto text-gray-300 hover:text-red-500 text-base leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}

              <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
                <span className="text-xs font-semibold text-amber-700 shrink-0">EN LOS DEMÁS CASOS</span>
                <span className="text-xs text-gray-400 mx-0.5">→</span>
                <span className="text-xs text-gray-500 shrink-0">aplicar</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={pctDefault}
                  onChange={(e) => setPctDefault(e.target.value)}
                  className="w-16 border rounded-md px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                  placeholder="0"
                />
                <span className="text-xs text-gray-500">%</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTramos((prev) => [...prev, { id: newId(), desde: '', pct: '' }])}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              + Agregar condición
            </button>
          </div>
        )}

        {/* ── Por selector ── */}
        {modoValor === 'por_selector' && (
          <div className="space-y-2">
            <label className={labelCls}>Opciones disponibles *</label>
            <p className="text-xs text-gray-400 mb-1">
              Al aplicar el descuento en la cotización, el usuario elige la opción activa.
            </p>
            {opciones.map((o, idx) => (
              <div key={o.id} className="flex items-center gap-2 group">
                <span className="text-xs text-gray-400 w-5 text-right shrink-0">{idx + 1}.</span>
                <input
                  type="text"
                  value={o.nombre}
                  onChange={(e) =>
                    setOpciones((prev) =>
                      prev.map((x) => x.id === o.id ? { ...x, nombre: e.target.value } : x)
                    )
                  }
                  placeholder="ej: Contado"
                  className={`${inputCls} flex-1`}
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={o.pct}
                  onChange={(e) =>
                    setOpciones((prev) =>
                      prev.map((x) => x.id === o.id ? { ...x, pct: e.target.value } : x)
                    )
                  }
                  placeholder="0"
                  className={`${inputCls} w-20 text-right`}
                />
                <span className="text-xs text-gray-500 shrink-0">%</span>
                <button
                  type="button"
                  onClick={() => setOpciones((prev) => prev.filter((x) => x.id !== o.id))}
                  className="text-gray-300 hover:text-red-500 text-base leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setOpciones((prev) => [...prev, { id: newId(), nombre: '', pct: '' }])}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              + Agregar opción
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
          Cancelar
        </button>
        <button
          type="button"
          disabled={!canSave || saveMut.isPending}
          onClick={() => saveMut.mutate()}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saveMut.isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Guardar'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Modal detalle / editar / eliminar ────────────────────────────────────────

function DescuentoDetailModal({ descuento, onClose }: { descuento: Descuento; onClose: () => void }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'view' | 'edit' | 'deleteConfirm'>('view');
  const [usoCount, setUsoCount] = useState<number | null>(null);

  const toggleMut = useMutation({
    mutationFn: () => descuentosApi.toggle(descuento.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['descuentos'] }); onClose(); },
  });
  const deleteMut = useMutation({
    mutationFn: () => descuentosApi.delete(descuento.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['descuentos'] }); onClose(); },
  });

  const handleDeleteClick = async () => {
    const count = await descuentosApi.getUso(descuento.id).then((r) => r.count);
    setUsoCount(count);
    setMode('deleteConfirm');
  };

  if (mode === 'edit') return <DescuentoFormModal initial={descuento} onClose={onClose} />;

  if (mode === 'deleteConfirm') {
    return (
      <Modal title="Eliminar descuento" onClose={onClose}>
        <div className="space-y-4">
          {usoCount !== null && usoCount > 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              <p className="font-medium mb-1">Este descuento está en uso</p>
              <p>
                Está aplicado en <strong>{usoCount}</strong> cotización(es). Al eliminarlo, esas
                referencias quedarán sin descuento asociado. Los porcentajes ya calculados{' '}
                <strong>no cambian</strong>.
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              ¿Confirmar eliminación del descuento <strong>"{descuento.nombre}"</strong>?
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button onClick={() => setMode('view')} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Cancelar
            </button>
            <button
              disabled={deleteMut.isPending}
              onClick={() => deleteMut.mutate()}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {deleteMut.isPending ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  const modoV = inferirModoValor(descuento);

  return (
    <Modal title={descuento.nombre} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
            {MODO_LABEL[modoV]}
          </span>
          {modoV === 'por_rango' && (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
              {DRIVER_LABEL[inferirDriverRango(descuento)]}
            </span>
          )}
          <Badge label={descuento.activo ? 'activo' : 'inactivo'} />
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
          <div>
            <span className="text-gray-400">Vigencia:</span>{' '}
            <span className="font-medium">
              {new Date(descuento.fechaVigencia).toLocaleDateString('es-AR')}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Aplica a:</span>{' '}
            <span className="font-medium">
              {descuento.tipoAplicacion === 'global'
                ? 'Cotización completa'
                : descuento.tipoAplicacion === 'cultivo'
                ? 'Por cultivo'
                : 'Por ítem'}
            </span>
          </div>
        </div>

        {modoV === 'fijo' && (
          <div className="bg-blue-50 rounded-lg p-3 text-sm flex items-center gap-2">
            <span className="text-gray-600">Porcentaje fijo:</span>
            <span className="font-bold text-blue-700 text-lg">{descuento.valorPorcentaje}%</span>
          </div>
        )}

        {modoV === 'por_cultivo' && (
          <div className="text-sm">
            <div className="font-medium text-gray-700 mb-2">Porcentaje por cultivo:</div>
            <div className="space-y-1">
              {(descuento.reglas ?? []).map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5">
                  <span className="text-gray-600">
                    {r.condiciones?.[0]?.campo === 'cultivo_id'
                      ? `Cultivo #${r.condiciones[0].valor}`
                      : `Regla #${r.prioridad}`}
                  </span>
                  <span className="font-semibold text-blue-700">{r.valor}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {modoV === 'por_rango' && (
          <div className="text-sm">
            <div className="font-medium text-gray-700 mb-2">
              Tramos por {DRIVER_LABEL[inferirDriverRango(descuento)]}:
            </div>
            <div className="space-y-1">
              {[...(descuento.reglas ?? [])]
                .sort((a, b) => a.prioridad - b.prioridad)
                .map((r) => {
                  const gteC = r.condiciones?.find((c) => c.operador === '>=');
                  return (
                    <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5">
                      <span className="text-gray-600">
                        {gteC ? (Number(gteC.valor) === 0 ? 'En los demás casos' : `Desde ${gteC.valor}`) : 'Siempre'}
                      </span>
                      <span className="font-semibold text-blue-700">{r.valor}%</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {modoV === 'por_selector' && (
          <div className="text-sm">
            <div className="font-medium text-gray-700 mb-2">Opciones:</div>
            <div className="space-y-1">
              {[...(descuento.reglas ?? [])]
                .sort((a, b) => a.prioridad - b.prioridad)
                .map((r) => (
                  <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5">
                    <span className="text-gray-600">{r.nombre ?? `Opción ${r.prioridad}`}</span>
                    <span className="font-semibold text-blue-700">{r.valor}%</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="flex justify-between pt-2 border-t">
          <button
            disabled={deleteMut.isPending}
            onClick={handleDeleteClick}
            className="px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg disabled:opacity-50"
          >
            Eliminar
          </button>
          <div className="flex gap-2">
            <button
              disabled={toggleMut.isPending}
              onClick={() => toggleMut.mutate()}
              className={`px-4 py-2 text-sm rounded-lg disabled:opacity-50 ${
                descuento.activo
                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {toggleMut.isPending ? '...' : descuento.activo ? 'Desactivar' : 'Activar'}
            </button>
            <button
              onClick={() => setMode('edit')}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Editar
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── DescuentosTab ────────────────────────────────────────────────────────────

export function DescuentosTab() {
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<Descuento | null>(null);

  const { data: descuentos = [], isLoading } = useQuery({
    queryKey: ['descuentos'],
    queryFn: () => descuentosApi.getAll(false),
  });

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowNew(true)}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Nuevo descuento
        </button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Alcance</th>
              <th className="text-left px-4 py-3">Valor / Reglas</th>
              <th className="text-left px-4 py-3">Vigencia</th>
              <th className="text-left px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {descuentos.map((d) => {
              const modoV = inferirModoValor(d);
              return (
                <tr
                  key={d.id}
                  onClick={() => setSelected(d)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{d.nombre}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                        {MODO_LABEL[modoV]}
                      </span>
                      {modoV === 'por_rango' && (
                        <span className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          {DRIVER_LABEL[inferirDriverRango(d)]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {d.modo === 'basico'
                      ? `${d.valorPorcentaje}%`
                      : d.modo === 'selector'
                      ? `${d.reglas?.length ?? 0} opción(es)`
                      : `${d.reglas?.length ?? 0} regla(s)`}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(d.fechaVigencia).toLocaleDateString('es-AR')}
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={d.activo ? 'activo' : 'inactivo'} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {descuentos.length === 0 && (
          <p className="text-center py-8 text-gray-400 text-sm">Sin descuentos configurados.</p>
        )}
      </div>

      {showNew && <DescuentoFormModal onClose={() => setShowNew(false)} />}
      {selected && <DescuentoDetailModal descuento={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
