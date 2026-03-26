import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { descuentosApi } from '../../api/descuentos';
import { productosApi } from '../../api/productos';
import { Modal } from '../../components/Modal';
import { Spinner } from '../../components/Spinner';
import { Badge } from '../../components/Badge';
import type { Descuento, Hibrido, TipoAplicacion } from '../../api/types';

// ─── Tipos internos ───────────────────────────────────────────────────────────

type Alcance = 'cultivo' | 'hibrido' | 'personalizado';
type CampoCond = 'cantidad' | 'precio' | 'subtotal';

// Conditional block: "SI campo >= desde → aplicar pct%"
interface Tramo { id: string; desde: string; pct: string }

let _tramoCtr = 0;
function newTramoId() { return `t${++_tramoCtr}`; }

// ─── Inferir alcance para display ────────────────────────────────────────────

function inferirAlcance(d: Descuento): Alcance {
  if (d.tipoAplicacion === 'cultivo') return 'cultivo';
  if (d.modo === 'basico') return 'hibrido';
  const esPersonalizado = (d.reglas ?? []).every(
    (r) => r.condiciones?.length === 1 && r.condiciones[0].campo === 'hibrido_id',
  );
  return esPersonalizado ? 'personalizado' : 'hibrido';
}

function esCondicional(d: Descuento): boolean {
  if (d.modo !== 'avanzado') return false;
  if (inferirAlcance(d) === 'personalizado') return false;
  return (d.reglas ?? []).some(
    (r) => r.condiciones?.some((c) =>
      c.campo === 'cantidad' || c.campo === 'precio' || c.campo === 'subtotal',
    ),
  );
}

function inferirCampo(d: Descuento): CampoCond {
  for (const r of d.reglas ?? []) {
    for (const c of r.condiciones ?? []) {
      if (c.campo === 'precio') return 'precio';
      if (c.campo === 'subtotal') return 'subtotal';
      if (c.campo === 'cantidad') return 'cantidad';
    }
  }
  return 'cantidad';
}

const ALCANCE_LABEL: Record<Alcance, string> = {
  cultivo: 'Por cultivo',
  hibrido: 'Por híbrido',
  personalizado: 'Personalizado',
};

const CAMPO_LABEL: Record<CampoCond, string> = {
  cantidad: 'Bolsas',
  precio: 'Precio base ($)',
  subtotal: 'Subtotal ($)',
};

// ─── Modal de formulario ──────────────────────────────────────────────────────

function DescuentoFormModal({ initial, onClose }: { initial?: Descuento; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!initial;

  // Campos
  const [nombre, setNombre] = useState(initial?.nombre ?? '');
  const [fechaVigencia, setFechaVigencia] = useState(
    initial?.fechaVigencia
      ? new Date(initial.fechaVigencia).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  );
  const [porcentaje, setPorcentaje] = useState(
    initial?.valorPorcentaje != null ? String(initial.valorPorcentaje) : '',
  );
  const [alcance, setAlcance] = useState<Alcance>(initial ? inferirAlcance(initial) : 'hibrido');

  // Por cultivo: { cultivoId → porcentaje string }
  const [pctPorCultivo, setPctPorCultivo] = useState<Record<number, string>>(() => {
    if (!initial || inferirAlcance(initial) !== 'cultivo') return {};
    if (initial.modo !== 'avanzado' || esCondicional(initial)) return {};
    const map: Record<number, string> = {};
    (initial.reglas ?? []).forEach((r) => {
      const cond = r.condiciones?.find((c) => c.campo === 'cultivo_id');
      if (cond) map[cond.valor] = String(r.valor);
    });
    return map;
  });

  // Personalizado: IDs de híbridos seleccionados
  const [hibridosSelec, setHibridosSelec] = useState<Set<number>>(() => {
    if (!initial || inferirAlcance(initial) !== 'personalizado') return new Set();
    const ids = new Set<number>();
    (initial.reglas ?? []).forEach((r) => {
      r.condiciones?.forEach((c) => { if (c.campo === 'hibrido_id') ids.add(c.valor); });
    });
    return ids;
  });

  // Condicional
  const [condicional, setCondicional] = useState(initial ? esCondicional(initial) : false);
  const [campo, setCampo] = useState<CampoCond>(initial ? inferirCampo(initial) : 'cantidad');

  // Build tramos + pctDefault from existing reglas
  const [tramos, setTramos] = useState<Tramo[]>(() => {
    if (!initial || !esCondicional(initial)) return [];
    return [...(initial.reglas ?? [])]
      .sort((a, b) => b.prioridad - a.prioridad) // highest priority (threshold) first
      .map((r) => {
        const gteC = r.condiciones?.find((c) => c.operador === '>=' || c.operador === '>');
        return { id: newTramoId(), desde: String(gteC?.valor ?? 0), pct: String(r.valor) };
      })
      .filter((t) => t.desde !== '0'); // desde=0 becomes pctDefault
  });

  const [pctDefault, setPctDefault] = useState(() => {
    if (!initial || !esCondicional(initial)) return '';
    const defaultRegla = (initial.reglas ?? []).find((r) => {
      const gteC = r.condiciones?.find((c) => c.operador === '>=' || c.operador === '>');
      return !gteC || gteC.valor === 0;
    });
    return defaultRegla ? String(defaultRegla.valor) : '';
  });

  const [error, setError] = useState('');

  // Cultivos (para "Por cultivo" y "Personalizado")
  const { data: cultivos = [] } = useQuery({
    queryKey: ['cultivos'],
    queryFn: () => productosApi.getCultivos(true),
    enabled: alcance === 'personalizado' || alcance === 'cultivo',
  });
  const hibridosPorCultivo = useQuery({
    queryKey: ['hibridos-todos'],
    queryFn: async () => {
      const all: { cultivo: string; hibridos: Hibrido[] }[] = [];
      for (const c of cultivos) {
        const h = await productosApi.getHibridos(c.id, true);
        if (h.length) all.push({ cultivo: c.nombre, hibridos: h });
      }
      return all;
    },
    enabled: alcance === 'personalizado' && cultivos.length > 0,
  });

  // ── Guardar ──
  const saveMut = useMutation({
    mutationFn: () => {
      const tipoAplicacion: TipoAplicacion = alcance === 'cultivo' ? 'cultivo' : 'hibrido';

      // Personalizado: una regla por híbrido seleccionado
      if (alcance === 'personalizado') {
        const reglas = Array.from(hibridosSelec).map((hid, i) => ({
          valor: Number(porcentaje),
          prioridad: i + 1,
          condiciones: [{ campo: 'hibrido_id' as const, operador: '=' as const, valor: hid }],
        }));
        const payload = {
          nombre, tipoAplicacion: 'hibrido' as const,
          modo: 'avanzado' as const, fechaVigencia, reglas,
        };
        return isEdit ? descuentosApi.update(initial!.id, payload) : descuentosApi.create(payload);
      }

      // Cultivo sin condicional: avanzado con reglas por cultivo (una regla por cultivo con %)
      if (alcance === 'cultivo' && !condicional) {
        const reglas = cultivos
          .filter((c) => pctPorCultivo[c.id] && Number(pctPorCultivo[c.id]) > 0)
          .map((c, i) => ({
            valor: Number(pctPorCultivo[c.id]),
            prioridad: i + 1,
            condiciones: [{ campo: 'cultivo_id' as const, operador: '=' as const, valor: c.id }],
          }));
        const payload = {
          nombre, tipoAplicacion: 'cultivo' as const,
          modo: 'avanzado' as const, fechaVigencia, reglas,
        };
        return isEdit ? descuentosApi.update(initial!.id, payload) : descuentosApi.create(payload);
      }

      // Sin condicional (híbrido): basico
      if (!condicional) {
        const payload = {
          nombre, tipoAplicacion,
          modo: 'basico' as const,
          valorPorcentaje: Number(porcentaje),
          fechaVigencia,
        };
        return isEdit ? descuentosApi.update(initial!.id, payload) : descuentosApi.create(payload);
      }

      // Condicional: avanzado con tramos visuales
      const tramosValidos = [...tramos]
        .filter((t) => t.desde !== '' && Number(t.desde) > 0 && t.pct !== '')
        .sort((a, b) => Number(b.desde) - Number(a.desde)); // highest threshold = highest priority

      type CondOp = '>=' | '<=';
      const reglas = [
        ...tramosValidos.map((t, i) => ({
          valor: Number(t.pct),
          prioridad: tramosValidos.length + 1 - i,
          condiciones: [{ campo, operador: '>=' as CondOp, valor: Number(t.desde) }],
        })),
        // Default catch-all (lowest priority, matches everything via campo >= 0)
        ...(pctDefault !== ''
          ? [{
              valor: Number(pctDefault),
              prioridad: 1,
              condiciones: [{ campo, operador: '>=' as CondOp, valor: 0 }],
            }]
          : []),
      ];

      const payload = {
        nombre, tipoAplicacion,
        modo: 'avanzado' as const,
        fechaVigencia, reglas,
      };
      return isEdit ? descuentosApi.update(initial!.id, payload) : descuentosApi.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['descuentos'] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  // ── Validación ──
  const canSave = (() => {
    if (!nombre.trim() || !fechaVigencia) return false;
    if (alcance === 'personalizado') return hibridosSelec.size > 0 && porcentaje !== '';
    if (alcance === 'cultivo' && !condicional)
      return cultivos.some((c) => pctPorCultivo[c.id] && Number(pctPorCultivo[c.id]) > 0);
    if (!condicional) return porcentaje !== '' && Number(porcentaje) >= 0;
    return pctDefault !== '' || tramos.some((t) => t.desde !== '' && Number(t.desde) > 0 && t.pct !== '');
  })();

  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';
  const inputCls = 'border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <Modal title={isEdit ? `Editar: ${initial!.nombre}` : 'Nuevo descuento'} onClose={onClose}>
      <div className="space-y-5 max-h-[72vh] overflow-y-auto pr-1">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

        {/* Nombre + Fecha */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Nombre *</label>
            <input
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="ej: Descuento Soja 2025"
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

        {/* Porcentaje — para híbrido sin condicional y personalizado */}
        {(alcance === 'hibrido' && !condicional) || alcance === 'personalizado' ? (
          <div>
            <label className={labelCls}>
              {alcance === 'personalizado' ? 'Porcentaje para los híbridos seleccionados' : 'Porcentaje de descuento'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={porcentaje}
                onChange={(e) => setPorcentaje(e.target.value)}
                placeholder="ej: 5.00"
                className={`${inputCls} w-32 text-right`}
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>
        ) : null}

        {/* Por cultivo sin condicional: inputs individuales por cultivo */}
        {alcance === 'cultivo' && !condicional && (
          <div>
            <label className={labelCls}>Porcentaje por cultivo</label>
            <p className="text-xs text-gray-400 mb-2">
              Dejá en 0 o vacío los cultivos sin descuento (se visualizan con "−").
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

        <hr className="border-gray-100" />

        {/* Alcance */}
        <div>
          <label className={labelCls}>Alcance</label>
          <div className="flex gap-3">
            {(['cultivo', 'hibrido', 'personalizado'] as Alcance[]).map((a) => (
              <label key={a} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  checked={alcance === a}
                  onChange={() => { setAlcance(a); if (a === 'personalizado') setCondicional(false); }}
                />
                <span>{ALCANCE_LABEL[a]}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            {alcance === 'cultivo' && 'Aplica el mismo % a todos los ítems, agrupado por cultivo en la cotización.'}
            {alcance === 'hibrido' && 'Aplica ítem por ítem. Podés ver el descuento en cada fila.'}
            {alcance === 'personalizado' && 'Elegí los híbridos específicos a los que aplica.'}
          </p>
        </div>

        {/* Híbridos (Personalizado) */}
        {alcance === 'personalizado' && (
          <div>
            <label className={labelCls}>Híbridos incluidos *</label>
            {hibridosPorCultivo.isLoading || cultivos.length === 0 ? (
              <div className="flex justify-center py-4"><Spinner /></div>
            ) : (
              <div className="border rounded-lg p-3 space-y-3 max-h-48 overflow-y-auto">
                {(hibridosPorCultivo.data ?? []).map(({ cultivo, hibridos }) => (
                  <div key={cultivo}>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">{cultivo}</div>
                    <div className="space-y-1">
                      {hibridos.map((h) => (
                        <label key={h.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hibridosSelec.has(h.id)}
                            onChange={(e) => {
                              setHibridosSelec((prev) => {
                                const next = new Set(prev);
                                e.target.checked ? next.add(h.id) : next.delete(h.id);
                                return next;
                              });
                            }}
                          />
                          <span>{h.nombre}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {hibridosSelec.size > 0 && (
              <p className="text-xs text-blue-600 mt-1">{hibridosSelec.size} híbrido(s) seleccionado(s)</p>
            )}
          </div>
        )}

        {/* Condicional (solo cultivo e hibrido) */}
        {alcance !== 'personalizado' && (
          <>
            <hr className="border-gray-100" />
            <div>
              <label className="flex items-center gap-2 text-sm cursor-pointer font-medium text-gray-700 select-none">
                <input
                  type="checkbox"
                  checked={condicional}
                  onChange={(e) => setCondicional(e.target.checked)}
                  className="rounded"
                />
                ¿Varía según una condición?
              </label>
              {!condicional && (
                <p className="text-xs text-gray-400 mt-1 ml-5">
                  Activá esto para aplicar distintos porcentajes según bolsas, precio u otras variables.
                </p>
              )}
            </div>

            {condicional && (
              <div className="space-y-3">
                {/* Reference field selector */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-600 shrink-0">Comparar por</span>
                  <div className="flex gap-2">
                    {(Object.entries(CAMPO_LABEL) as [CampoCond, string][]).map(([v, l]) => (
                      <button
                        key={v}
                        onClick={() => setCampo(v)}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                          campo === v
                            ? 'bg-blue-600 border-blue-600 text-white font-medium'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visual condition blocks */}
                <div className="space-y-2">
                  {/* Conditional tramos — sorted highest threshold first for display */}
                  {[...tramos]
                    .sort((a, b) => Number(b.desde) - Number(a.desde))
                    .map((t) => (
                      <div key={t.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5 group">
                        <span className="text-xs font-semibold text-blue-700 shrink-0 w-4">SI</span>
                        <span className="text-xs text-gray-500 shrink-0">{CAMPO_LABEL[campo]}</span>
                        <span className="text-xs font-mono text-blue-500 shrink-0">≥</span>
                        <input
                          type="number"
                          min={1}
                          step={1}
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
                          onClick={() => setTramos((prev) => prev.filter((x) => x.id !== t.id))}
                          className="ml-auto text-gray-300 hover:text-red-500 text-base leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Quitar condición"
                        >
                          ×
                        </button>
                      </div>
                    ))}

                  {/* Default catch-all block — always shown */}
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
                  onClick={() => setTramos((prev) => [...prev, { id: newTramoId(), desde: '', pct: '' }])}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  + Agregar condición
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
          Cancelar
        </button>
        <button
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

  const alcance = inferirAlcance(descuento);
  const cond = esCondicional(descuento);

  return (
    <Modal title={descuento.nombre} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
            {ALCANCE_LABEL[alcance]}
          </span>
          {cond && (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
              Condicional · {CAMPO_LABEL[inferirCampo(descuento)]}
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

        {descuento.modo === 'basico' && (
          <div className="bg-blue-50 rounded-lg p-3 text-sm flex items-center gap-2">
            <span className="text-gray-600">Porcentaje fijo:</span>
            <span className="font-bold text-blue-700 text-lg">{descuento.valorPorcentaje}%</span>
          </div>
        )}

        {alcance === 'cultivo' && !cond && descuento.modo === 'avanzado' && (
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

        {alcance === 'personalizado' && (
          <div className="text-sm">
            <div className="font-medium text-gray-700 mb-2">
              Híbridos incluidos ({descuento.reglas?.length ?? 0}):
            </div>
            <div className="space-y-1">
              {(descuento.reglas ?? []).map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5">
                  <span className="text-gray-600">Híbrido #{r.condiciones?.[0]?.valor}</span>
                  <span className="font-semibold text-blue-700">{r.valor}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {cond && (
          <div className="text-sm">
            <div className="font-medium text-gray-700 mb-2">
              Tramos por {CAMPO_LABEL[inferirCampo(descuento)]}:
            </div>
            <div className="space-y-1">
              {[...(descuento.reglas ?? [])]
                .sort((a, b) => a.prioridad - b.prioridad)
                .map((r) => {
                  const gteC = r.condiciones?.find((c) => c.operador === '>=');
                  const lteC = r.condiciones?.find((c) => c.operador === '<=');
                  return (
                    <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5">
                      <span className="text-gray-600">
                        {gteC ? `Desde ${gteC.valor}` : ''}
                        {lteC ? ` hasta ${lteC.valor}` : ' en adelante'}
                      </span>
                      <span className="font-semibold text-blue-700">{r.valor}%</span>
                    </div>
                  );
                })}
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
              const alcance = inferirAlcance(d);
              const cond = esCondicional(d);
              const nHibridos = alcance === 'personalizado' ? (d.reglas?.length ?? 0) : null;
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
                        {ALCANCE_LABEL[alcance]}
                        {nHibridos != null && ` (${nHibridos})`}
                      </span>
                      {cond && (
                        <span className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          {CAMPO_LABEL[inferirCampo(d)]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {d.modo === 'basico'
                      ? `${d.valorPorcentaje}%`
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
