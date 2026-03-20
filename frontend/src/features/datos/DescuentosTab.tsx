import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { descuentosApi } from '../../api/descuentos';
import { productosApi } from '../../api/productos';
import { Modal } from '../../components/Modal';
import { Spinner } from '../../components/Spinner';
import { Badge } from '../../components/Badge';
import { RuleBuilder } from './RuleBuilder';
import type { RuleData } from './RuleBuilder';
import type { Descuento, TipoAplicacion } from '../../api/types';

// ─── Inferir tipo desde un descuento existente ────────────────────────────────

type TipoDescuento = 'fijo' | 'por_cultivo' | 'por_volumen' | 'personalizado';

function inferirTipo(d: Descuento): TipoDescuento {
  if (d.modo === 'basico') return 'fijo';
  const reglas = d.reglas ?? [];
  if (reglas.length === 0) return 'personalizado';
  const todasPorCultivo = reglas.every(
    (r: any) =>
      r.condiciones?.length === 1 &&
      r.condiciones[0].campo === 'cultivo_id' &&
      r.condiciones[0].operador === '=',
  );
  if (todasPorCultivo) return 'por_cultivo';
  const todasPorVolumen = reglas.every(
    (r: any) =>
      r.condiciones?.length === 1 &&
      r.condiciones[0].campo === 'cantidad' &&
      (r.condiciones[0].operador === '>=' || r.condiciones[0].operador === '>'),
  );
  if (todasPorVolumen) return 'por_volumen';
  return 'personalizado';
}

// ─── Selector de tipo (paso 1) ────────────────────────────────────────────────

const TIPOS_INFO: { id: TipoDescuento; icon: string; titulo: string; desc: string }[] = [
  {
    id: 'fijo',
    icon: '🏷️',
    titulo: 'Fijo',
    desc: 'Un porcentaje igual para todos los ítems. Se aplica manualmente al cotizar.',
  },
  {
    id: 'por_cultivo',
    icon: '🌱',
    titulo: 'Por cultivo',
    desc: 'Distintos porcentajes según el cultivo del ítem (Soja, Maíz, etc.).',
  },
  {
    id: 'por_volumen',
    icon: '📦',
    titulo: 'Por volumen',
    desc: 'El porcentaje sube con la cantidad de bolsas pedidas.',
  },
  {
    id: 'personalizado',
    icon: '⚙️',
    titulo: 'Personalizado',
    desc: 'Reglas con condiciones propias para casos avanzados.',
  },
];

// ─── Campos compartidos ───────────────────────────────────────────────────────

function CamposComunes({
  nombre, setNombre,
  fechaVigencia, setFechaVigencia,
  aplica, setAplica,
  mostrarAplica,
}: {
  nombre: string; setNombre: (v: string) => void;
  fechaVigencia: string; setFechaVigencia: (v: string) => void;
  aplica: 'item' | 'global'; setAplica: (v: 'item' | 'global') => void;
  mostrarAplica: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
          <input
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="ej: Descuento Soja 2025"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Vigencia hasta *</label>
          <input
            type="date"
            value={fechaVigencia}
            onChange={(e) => setFechaVigencia(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {mostrarAplica && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">¿Dónde aplica?</label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" checked={aplica === 'item'} onChange={() => setAplica('item')} />
              <span>En cada línea de ítem</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" checked={aplica === 'global'} onChange={() => setAplica('global')} />
              <span>En la cotización completa</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modal de formulario ──────────────────────────────────────────────────────

function DescuentoFormModal({ initial, onClose }: { initial?: Descuento; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!initial;

  // Paso 1: tipo
  const [tipo, setTipo] = useState<TipoDescuento | null>(
    initial ? inferirTipo(initial) : null,
  );

  // Campos comunes
  const [nombre, setNombre] = useState(initial?.nombre ?? '');
  const [fechaVigencia, setFechaVigencia] = useState(
    initial?.fechaVigencia
      ? new Date(initial.fechaVigencia).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  );
  const [aplica, setAplica] = useState<'item' | 'global'>(
    initial?.tipoAplicacion === 'global' ? 'global' : 'item',
  );

  // Fijo
  const [porcentajeFijo, setPorcentajeFijo] = useState(
    initial?.valorPorcentaje != null ? String(initial.valorPorcentaje) : '',
  );

  // Por cultivo: { cultivoId → porcentaje string }
  const [pctPorCultivo, setPctPorCultivo] = useState<Record<number, string>>(() => {
    if (!initial || inferirTipo(initial) !== 'por_cultivo') return {};
    const map: Record<number, string> = {};
    (initial.reglas ?? []).forEach((r: any) => {
      const cond = r.condiciones?.[0];
      if (cond) map[cond.valor] = String(r.valor);
    });
    return map;
  });

  // Por volumen: { desde: number, pct: string }[]
  const [tramos, setTramos] = useState<{ desde: number; pct: string }[]>(() => {
    if (!initial || inferirTipo(initial) !== 'por_volumen') return [{ desde: 0, pct: '' }];
    return [...(initial.reglas ?? [])]
      .sort((a: any, b: any) => b.prioridad - a.prioridad)
      .map((r: any) => ({ desde: r.condiciones?.[0]?.valor ?? 0, pct: String(r.valor) }));
  });

  // Personalizado
  const [rules, setRules] = useState<RuleData[]>(() => {
    if (!initial || initial.modo !== 'avanzado') return [];
    return (initial.reglas ?? []).map((r: any) => ({
      valor: r.valor,
      prioridad: r.prioridad,
      condiciones: (r.condiciones ?? []).map((c: any) => ({
        campo: c.campo,
        operador: c.operador,
        valor: c.valor,
        valor2: c.valor2,
      })),
    }));
  });

  const [error, setError] = useState('');

  // Cultivos (para tipo por_cultivo)
  const { data: cultivos = [] } = useQuery({
    queryKey: ['cultivos'],
    queryFn: () => productosApi.getCultivos(true),
    enabled: tipo === 'por_cultivo',
  });

  // ── Guardar ──
  const saveMut = useMutation({
    mutationFn: () => {
      const tipoAplicacion: TipoAplicacion =
        tipo === 'por_cultivo' ? 'hibrido' : aplica === 'global' ? 'global' : 'hibrido';

      if (tipo === 'fijo') {
        const payload = {
          nombre,
          tipoAplicacion,
          modo: 'basico' as const,
          valorPorcentaje: Number(porcentajeFijo),
          fechaVigencia,
        };
        return isEdit ? descuentosApi.update(initial!.id, payload) : descuentosApi.create(payload);
      }

      if (tipo === 'por_cultivo') {
        const reglas = cultivos
          .filter((c) => pctPorCultivo[c.id] && Number(pctPorCultivo[c.id]) > 0)
          .map((c, i) => ({
            valor: Number(pctPorCultivo[c.id]),
            prioridad: i + 1,
            condiciones: [{ campo: 'cultivo_id' as const, operador: '=' as const, valor: c.id }],
          }));
        const payload = {
          nombre,
          tipoAplicacion: 'hibrido' as const,
          modo: 'avanzado' as const,
          fechaVigencia,
          reglas,
        };
        return isEdit ? descuentosApi.update(initial!.id, payload) : descuentosApi.create(payload);
      }

      if (tipo === 'por_volumen') {
        const tramosOrdenados = [...tramos]
          .filter((t) => t.pct !== '' && Number(t.pct) > 0)
          .sort((a, b) => b.desde - a.desde);
        const reglas = tramosOrdenados.map((t, i) => ({
          valor: Number(t.pct),
          prioridad: i + 1,
          condiciones: [{ campo: 'cantidad' as const, operador: '>=' as const, valor: t.desde }],
        }));
        const payload = {
          nombre,
          tipoAplicacion,
          modo: 'avanzado' as const,
          fechaVigencia,
          reglas,
        };
        return isEdit ? descuentosApi.update(initial!.id, payload) : descuentosApi.create(payload);
      }

      // personalizado
      const payload = {
        nombre,
        tipoAplicacion,
        modo: 'avanzado' as const,
        fechaVigencia,
        reglas: rules.map((r) => ({
          valor: r.valor,
          prioridad: r.prioridad,
          condiciones: r.condiciones.map((c) => ({
            campo: c.campo,
            operador: c.operador,
            valor: c.valor,
            valor2: c.valor2,
          })),
        })),
      };
      return isEdit ? descuentosApi.update(initial!.id, payload) : descuentosApi.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['descuentos'] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  // ── Validación ──
  const canSave = (() => {
    if (!nombre.trim() || !fechaVigencia || !tipo) return false;
    if (tipo === 'fijo') return porcentajeFijo !== '' && Number(porcentajeFijo) >= 0;
    if (tipo === 'por_cultivo')
      return cultivos.some((c) => pctPorCultivo[c.id] && Number(pctPorCultivo[c.id]) > 0);
    if (tipo === 'por_volumen')
      return tramos.some((t) => t.pct !== '' && Number(t.pct) > 0);
    return rules.length > 0;
  })();

  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';
  const inputCls = 'border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  // ── Paso 1: selección de tipo ──
  if (!tipo) {
    return (
      <Modal title={isEdit ? 'Editar descuento' : 'Nuevo descuento'} onClose={onClose}>
        <p className="text-sm text-gray-500 mb-4">¿Qué tipo de descuento querés crear?</p>
        <div className="grid grid-cols-2 gap-3">
          {TIPOS_INFO.map((t) => (
            <button
              key={t.id}
              onClick={() => setTipo(t.id)}
              className="text-left p-4 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors group"
            >
              <div className="text-2xl mb-2">{t.icon}</div>
              <div className="font-semibold text-gray-800 text-sm mb-1 group-hover:text-blue-700">
                {t.titulo}
              </div>
              <div className="text-xs text-gray-500 leading-snug">{t.desc}</div>
            </button>
          ))}
        </div>
        <div className="flex justify-end mt-4 pt-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancelar
          </button>
        </div>
      </Modal>
    );
  }

  const tipoInfo = TIPOS_INFO.find((t) => t.id === tipo)!;

  // ── Paso 2: formulario según tipo ──
  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          {!isEdit && (
            <button
              onClick={() => setTipo(null)}
              className="text-gray-400 hover:text-gray-700 text-sm mr-1"
              title="Volver"
            >
              ←
            </button>
          )}
          <span>{tipoInfo.icon} {tipoInfo.titulo}</span>
          {isEdit && <span className="text-sm font-normal text-gray-400">— {initial!.nombre}</span>}
        </div>
      }
      onClose={onClose}
    >
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

        {/* Campos comunes */}
        <CamposComunes
          nombre={nombre} setNombre={setNombre}
          fechaVigencia={fechaVigencia} setFechaVigencia={setFechaVigencia}
          aplica={aplica} setAplica={setAplica}
          mostrarAplica={tipo !== 'por_cultivo'}
        />

        <hr className="border-gray-100" />

        {/* ── Fijo ── */}
        {tipo === 'fijo' && (
          <div>
            <label className={labelCls}>Porcentaje de descuento</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={porcentajeFijo}
                onChange={(e) => setPorcentajeFijo(e.target.value)}
                placeholder="ej: 5.00"
                className={`${inputCls} w-32 text-right`}
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Al cotizar podés elegir en qué ítems o líneas aplicarlo.
            </p>
          </div>
        )}

        {/* ── Por cultivo ── */}
        {tipo === 'por_cultivo' && (
          <div>
            <label className={labelCls}>Porcentaje por cultivo</label>
            {cultivos.length === 0 ? (
              <div className="flex justify-center py-4"><Spinner /></div>
            ) : (
              <div className="space-y-2">
                {cultivos.map((c) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-32 shrink-0">{c.nombre}</span>
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
            <p className="text-xs text-gray-400 mt-2">
              Dejá en 0 o vacío los cultivos que no tienen descuento.
              Aplica automáticamente según el cultivo del ítem.
            </p>
          </div>
        )}

        {/* ── Por volumen ── */}
        {tipo === 'por_volumen' && (
          <div>
            <label className={labelCls}>Tramos de volumen</label>
            <p className="text-xs text-gray-400 mb-3">
              Se aplica el primer tramo que coincida (de mayor a menor umbral).
            </p>
            <div className="space-y-2">
              {tramos.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-14 text-right shrink-0">desde</span>
                  <input
                    type="number"
                    min={0}
                    value={t.desde}
                    onChange={(e) => {
                      const next = [...tramos];
                      next[i] = { ...next[i], desde: Number(e.target.value) };
                      setTramos(next);
                    }}
                    className={`${inputCls} w-24 text-right`}
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-500">bolsas</span>
                  <span className="text-gray-300">→</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={t.pct}
                    onChange={(e) => {
                      const next = [...tramos];
                      next[i] = { ...next[i], pct: e.target.value };
                      setTramos(next);
                    }}
                    className={`${inputCls} w-20 text-right`}
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-500">%</span>
                  {tramos.length > 1 && (
                    <button
                      onClick={() => setTramos(tramos.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-600 text-lg leading-none px-1"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => setTramos([...tramos, { desde: 0, pct: '' }])}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              + Agregar tramo
            </button>
          </div>
        )}

        {/* ── Personalizado ── */}
        {tipo === 'personalizado' && (
          <div>
            <label className={labelCls}>Reglas de descuento</label>
            <RuleBuilder rules={rules} onChange={setRules} />
          </div>
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

// ─── Modal detalle/editar/eliminar ────────────────────────────────────────────

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

  const tipo = inferirTipo(descuento);
  const tipoInfo = TIPOS_INFO.find((t) => t.id === tipo)!;

  return (
    <Modal title={descuento.nombre} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-xl">{tipoInfo.icon}</span>
          <div>
            <div className="font-medium text-gray-800">{tipoInfo.titulo}</div>
            <div className="text-xs text-gray-400">{tipoInfo.desc}</div>
          </div>
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
            <span className="text-gray-400">Aplica:</span>{' '}
            <span className="font-medium">
              {descuento.tipoAplicacion === 'global' ? 'Cotización completa' : 'Por ítem'}
            </span>
          </div>
        </div>

        {tipo === 'fijo' && (
          <div className="bg-blue-50 rounded-lg p-3 text-sm flex items-center gap-2">
            <span className="text-gray-600">Porcentaje fijo:</span>
            <span className="font-bold text-blue-700 text-lg">{descuento.valorPorcentaje}%</span>
          </div>
        )}

        {tipo === 'por_cultivo' && (
          <div className="text-sm">
            <div className="font-medium text-gray-700 mb-2">Porcentaje por cultivo:</div>
            <div className="space-y-1">
              {(descuento.reglas ?? []).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5">
                  <span className="text-gray-600">Cultivo #{r.condiciones?.[0]?.valor}</span>
                  <span className="font-semibold text-blue-700">{r.valor}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tipo === 'por_volumen' && (
          <div className="text-sm">
            <div className="font-medium text-gray-700 mb-2">Tramos por volumen:</div>
            <div className="space-y-1">
              {[...(descuento.reglas ?? [])]
                .sort((a: any, b: any) => a.prioridad - b.prioridad)
                .map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5">
                    <span className="text-gray-600">
                      Desde {r.condiciones?.[0]?.valor} bolsas
                    </span>
                    <span className="font-semibold text-blue-700">{r.valor}%</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {tipo === 'personalizado' && (
          <div className="text-sm">
            <div className="font-medium text-gray-700 mb-2">
              Reglas ({descuento.reglas?.length ?? 0}):
            </div>
            {(descuento.reglas ?? []).map((r: any) => (
              <div key={r.id} className="bg-gray-50 rounded-lg p-3 mb-2">
                <div className="font-medium text-gray-800 mb-1">#{r.prioridad} — {r.valor}%</div>
                {r.condiciones?.map((c: any) => (
                  <div key={c.id} className="text-xs text-gray-500">
                    {c.campo} {c.operador} {c.valor}
                    {c.valor2 != null ? ` y ${c.valor2}` : ''}
                  </div>
                ))}
              </div>
            ))}
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
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-left px-4 py-3">Valor / Reglas</th>
              <th className="text-left px-4 py-3">Aplica a</th>
              <th className="text-left px-4 py-3">Vigencia</th>
              <th className="text-left px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {descuentos.map((d) => {
              const t = inferirTipo(d);
              const info = TIPOS_INFO.find((x) => x.id === t)!;
              return (
                <tr
                  key={d.id}
                  onClick={() => setSelected(d)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{d.nombre}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                      {info.icon} {info.titulo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {d.modo === 'basico'
                      ? `${d.valorPorcentaje}%`
                      : `${d.reglas?.length ?? 0} regla(s)`}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {d.tipoAplicacion === 'global' ? 'Cotización completa' : 'Por ítem'}
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
