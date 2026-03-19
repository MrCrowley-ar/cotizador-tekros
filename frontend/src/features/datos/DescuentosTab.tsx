import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { descuentosApi } from '../../api/descuentos';
import { Modal } from '../../components/Modal';
import { Spinner } from '../../components/Spinner';
import { Badge } from '../../components/Badge';
import { RuleBuilder } from './RuleBuilder';
import type { RuleData } from './RuleBuilder';
import type { Descuento, TipoAplicacion } from '../../api/types';

const TIPOS: TipoAplicacion[] = ['global', 'cultivo', 'hibrido'];

function DescuentoModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [nombre, setNombre] = useState('');
  const [tipoAplicacion, setTipoAplicacion] = useState<TipoAplicacion>('global');
  const [modo, setModo] = useState<'basico' | 'avanzado'>('basico');
  const [valorPorcentaje, setValorPorcentaje] = useState('');
  const [fechaVigencia, setFechaVigencia] = useState(new Date().toISOString().split('T')[0]);
  const [rules, setRules] = useState<RuleData[]>([]);
  const [error, setError] = useState('');

  const createMut = useMutation({
    mutationFn: () =>
      descuentosApi.create({
        nombre,
        tipoAplicacion,
        modo,
        fechaVigencia,
        ...(modo === 'basico'
          ? { valorPorcentaje: Number(valorPorcentaje) }
          : {
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
            }),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['descuentos'] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  const canSave =
    nombre.trim() &&
    fechaVigencia &&
    (modo === 'basico' ? valorPorcentaje !== '' : rules.length > 0);

  return (
    <Modal title="Nuevo descuento" onClose={onClose}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
          <input
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo aplicación</label>
            <select
              value={tipoAplicacion}
              onChange={(e) => setTipoAplicacion(e.target.value as TipoAplicacion)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha vigencia</label>
            <input
              type="date"
              value={fechaVigencia}
              onChange={(e) => setFechaVigencia(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Modo</label>
          <div className="flex gap-3">
            {(['basico', 'avanzado'] as const).map((m) => (
              <label key={m} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="modo"
                  value={m}
                  checked={modo === m}
                  onChange={() => setModo(m)}
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-700 capitalize">{m}</span>
              </label>
            ))}
          </div>
        </div>

        {modo === 'basico' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Porcentaje (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={valorPorcentaje}
              onChange={(e) => setValorPorcentaje(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ej: 5.00"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reglas de descuento
            </label>
            <RuleBuilder rules={rules} onChange={setRules} />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
          Cancelar
        </button>
        <button
          disabled={!canSave || createMut.isPending}
          onClick={() => createMut.mutate()}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {createMut.isPending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </Modal>
  );
}

function DescuentoDetailModal({ descuento, onClose }: { descuento: Descuento; onClose: () => void }) {
  const qc = useQueryClient();
  const toggleMut = useMutation({
    mutationFn: () => descuentosApi.toggle(descuento.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['descuentos'] }); onClose(); },
  });

  return (
    <Modal title={descuento.nombre} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Modo:</span>
            <span className="ml-2 font-medium capitalize">{descuento.modo}</span>
          </div>
          <div>
            <span className="text-gray-500">Tipo:</span>
            <span className="ml-2 font-medium">{descuento.tipoAplicacion}</span>
          </div>
          <div>
            <span className="text-gray-500">Vigencia:</span>
            <span className="ml-2 font-medium">
              {new Date(descuento.fechaVigencia).toLocaleDateString('es-AR')}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Estado:</span>
            <span className="ml-2"><Badge label={descuento.activo ? 'activo' : 'inactivo'} /></span>
          </div>
        </div>

        {descuento.modo === 'basico' ? (
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <span className="text-gray-600">Porcentaje fijo:</span>
            <span className="ml-2 font-bold text-blue-700">{descuento.valorPorcentaje}%</span>
          </div>
        ) : (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">
              Reglas ({descuento.reglas?.length ?? 0}):
            </div>
            {descuento.reglas?.map((regla) => (
              <div key={regla.id} className="bg-gray-50 rounded-lg p-3 mb-2 text-sm">
                <div className="font-medium text-gray-800 mb-1">
                  #{regla.prioridad} — {regla.valor}%
                </div>
                {regla.condiciones.map((c) => (
                  <div key={c.id} className="text-xs text-gray-500">
                    {c.campo} {c.operador} {c.valor}
                    {c.valor2 != null ? ` y ${c.valor2}` : ''}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cerrar
          </button>
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
        </div>
      </div>
    </Modal>
  );
}

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
              <th className="text-left px-4 py-3">Modo</th>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-left px-4 py-3">Porcentaje / Reglas</th>
              <th className="text-left px-4 py-3">Vigencia</th>
              <th className="text-left px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {descuentos.map((d) => (
              <tr
                key={d.id}
                onClick={() => setSelected(d)}
                className="hover:bg-blue-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-medium text-gray-900">{d.nombre}</td>
                <td className="px-4 py-3"><Badge label={d.modo} /></td>
                <td className="px-4 py-3 text-gray-600">{d.tipoAplicacion}</td>
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
            ))}
          </tbody>
        </table>
        {descuentos.length === 0 && (
          <p className="text-center py-8 text-gray-400 text-sm">Sin descuentos configurados.</p>
        )}
      </div>

      {showNew && <DescuentoModal onClose={() => setShowNew(false)} />}
      {selected && <DescuentoDetailModal descuento={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
