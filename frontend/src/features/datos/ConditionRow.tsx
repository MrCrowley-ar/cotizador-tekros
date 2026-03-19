import type { CampoCondicion, OperadorCondicion } from '../../api/types';

export interface ConditionData {
  campo: CampoCondicion;
  operador: OperadorCondicion;
  valor: number;
  valor2?: number;
}

interface Props {
  condition: ConditionData;
  index: number;
  onChange: (index: number, data: ConditionData) => void;
  onRemove: (index: number) => void;
}

const CAMPOS: { value: CampoCondicion; label: string }[] = [
  { value: 'cantidad', label: 'Cantidad' },
  { value: 'cultivo_id', label: 'Cultivo ID' },
  { value: 'hibrido_id', label: 'Híbrido ID' },
  { value: 'banda_id', label: 'Banda ID' },
];

const OPERADORES: { value: OperadorCondicion; label: string }[] = [
  { value: '=', label: '=' },
  { value: '!=', label: '≠' },
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '≥' },
  { value: '<=', label: '≤' },
  { value: 'entre', label: 'entre' },
];

export function ConditionRow({ condition, index, onChange, onRemove }: Props) {
  const update = (partial: Partial<ConditionData>) =>
    onChange(index, { ...condition, ...partial });

  return (
    <div className="flex items-center gap-2 text-sm">
      <select
        value={condition.campo}
        onChange={(e) => update({ campo: e.target.value as CampoCondicion })}
        className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {CAMPOS.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>

      <select
        value={condition.operador}
        onChange={(e) => update({ operador: e.target.value as OperadorCondicion })}
        className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {OPERADORES.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <input
        type="number"
        value={condition.valor}
        onChange={(e) => update({ valor: Number(e.target.value) })}
        className="border rounded px-2 py-1 w-20 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        placeholder="valor"
      />

      {condition.operador === 'entre' && (
        <>
          <span className="text-gray-500 text-xs">y</span>
          <input
            type="number"
            value={condition.valor2 ?? ''}
            onChange={(e) => update({ valor2: Number(e.target.value) })}
            className="border rounded px-2 py-1 w-20 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="valor2"
          />
        </>
      )}

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
