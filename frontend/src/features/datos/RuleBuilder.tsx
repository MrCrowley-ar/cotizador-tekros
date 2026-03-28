import { useState } from 'react';
import { ConditionRow, CAMPOS, FRACCIONES } from './ConditionRow';
import type { ConditionData } from './ConditionRow';

export interface RuleData {
  valor: number;
  prioridad: number;
  condiciones: ConditionData[];
}

interface Props {
  rules: RuleData[];
  onChange: (rules: RuleData[]) => void;
}

const CAMPO_LABEL: Record<string, string> = Object.fromEntries(
  CAMPOS.map((c) => [c.value, c.label]),
);

function describeCondition(c: ConditionData): string {
  const campoLabel = CAMPO_LABEL[c.campo] ?? c.campo;
  const opLabel: Record<string, string> = {
    '=': '=', '!=': '≠', '>': '>', '<': '<', '>=': '≥', '<=': '≤', 'entre': 'entre',
  };
  const op = opLabel[c.operador] ?? c.operador;

  if (c.valorCampo) {
    const fracLabel = FRACCIONES.find(
      (f) => Math.abs(f.value - (c.valorMultiplier ?? 1)) < 0.0001,
    )?.label ?? `×${c.valorMultiplier}`;
    const campo2Label = CAMPO_LABEL[c.valorCampo] ?? c.valorCampo;
    return `${campoLabel} ${op} ${fracLabel} ${campo2Label}`;
  }

  if (c.operador === 'entre') {
    return `${campoLabel} entre ${c.valor} y ${c.valor2 ?? '?'}`;
  }
  return `${campoLabel} ${op} ${c.valor}`;
}

function describeRule(rule: RuleData): string {
  if (rule.condiciones.length === 0) return `${rule.valor}% (sin condiciones)`;
  const conds = rule.condiciones.map(describeCondition).join(' Y ');
  return `Si ${conds} → ${rule.valor}%`;
}

export function RuleBuilder({ rules, onChange }: Props) {
  const [expanded, setExpanded] = useState<number | null>(0);

  function addRule() {
    const newRule: RuleData = {
      valor: 0,
      prioridad: rules.length + 1,
      condiciones: [{ campo: 'cantidad', operador: '>=', valor: 0 }],
    };
    onChange([...rules, newRule]);
    setExpanded(rules.length);
  }

  function removeRule(idx: number) {
    const next = rules.filter((_, i) => i !== idx).map((r, i) => ({ ...r, prioridad: i + 1 }));
    onChange(next);
    setExpanded(null);
  }

  function updateRule(idx: number, partial: Partial<RuleData>) {
    onChange(rules.map((r, i) => (i === idx ? { ...r, ...partial } : r)));
  }

  function addCondition(ruleIdx: number) {
    const rule = rules[ruleIdx];
    updateRule(ruleIdx, {
      condiciones: [...rule.condiciones, { campo: 'cantidad', operador: '>=', valor: 0 }],
    });
  }

  function updateCondition(ruleIdx: number, condIdx: number, data: ConditionData) {
    const rule = rules[ruleIdx];
    updateRule(ruleIdx, {
      condiciones: rule.condiciones.map((c, i) => (i === condIdx ? data : c)),
    });
  }

  function removeCondition(ruleIdx: number, condIdx: number) {
    const rule = rules[ruleIdx];
    updateRule(ruleIdx, {
      condiciones: rule.condiciones.filter((_, i) => i !== condIdx),
    });
  }

  return (
    <div className="space-y-3">
      {rules.map((rule, ruleIdx) => (
        <div key={ruleIdx} className="border rounded-lg overflow-hidden">
          <div
            className="flex items-center justify-between px-3 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100"
            onClick={() => setExpanded(expanded === ruleIdx ? null : ruleIdx)}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-mono">#{rule.prioridad}</span>
              <span className="text-sm text-gray-700">{describeRule(rule)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); removeRule(ruleIdx); }}
                className="text-red-400 hover:text-red-600 text-xs px-2 py-0.5 rounded hover:bg-red-50"
              >
                Eliminar
              </button>
              <span className="text-gray-400 text-xs">{expanded === ruleIdx ? '▲' : '▼'}</span>
            </div>
          </div>

          {expanded === ruleIdx && (
            <div className="p-3 space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-600 font-medium w-24">Porcentaje:</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={rule.valor}
                  onChange={(e) => updateRule(ruleIdx, { valor: Number(e.target.value) })}
                  className="border rounded px-2 py-1 w-24 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>

              <div>
                <div className="text-xs text-gray-500 font-medium mb-2">
                  Condiciones (todas deben cumplirse):
                </div>
                <div className="space-y-2">
                  {rule.condiciones.map((cond, condIdx) => (
                    <ConditionRow
                      key={condIdx}
                      condition={cond}
                      index={condIdx}
                      onChange={(ci, data) => updateCondition(ruleIdx, ci, data)}
                      onRemove={(ci) => removeCondition(ruleIdx, ci)}
                    />
                  ))}
                </div>
                <button
                  onClick={() => addCondition(ruleIdx)}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  + Agregar condición
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={addRule}
        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
      >
        + Agregar regla
      </button>

      {rules.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-xs font-medium text-blue-700 mb-1">Vista previa (primera regla que coincida gana):</div>
          <div className="space-y-1">
            {rules.map((rule, i) => (
              <div key={i} className="text-xs text-blue-600">{i + 1}. {describeRule(rule)}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
