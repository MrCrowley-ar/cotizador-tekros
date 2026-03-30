import type { CampoCondicion, OperadorCondicion } from '../../api/types';

export interface ConditionData {
  campo: CampoCondicion;
  operador: OperadorCondicion;
  // Modo fijo: valor numérico de referencia
  valor: number;
  valor2?: number;
  // Modo relativo: lado derecho = valorMultiplier × ctx[valorCampo]
  valorCampo?: CampoCondicion;
  valorMultiplier?: number;
}

interface Props {
  condition: ConditionData;
  index: number;
  onChange: (index: number, data: ConditionData) => void;
  onRemove: (index: number) => void;
}

export const CAMPOS: { value: CampoCondicion; label: string }[] = [
  // Variables por ítem/híbrido
  { value: 'cantidad',         label: 'Bolsas' },
  { value: 'precio',           label: 'P.BASE' },
  { value: 'subtotal',         label: 'Subtotal' },
  // Agregados por cultivo
  { value: 'volumen',          label: 'Volumen (bolsas)' },
  { value: 'monto',            label: 'Monto ($)' },
  { value: 'precio_ponderado', label: 'P. ponderado' },
  // Totales globales de la cotización
  { value: 'subtotal_items',   label: 'Subtotal ítems' },
  { value: 'desc_items',       label: 'Desc. ítems' },
  { value: 'total',            label: 'Total' },
  // Identificadores
  { value: 'cultivo_id',       label: 'Cultivo' },
  { value: 'hibrido_id',       label: 'Híbrido' },
  { value: 'banda_id',         label: 'Banda' },
];

const OPERADORES: { value: OperadorCondicion; label: string }[] = [
  { value: '=',     label: '=' },
  { value: '!=',    label: '≠' },
  { value: '>',     label: '>' },
  { value: '<',     label: '<' },
  { value: '>=',    label: '≥' },
  { value: '<=',    label: '≤' },
  { value: 'entre', label: 'entre' },
];

// Fracciones disponibles para comparación relativa
export const FRACCIONES: { value: number; label: string }[] = [
  { value: 1,       label: '1 ×' },
  { value: 0.5,     label: '½ de' },
  { value: 1/3,     label: '⅓ de' },
  { value: 2/3,     label: '⅔ de' },
  { value: 0.25,    label: '¼ de' },
  { value: 0.75,    label: '¾ de' },
  { value: 2,       label: '2 ×' },
];

export function ConditionRow({ condition, index, onChange, onRemove }: Props) {
  const update = (partial: Partial<ConditionData>) =>
    onChange(index, { ...condition, ...partial });

  const isRelativo = !!condition.valorCampo;

  function toggleModo() {
    if (isRelativo) {
      // Volver a modo fijo
      update({ valorCampo: undefined, valorMultiplier: undefined, valor: 0 });
    } else {
      // Pasar a modo relativo
      update({ valorCampo: 'monto', valorMultiplier: 0.5, valor: 0 });
    }
  }

  const inputCls = 'border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {/* Campo izquierdo */}
      <select
        value={condition.campo}
        onChange={(e) => update({ campo: e.target.value as CampoCondicion })}
        className={inputCls}
      >
        {CAMPOS.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>

      {/* Operador */}
      <select
        value={condition.operador}
        onChange={(e) => update({ operador: e.target.value as OperadorCondicion })}
        className={inputCls}
      >
        {OPERADORES.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Valor fijo */}
      {!isRelativo && (
        <>
          <input
            type="number"
            value={condition.valor}
            onChange={(e) => update({ valor: Number(e.target.value) })}
            className={`${inputCls} w-20`}
            placeholder="valor"
          />
          {condition.operador === 'entre' && (
            <>
              <span className="text-gray-500 text-xs">y</span>
              <input
                type="number"
                value={condition.valor2 ?? ''}
                onChange={(e) => update({ valor2: Number(e.target.value) })}
                className={`${inputCls} w-20`}
                placeholder="hasta"
              />
            </>
          )}
        </>
      )}

      {/* Valor relativo: fracción × campo */}
      {isRelativo && (
        <>
          <select
            value={condition.valorMultiplier ?? 0.5}
            onChange={(e) => update({ valorMultiplier: Number(e.target.value) })}
            className={inputCls}
          >
            {FRACCIONES.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <select
            value={condition.valorCampo}
            onChange={(e) => update({ valorCampo: e.target.value as CampoCondicion })}
            className={inputCls}
          >
            {CAMPOS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </>
      )}

      {/* Toggle modo fijo / relativo */}
      <button
        type="button"
        onClick={toggleModo}
        title={isRelativo ? 'Cambiar a valor fijo' : 'Comparar con fracción de otra variable'}
        className={`px-2 py-1 text-xs rounded border transition-colors ${
          isRelativo
            ? 'bg-purple-100 border-purple-300 text-purple-700 hover:bg-purple-200'
            : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'
        }`}
      >
        {isRelativo ? '÷ var' : '÷'}
      </button>

      <button
        onClick={() => onRemove(index)}
        className="text-red-400 hover:text-red-600 text-lg leading-none px-1"
        title="Eliminar condición"
      >
        ×
      </button>
    </div>
  );
}
