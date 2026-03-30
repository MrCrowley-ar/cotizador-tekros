import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { descuentosApi } from '../../api/descuentos';
import { productosApi } from '../../api/productos';
import { Modal } from '../../components/Modal';
import { Spinner } from '../../components/Spinner';
import { Badge } from '../../components/Badge';
import { RuleBuilder } from './RuleBuilder';
import { CAMPOS, FRACCIONES } from './ConditionRow';
import type { RuleData } from './RuleBuilder';
import type { Descuento } from '../../api/types';

// ─── Tipos internos ───────────────────────────────────────────────────────────

type TipoCondicion = 'fijo' | 'por_rango' | 'por_selector' | 'personalizado';
type DriverRango = 'cantidad' | 'precio' | 'subtotal' | 'ratio_cultivo' | 'volumen' | 'monto' | 'precio_ponderado' | 'subtotal_items' | 'desc_items' | 'total';

// hasta es opcional: si se define, el tramo usa operador ENTRE (desde-hasta)
interface Tramo { id: string; desde: string; hasta?: string; pct: string }
interface OpcionSelector { id: string; nombre: string; pct: string }

let _ctr = 0;
function newId() { return `i${++_ctr}`; }

// ─── Helpers para display ─────────────────────────────────────────────────────

function inferirAlcance(d: Descuento): import('../../api/types').TipoAplicacion {
  return d.tipoAplicacion;
}

function inferirTipoCondicion(d: Descuento): TipoCondicion {
  if (d.modo === 'selector') return 'por_selector';
  if (d.modo === 'basico') return 'fijo';

  const reglas = d.reglas ?? [];

  // fijo + cultivo: todas las reglas tienen una sola condición cultivo_id =
  const todasCultivoId = reglas.every(
    (r) => r.condiciones?.length === 1 && r.condiciones[0].campo === 'cultivo_id',
  );
  if (todasCultivoId) return 'fijo';

  // por_rango (1 condición): mismo campo, operador >= o entre, sin valorCampo
  if (reglas.length > 0) {
    const primerCampo = reglas[0]?.condiciones?.[0]?.campo;
    const todoRango = reglas.every((r) => {
      const conds = r.condiciones ?? [];
      if (conds.length !== 1) return false;
      const c = conds[0];
      if (c.campo !== primerCampo) return false;
      if (c.operador !== '>=' && c.operador !== 'entre') return false;
      if (c.valorCampo) return false;
      return true;
    });
    if (todoRango) return 'por_rango';
  }

  // por_rango + cultivo (2 condiciones: cultivo_id= + rango), mismo driver en todas
  if (reglas.length > 0 && d.tipoAplicacion === 'cultivo') {
    const primerDriver = reglas[0]?.condiciones?.find((c) => c.campo !== 'cultivo_id')?.campo;
    const todoRangoCultivo = primerDriver != null && reglas.every((r) => {
      const conds = r.condiciones ?? [];
      if (conds.length !== 2) return false;
      const hasCultivoId = conds.some((c) => c.campo === 'cultivo_id' && c.operador === '=');
      const rangoC = conds.find((c) => c.campo !== 'cultivo_id');
      if (!hasCultivoId || !rangoC) return false;
      if (rangoC.campo !== primerDriver) return false;
      if (rangoC.operador !== '>=' && rangoC.operador !== 'entre') return false;
      if (rangoC.valorCampo) return false;
      return true;
    });
    if (todoRangoCultivo) return 'por_rango';
  }

  return 'personalizado';
}

function inferirDriverRango(d: Descuento): DriverRango {
  for (const r of d.reglas ?? []) {
    for (const c of r.condiciones ?? []) {
      if (c.campo === 'precio') return 'precio';
      if (c.campo === 'subtotal') return 'subtotal';
      if (c.campo === 'volumen') return 'volumen';
      if (c.campo === 'monto') return 'monto';
      if (c.campo === 'precio_ponderado') return 'precio_ponderado';
      if (c.campo === 'ratio_cultivo') return 'ratio_cultivo';
      if (c.campo === 'subtotal_items') return 'subtotal_items';
      if (c.campo === 'desc_items') return 'desc_items';
      if (c.campo === 'total') return 'total';
      if (c.campo === 'cantidad') return 'cantidad';
    }
  }
  return 'cantidad';
}

const TIPO_LABEL: Record<TipoCondicion, string> = {
  fijo: 'Fijo',
  por_rango: 'Por rango',
  por_selector: 'Por selector',
  personalizado: 'Personalizado',
};

const ALCANCE_LABEL: Record<import('../../api/types').TipoAplicacion, string> = {
  global: 'Global',
  cultivo: 'Por cultivo',
  hibrido: 'Por híbrido',
};

const ALL_DRIVER_LABELS: Record<DriverRango, string> = {
  cantidad: 'Bolsas',
  precio: 'P.BASE ($)',
  subtotal: 'Subtotal ($)',
  ratio_cultivo: 'Ratio cultivo',
  volumen: 'Volumen (bolsas)',
  monto: 'Monto ($)',
  precio_ponderado: 'P. ponderado',
  subtotal_items: 'Subtotal ítems',
  desc_items: 'Desc. ítems',
  total: 'Total',
};

// ─── Helpers para mostrar condiciones en detalle ──────────────────────────────

const CAMPO_LABEL_MAP: Record<string, string> = Object.fromEntries(CAMPOS.map((c) => [c.value, c.label]));
const OP_LABEL: Record<string, string> = { '=': '=', '!=': '≠', '>': '>', '<': '<', '>=': '≥', '<=': '≤', entre: 'entre' };

function describeApiCond(c: { campo: string; operador: string; valor: number; valor2?: number | null; valorCampo?: string | null; valorMultiplier?: number | null }): string {
  const campoL = CAMPO_LABEL_MAP[c.campo] ?? c.campo;
  const op     = OP_LABEL[c.operador] ?? c.operador;
  if (c.valorCampo) {
    const frac = FRACCIONES.find((f) => Math.abs(f.value - (c.valorMultiplier ?? 1)) < 0.0001)?.label ?? `×${c.valorMultiplier}`;
    return `${campoL} ${op} ${frac} ${CAMPO_LABEL_MAP[c.valorCampo] ?? c.valorCampo}`;
  }
  if (c.operador === 'entre') return `${campoL} entre ${c.valor} y ${c.valor2 ?? '?'}`;
  return `${campoL} ${op} ${c.valor}`;
}

function getDriversForAlcance(_alcance: import('../../api/types').TipoAplicacion): { value: DriverRango; label: string }[] {
  return [
    { value: 'cantidad',        label: 'Bolsas' },
    { value: 'precio',          label: 'P.BASE ($)' },
    { value: 'subtotal',        label: 'Subtotal ($)' },
    { value: 'volumen',         label: 'Volumen (bolsas)' },
    { value: 'monto',           label: 'Monto ($)' },
    { value: 'precio_ponderado',label: 'P. ponderado' },
    { value: 'subtotal_items',  label: 'Subtotal ítems' },
    { value: 'desc_items',      label: 'Desc. ítems' },
    { value: 'total',           label: 'Total' },
  ];
}

function defaultDriverForAlcance(alcance: import('../../api/types').TipoAplicacion): DriverRango {
  if (alcance === 'hibrido') return 'cantidad';
  if (alcance === 'cultivo') return 'volumen';
  return 'subtotal_items';
}

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

  // ── Alcance y tipo de condición (independientes) ──
  const [alcance, setAlcance] = useState<import('../../api/types').TipoAplicacion>(
    initial ? inferirAlcance(initial) : 'global',
  );
  const [tipoCondicion, setTipoCondicion] = useState<TipoCondicion>(
    initial ? inferirTipoCondicion(initial) : 'fijo',
  );

  // Fijo
  const [pctFijo, setPctFijo] = useState(
    initial?.valorPorcentaje != null ? String(initial.valorPorcentaje) : '',
  );

  // Fijo + cultivo → grilla de % por cultivo
  const [pctPorCultivo, setPctPorCultivo] = useState<Record<number, string>>(() => {
    if (!initial || inferirTipoCondicion(initial) !== 'fijo' || initial.tipoAplicacion !== 'cultivo') return {};
    const map: Record<number, string> = {};
    (initial.reglas ?? []).forEach((r) => {
      const cond = r.condiciones?.find((c) => c.campo === 'cultivo_id');
      if (cond) map[cond.valor] = String(r.valor);
    });
    return map;
  });

  // Por rango
  const [driver, setDriver] = useState<DriverRango>(() => {
    if (initial) return inferirDriverRango(initial);
    return defaultDriverForAlcance(initial ? inferirAlcance(initial) : 'global');
  });
  const [tramos, setTramos] = useState<Tramo[]>(() => {
    // Per-cultivo por_rango uses tramosPorCultivo, not tramos
    if (!initial || inferirTipoCondicion(initial) !== 'por_rango' || initial.tipoAplicacion === 'cultivo') return [];
    return [...(initial.reglas ?? [])]
      .sort((a, b) => b.prioridad - a.prioridad)
      .map((r) => {
        const c = r.condiciones?.[0];
        if (c?.operador === 'entre') {
          return { id: newId(), desde: String(c.valor ?? 0), hasta: String(c.valor2 ?? ''), pct: String(r.valor) };
        }
        const gteC = r.condiciones?.find((c2) => c2.operador === '>=' || c2.operador === '>');
        return { id: newId(), desde: String(gteC?.valor ?? 0), pct: String(r.valor) };
      })
      .filter((t) => t.desde !== '0');
  });
  const [pctDefault, setPctDefault] = useState(() => {
    if (!initial || inferirTipoCondicion(initial) !== 'por_rango' || initial.tipoAplicacion === 'cultivo') return '';
    const def = (initial.reglas ?? []).find((r) => {
      const gteC = r.condiciones?.find((c) => c.operador === '>=' || c.operador === '>');
      return !gteC || Number(gteC.valor) === 0;
    });
    return def ? String(def.valor) : '';
  });

  // Personalizado: rules libres usando RuleBuilder
  const [customRules, setCustomRules] = useState<RuleData[]>(() => {
    // Per-cultivo personalizado uses customRulesPorCultivo, not customRules
    if (!initial || inferirTipoCondicion(initial) !== 'personalizado' || initial.tipoAplicacion === 'cultivo') return [];
    return [...(initial.reglas ?? [])]
      .sort((a, b) => a.prioridad - b.prioridad)
      .map((r) => ({
        valor: Number(r.valor),
        prioridad: r.prioridad,
        condiciones: (r.condiciones ?? []).map((c) => ({
          campo: c.campo,
          operador: c.operador,
          valor: Number(c.valor),
          valor2: c.valor2 != null ? Number(c.valor2) : undefined,
          valorCampo: c.valorCampo ?? undefined,
          valorMultiplier: c.valorMultiplier ?? undefined,
        })),
      }));
  });

  // Por selector
  const [opciones, setOpciones] = useState<OpcionSelector[]>(() => {
    if (!initial || inferirTipoCondicion(initial) !== 'por_selector') return [];
    return [...(initial.reglas ?? [])]
      .sort((a, b) => a.prioridad - b.prioridad)
      .map((r) => ({ id: newId(), nombre: r.nombre ?? '', pct: String(r.valor) }));
  });

  // Per-cultivo state (para por_rango + cultivo y personalizado + cultivo)
  const [cultivoActivoId, setCultivoActivoId] = useState<number | null>(null);
  const [tramosPorCultivo, setTramosPorCultivo] = useState<Record<number, Tramo[]>>(() => {
    if (!initial || inferirTipoCondicion(initial) !== 'por_rango' || initial.tipoAplicacion !== 'cultivo') return {};
    const map: Record<number, Tramo[]> = {};
    for (const r of initial.reglas ?? []) {
      const cultCond = r.condiciones?.find((c) => c.campo === 'cultivo_id');
      const rangoCond = r.condiciones?.find((c) => c.campo !== 'cultivo_id');
      if (!cultCond || !rangoCond) continue;
      const cid = Number(cultCond.valor);
      if (!map[cid]) map[cid] = [];
      // Skip default tramos (valor=0, operador=>=)
      if (Number(rangoCond.valor) === 0 && (rangoCond.operador === '>=' || rangoCond.operador === '>')) continue;
      if (rangoCond.operador === 'entre') {
        map[cid].push({ id: newId(), desde: String(rangoCond.valor), hasta: String(rangoCond.valor2 ?? ''), pct: String(r.valor) });
      } else {
        map[cid].push({ id: newId(), desde: String(rangoCond.valor), pct: String(r.valor) });
      }
    }
    for (const cid in map) map[cid].sort((a, b) => Number(a.desde) - Number(b.desde));
    return map;
  });
  const [pctDefaultPorCultivo, setPctDefaultPorCultivo] = useState<Record<number, string>>(() => {
    if (!initial || inferirTipoCondicion(initial) !== 'por_rango' || initial.tipoAplicacion !== 'cultivo') return {};
    const map: Record<number, string> = {};
    for (const r of initial.reglas ?? []) {
      const cultCond = r.condiciones?.find((c) => c.campo === 'cultivo_id');
      const rangoCond = r.condiciones?.find((c) => c.campo !== 'cultivo_id');
      if (!cultCond || !rangoCond) continue;
      if (Number(rangoCond.valor) === 0 && (rangoCond.operador === '>=' || rangoCond.operador === '>')) {
        map[Number(cultCond.valor)] = String(r.valor);
      }
    }
    return map;
  });
  const [customRulesPorCultivo, setCustomRulesPorCultivo] = useState<Record<number, RuleData[]>>(() => {
    if (!initial || inferirTipoCondicion(initial) !== 'personalizado' || initial.tipoAplicacion !== 'cultivo') return {};
    const map: Record<number, RuleData[]> = {};
    for (const r of [...(initial.reglas ?? [])].sort((a, b) => a.prioridad - b.prioridad)) {
      const cultCond = r.condiciones?.find((c) => c.campo === 'cultivo_id');
      if (!cultCond) continue;
      const cid = Number(cultCond.valor);
      if (!map[cid]) map[cid] = [];
      const restConds = (r.condiciones ?? []).filter((c) => c.campo !== 'cultivo_id');
      map[cid].push({
        valor: Number(r.valor),
        prioridad: r.prioridad,
        condiciones: restConds.map((c) => ({
          campo: c.campo,
          operador: c.operador,
          valor: Number(c.valor),
          valor2: c.valor2 != null ? Number(c.valor2) : undefined,
          valorCampo: c.valorCampo ?? undefined,
          valorMultiplier: c.valorMultiplier ?? undefined,
        })),
      });
    }
    return map;
  });

  // Cultivos (para cualquier combinación con alcance cultivo)
  const { data: cultivos = [] } = useQuery({
    queryKey: ['cultivos'],
    queryFn: () => productosApi.getCultivos(true),
    enabled: alcance === 'cultivo',
  });

  // Cultivo activo: usa el seleccionado o cae al primero disponible
  const effectiveCultivoId = cultivoActivoId ?? cultivos[0]?.id ?? null;

  // ── Guardar ──
  const saveMut = useMutation({
    mutationFn: () => {
      type CondOp = '>=' | '=';

      // fijo + cultivo → grilla por cultivo (avanzado con reglas cultivo_id)
      if (tipoCondicion === 'fijo' && alcance === 'cultivo') {
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

      // fijo + global | hibrido → basico
      if (tipoCondicion === 'fijo') {
        const payload = {
          nombre, tipoAplicacion: alcance,
          modo: 'basico' as const,
          valorPorcentaje: Number(pctFijo),
          fechaVigencia,
        };
        return isEdit ? descuentosApi.update(initial!.id, payload) : descuentosApi.create(payload);
      }

      if (tipoCondicion === 'por_rango' && alcance === 'cultivo') {
        const allRules: any[] = [];
        let prio = 1;
        for (const cultivo of cultivos) {
          const tramosC = [...(tramosPorCultivo[cultivo.id] ?? [])]
            .filter((t) => t.pct !== '')
            .sort((a, b) => Number(a.desde) - Number(b.desde));
          const pctDefC = pctDefaultPorCultivo[cultivo.id] ?? '';
          [...tramosC].reverse().forEach((t) => {
            const tieneHasta = t.hasta && t.hasta !== '';
            const condRango = tieneHasta
              ? { campo: driver as string, operador: 'entre' as const, valor: Number(t.desde), valor2: Number(t.hasta) }
              : { campo: driver as string, operador: '>=' as CondOp, valor: Number(t.desde) };
            allRules.push({ valor: Number(t.pct), prioridad: prio++, condiciones: [{ campo: 'cultivo_id' as const, operador: '=' as CondOp, valor: cultivo.id }, condRango] });
          });
          if (pctDefC !== '') {
            allRules.push({ valor: Number(pctDefC), prioridad: prio++, condiciones: [{ campo: 'cultivo_id' as const, operador: '=' as CondOp, valor: cultivo.id }, { campo: driver as string, operador: '>=' as CondOp, valor: 0 }] });
          }
        }
        const payload = { nombre, tipoAplicacion: 'cultivo' as const, modo: 'avanzado' as const, fechaVigencia, reglas: allRules };
        return isEdit ? descuentosApi.update(initial!.id, payload) : descuentosApi.create(payload);
      }

      if (tipoCondicion === 'por_rango') {
        const tramosValidos = [...tramos]
          .filter((t) => t.pct !== '')
          .sort((a, b) => Number(a.desde) - Number(b.desde));
        const reglas = [
          // Prioridades descendentes: el tramo más alto (mayor desde) tiene prioridad 1
          ...tramosValidos.reverse().map((t, i) => {
            const tieneHasta = t.hasta && t.hasta !== '';
            const cond = tieneHasta
              ? { campo: driver as string, operador: 'entre' as const, valor: Number(t.desde), valor2: Number(t.hasta) }
              : { campo: driver as string, operador: '>=' as CondOp, valor: Number(t.desde) };
            return { valor: Number(t.pct), prioridad: i + 1, condiciones: [cond] };
          }),
          ...(pctDefault !== ''
            ? [{ valor: Number(pctDefault), prioridad: tramosValidos.length + 1,
                condiciones: [{ campo: driver as string, operador: '>=' as CondOp, valor: 0 }] }]
            : []),
        ];
        const payload = {
          nombre, tipoAplicacion: alcance,
          modo: 'avanzado' as const, fechaVigencia, reglas,
        };
        return isEdit ? descuentosApi.update(initial!.id, payload) : descuentosApi.create(payload);
      }

      if (tipoCondicion === 'personalizado' && alcance === 'cultivo') {
        const allRules: any[] = [];
        let prio = 1;
        for (const cultivo of cultivos) {
          for (const r of (customRulesPorCultivo[cultivo.id] ?? [])) {
            allRules.push({
              valor: r.valor,
              prioridad: prio++,
              condiciones: [
                { campo: 'cultivo_id' as const, operador: '=' as CondOp, valor: cultivo.id },
                ...r.condiciones.map((c) => ({
                  campo: c.campo,
                  operador: c.operador,
                  valor: c.valorCampo ? 0 : c.valor,
                  valor2: c.valor2,
                  valorCampo: c.valorCampo,
                  valorMultiplier: c.valorMultiplier,
                })),
              ],
            });
          }
        }
        const payload = { nombre, tipoAplicacion: 'cultivo' as const, modo: 'avanzado' as const, fechaVigencia, reglas: allRules };
        return isEdit ? descuentosApi.update(initial!.id, payload) : descuentosApi.create(payload);
      }

      if (tipoCondicion === 'personalizado') {
        const reglas = customRules.map((r) => ({
          valor: r.valor,
          prioridad: r.prioridad,
          condiciones: r.condiciones.map((c) => ({
            campo: c.campo,
            operador: c.operador,
            valor: c.valorCampo ? 0 : c.valor,
            valor2: c.valor2,
            valorCampo: c.valorCampo,
            valorMultiplier: c.valorMultiplier,
          })),
        }));
        const payload = {
          nombre, tipoAplicacion: alcance,
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
        nombre, tipoAplicacion: alcance,
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
    if (tipoCondicion === 'fijo' && alcance === 'cultivo')
      return cultivos.some((c) => pctPorCultivo[c.id] && Number(pctPorCultivo[c.id]) > 0);
    if (tipoCondicion === 'fijo') return pctFijo !== '' && Number(pctFijo) >= 0;
    if (tipoCondicion === 'por_rango' && alcance === 'cultivo')
      return cultivos.some((c) => (tramosPorCultivo[c.id] ?? []).some((t) => t.pct !== '') || (pctDefaultPorCultivo[c.id] ?? '') !== '');
    if (tipoCondicion === 'por_rango')
      return pctDefault !== '' || tramos.some((t) => t.pct !== '');
    if (tipoCondicion === 'personalizado' && alcance === 'cultivo')
      return cultivos.some((c) => (customRulesPorCultivo[c.id] ?? []).length > 0);
    if (tipoCondicion === 'personalizado') return customRules.length > 0;
    // por_selector
    return opciones.some((o) => o.nombre.trim() !== '' && o.pct !== '');
  })();

  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';
  const inputCls = 'border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  const alcanceCards: { value: import('../../api/types').TipoAplicacion; label: string; desc: string }[] = [
    { value: 'global',  label: 'Global',       desc: 'Aplica sobre el total de la cotización' },
    { value: 'cultivo', label: 'Por cultivo',   desc: 'Aplica sobre el subtotal de cada cultivo' },
    { value: 'hibrido', label: 'Por híbrido',   desc: 'Aplica sobre cada ítem/híbrido' },
  ];

  const tipoCards: { value: TipoCondicion; label: string; desc: string }[] = [
    { value: 'fijo',         label: 'Fijo',          desc: alcance === 'cultivo' ? '% distinto por cultivo' : 'Un % igual para todos' },
    { value: 'por_rango',    label: 'Por rango',     desc: '% según una variable (desde / desde–hasta)' },
    { value: 'por_selector', label: 'Por selector',  desc: 'El usuario elige la opción al cotizar' },
    { value: 'personalizado', label: 'Personalizado', desc: 'Condiciones libres: variable op valor/fracción' },
  ];

  return (
    <Modal title={isEdit ? `Editar: ${initial!.nombre}` : 'Nuevo descuento'} onClose={onClose}>
      <div className="space-y-5">
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

        {/* ── Alcance ── */}
        <div>
          <label className={labelCls}>Alcance del descuento</label>
          <div className="grid grid-cols-3 gap-2">
            {alcanceCards.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => {
                  setAlcance(a.value);
                  // resetear driver al default del nuevo alcance
                  setDriver(defaultDriverForAlcance(a.value));
                }}
                className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  alcance === a.value
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className={`text-sm font-medium ${alcance === a.value ? 'text-blue-700' : 'text-gray-800'}`}>
                  {a.label}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{a.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Tipo de condición ── */}
        <div>
          <label className={labelCls}>Tipo de condición</label>
          <div className="grid grid-cols-3 gap-2">
            {tipoCards.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTipoCondicion(t.value)}
                className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  tipoCondicion === t.value
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className={`text-sm font-medium ${tipoCondicion === t.value ? 'text-blue-700' : 'text-gray-800'}`}>
                  {t.label}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* ── Fijo ── */}
        {tipoCondicion === 'fijo' && alcance !== 'cultivo' && (
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

        {/* ── Fijo + cultivo → grilla por cultivo ── */}
        {tipoCondicion === 'fijo' && alcance === 'cultivo' && (
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
        {tipoCondicion === 'por_rango' && (
          <div className="space-y-3">
            <div>
              <label className={labelCls}>¿Qué variable define el rango?</label>
              <div className="flex gap-2 flex-wrap">
                {getDriversForAlcance(alcance).map(({ value: v, label: l }) => (
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
              {driver === 'precio_ponderado' && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1.5">
                  P. ponderado = Monto del cultivo ÷ Volumen del cultivo (precio promedio ponderado por bolsas).
                </p>
              )}
            </div>

            {/* Tabs por cultivo cuando alcance = cultivo */}
            {alcance === 'cultivo' && cultivos.length === 0 && (
              <div className="flex justify-center py-4"><Spinner /></div>
            )}
            {alcance === 'cultivo' && cultivos.length > 0 && (
              <div className="flex gap-1 border-b border-gray-200 mb-1">
                {cultivos.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCultivoActivoId(c.id)}
                    className={`px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                      effectiveCultivoId === c.id
                        ? 'border-blue-500 text-blue-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {c.nombre}
                    {(tramosPorCultivo[c.id] ?? []).some((t) => t.pct !== '') || (pctDefaultPorCultivo[c.id] ?? '') !== ''
                      ? <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 inline-block align-middle" />
                      : null}
                  </button>
                ))}
              </div>
            )}

            {/* Tabla de tramos — por cultivo activo o global */}
            {(alcance !== 'cultivo' || effectiveCultivoId !== null) && (() => {
              const isCultivo = alcance === 'cultivo' && effectiveCultivoId !== null;
              const tramosActivos = isCultivo ? (tramosPorCultivo[effectiveCultivoId!] ?? []) : tramos;
              const setTramosActivos = isCultivo
                ? (fn: (prev: Tramo[]) => Tramo[]) => setTramosPorCultivo((prev) => ({ ...prev, [effectiveCultivoId!]: fn(prev[effectiveCultivoId!] ?? []) }))
                : setTramos;
              const pctDef = isCultivo ? (pctDefaultPorCultivo[effectiveCultivoId!] ?? '') : pctDefault;
              const setPctDef = isCultivo
                ? (v: string) => setPctDefaultPorCultivo((prev) => ({ ...prev, [effectiveCultivoId!]: v }))
                : setPctDefault;
              const step = driver === 'ratio_cultivo' || driver === 'precio_ponderado' ? 0.01 : 1;
              return (
                <>
                  <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-x-2 items-center px-3 pb-0.5">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Desde</span>
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Hasta</span>
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Descuento</span>
                    <span />
                  </div>
                  <div className="space-y-1.5">
                    {[...tramosActivos]
                      .sort((a, b) => Number(a.desde) - Number(b.desde))
                      .map((t) => (
                        <div key={t.id} className="grid grid-cols-[1fr_1fr_auto_auto] gap-x-2 items-center group">
                          <input
                            type="number" min={0} step={step} value={t.desde}
                            onChange={(e) => setTramosActivos((prev) => prev.map((x) => x.id === t.id ? { ...x, desde: e.target.value } : x))}
                            className="border rounded-md px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                          />
                          <input
                            type="number" min={0} step={step} value={t.hasta ?? ''}
                            onChange={(e) => setTramosActivos((prev) => prev.map((x) => x.id === t.id ? { ...x, hasta: e.target.value } : x))}
                            className="border rounded-md px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-500 placeholder-gray-300"
                            placeholder="sin límite"
                          />
                          <div className="flex items-center gap-1">
                            <input
                              type="number" min={0} max={100} step={0.01} value={t.pct}
                              onChange={(e) => setTramosActivos((prev) => prev.map((x) => x.id === t.id ? { ...x, pct: e.target.value } : x))}
                              className="w-16 border rounded-md px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="0"
                            />
                            <span className="text-xs text-gray-500">%</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTramosActivos((prev) => prev.filter((x) => x.id !== t.id))}
                            className="text-gray-300 hover:text-red-500 text-base leading-none opacity-0 group-hover:opacity-100 transition-opacity justify-self-center"
                          >×</button>
                        </div>
                      ))}
                    <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-x-2 items-center mt-1 pt-2 border-t border-gray-100">
                      <div className="col-span-2 text-xs text-amber-700 font-medium">En los demás casos</div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number" min={0} max={100} step={0.01} value={pctDef}
                          onChange={(e) => setPctDef(e.target.value)}
                          className="w-16 border rounded-md px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-amber-400 bg-amber-50"
                          placeholder="0"
                        />
                        <span className="text-xs text-gray-500">%</span>
                      </div>
                      <span />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTramosActivos((prev) => [...prev, { id: newId(), desde: '', hasta: '', pct: '' }])}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    + Agregar tramo
                  </button>
                </>
              );
            })()}
          </div>
        )}

        {/* ── Personalizado ── */}
        {tipoCondicion === 'personalizado' && (
          <div className="space-y-3">
            <div className="bg-purple-50 border border-purple-100 rounded-lg px-3 py-2 text-xs text-purple-700">
              Armá reglas con condiciones libres. La <strong>primera regla</strong> cuyas condiciones se cumplan gana.
              Usá el botón <strong>÷</strong> en cada condición para comparar con una fracción de otra variable.
            </div>

            {/* Tabs por cultivo cuando alcance = cultivo */}
            {alcance === 'cultivo' && cultivos.length === 0 && (
              <div className="flex justify-center py-4"><Spinner /></div>
            )}
            {alcance === 'cultivo' && cultivos.length > 0 && (
              <div className="flex gap-1 border-b border-gray-200 mb-1">
                {cultivos.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCultivoActivoId(c.id)}
                    className={`px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                      effectiveCultivoId === c.id
                        ? 'border-blue-500 text-blue-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {c.nombre}
                    {(customRulesPorCultivo[c.id] ?? []).length > 0
                      ? <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 inline-block align-middle" />
                      : null}
                  </button>
                ))}
              </div>
            )}

            {alcance === 'cultivo' && effectiveCultivoId !== null ? (
              <RuleBuilder
                rules={customRulesPorCultivo[effectiveCultivoId] ?? []}
                onChange={(rules) => setCustomRulesPorCultivo((prev) => ({ ...prev, [effectiveCultivoId!]: rules }))}
              />
            ) : alcance !== 'cultivo' ? (
              <RuleBuilder rules={customRules} onChange={setCustomRules} />
            ) : null}
          </div>
        )}

        {/* ── Por selector ── */}
        {tipoCondicion === 'por_selector' && (
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

  const tipoV = inferirTipoCondicion(descuento);

  const { data: cultivos = [] } = useQuery({
    queryKey: ['cultivos'],
    queryFn: () => productosApi.getCultivos(true),
    enabled: descuento.tipoAplicacion === 'cultivo',
  });
  const cultivoNombre = (id: number) => cultivos.find((c) => c.id === id)?.nombre ?? `Cultivo #${id}`;

  // Helpers de vista
  const reglasSorted = [...(descuento.reglas ?? [])].sort((a, b) => a.prioridad - b.prioridad);
  const isPerCultivo = reglasSorted.some((r) => r.condiciones?.some((c) => c.campo === 'cultivo_id'));

  function groupByCultivo<T extends { condiciones?: { campo: string; valor: number }[] }>(rules: T[]) {
    const map = new Map<number, T[]>();
    for (const r of rules) {
      const cId = Number(r.condiciones?.find((c) => c.campo === 'cultivo_id')?.valor ?? 0);
      if (!map.has(cId)) map.set(cId, []);
      map.get(cId)!.push(r);
    }
    return map;
  }

  function RangoRow({ r }: { r: (typeof reglasSorted)[0] }) {
    const c = r.condiciones?.find((cd) => cd.campo !== 'cultivo_id') ?? r.condiciones?.[0];
    let desc = 'En los demás casos';
    if (c?.operador === 'entre') desc = `${c.valor} – ${c.valor2}`;
    else if (c?.operador === '>=' && Number(c.valor) !== 0) desc = `≥ ${c.valor}`;
    return (
      <div className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5">
        <span className="text-gray-600">{desc}</span>
        <span className="font-semibold text-blue-700">{r.valor}%</span>
      </div>
    );
  }

  function PersonaRow({ r, skipCultivoId = false }: { r: (typeof reglasSorted)[0]; skipCultivoId?: boolean }) {
    const conds = (r.condiciones ?? []).filter((c) => !skipCultivoId || c.campo !== 'cultivo_id');
    const txt = conds.length ? `Si ${conds.map(describeApiCond).join(' Y ')}` : 'Siempre';
    return (
      <div className="flex items-start justify-between gap-3 bg-gray-50 rounded px-3 py-1.5">
        <span className="text-gray-600 text-xs leading-relaxed">{txt}</span>
        <span className="font-semibold text-blue-700 shrink-0">{r.valor}%</span>
      </div>
    );
  }

  return (
    <Modal title={descuento.nombre} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
            {ALCANCE_LABEL[descuento.tipoAplicacion]}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
            {TIPO_LABEL[tipoV]}
          </span>
          {tipoV === 'por_rango' && (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
              {ALL_DRIVER_LABELS[inferirDriverRango(descuento)]}
            </span>
          )}
          <Badge label={descuento.activo ? 'activo' : 'inactivo'} />
        </div>

        <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
          <span className="text-gray-400">Vigencia:</span>{' '}
          <span className="font-medium">{new Date(descuento.fechaVigencia).toLocaleDateString('es-AR')}</span>
        </div>

        {/* Fijo básico */}
        {tipoV === 'fijo' && descuento.modo === 'basico' && (
          <div className="bg-blue-50 rounded-lg p-3 text-sm flex items-center gap-2">
            <span className="text-gray-600">Porcentaje fijo:</span>
            <span className="font-bold text-blue-700 text-lg">{descuento.valorPorcentaje}%</span>
          </div>
        )}

        {/* Fijo + cultivo */}
        {tipoV === 'fijo' && descuento.modo === 'avanzado' && (
          <div className="text-sm">
            <div className="font-medium text-gray-700 mb-2">Porcentaje por cultivo:</div>
            <div className="space-y-1">
              {reglasSorted.map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5">
                  <span className="text-gray-600">
                    {r.condiciones?.[0]?.campo === 'cultivo_id'
                      ? cultivoNombre(Number(r.condiciones[0].valor))
                      : `Regla #${r.prioridad}`}
                  </span>
                  <span className="font-semibold text-blue-700">{r.valor}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Por rango */}
        {tipoV === 'por_rango' && (
          <div className="text-sm space-y-2">
            <div className="font-medium text-gray-700">
              Tramos por {ALL_DRIVER_LABELS[inferirDriverRango(descuento)]}:
            </div>
            {!isPerCultivo ? (
              <div className="space-y-1">
                {reglasSorted.map((r) => <RangoRow key={r.id} r={r} />)}
              </div>
            ) : (
              [...groupByCultivo(reglasSorted).entries()].map(([cId, rules]) => (
                <div key={cId}>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{cultivoNombre(cId)}</div>
                  <div className="space-y-1">
                    {rules.map((r) => <RangoRow key={r.id} r={r} />)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Personalizado */}
        {tipoV === 'personalizado' && (
          <div className="text-sm space-y-2">
            <div className="font-medium text-gray-700">Reglas:</div>
            {!isPerCultivo ? (
              <div className="space-y-1">
                {reglasSorted.map((r) => <PersonaRow key={r.id} r={r} />)}
              </div>
            ) : (
              [...groupByCultivo(reglasSorted).entries()].map(([cId, rules]) => (
                <div key={cId}>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{cultivoNombre(cId)}</div>
                  <div className="space-y-1">
                    {rules.map((r) => <PersonaRow key={r.id} r={r} skipCultivoId />)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Por selector */}
        {tipoV === 'por_selector' && (
          <div className="text-sm">
            <div className="font-medium text-gray-700 mb-2">Opciones:</div>
            <div className="space-y-1">
              {reglasSorted.map((r) => (
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
              const tipoV = inferirTipoCondicion(d);
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
                        {ALCANCE_LABEL[d.tipoAplicacion]}
                      </span>
                      <span className="inline-flex items-center text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        {TIPO_LABEL[tipoV]}
                      </span>
                      {tipoV === 'por_rango' && (
                        <span className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          {ALL_DRIVER_LABELS[inferirDriverRango(d)]}
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
