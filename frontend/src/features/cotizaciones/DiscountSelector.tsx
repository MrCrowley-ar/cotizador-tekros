import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { descuentosApi } from '../../api/descuentos';
import { Modal } from '../../components/Modal';
import { Spinner } from '../../components/Spinner';
import { Badge } from '../../components/Badge';
import type { CotizacionItem, CotizacionVersion } from '../../api/types';
import { cotizacionesApi } from '../../api/cotizaciones';

interface Props {
  cotizacionId: number;
  version: CotizacionVersion;
  item?: CotizacionItem; // if undefined → global discount
  onClose: () => void;
}

export function DiscountSelector({ cotizacionId, version, item, onClose }: Props) {
  const qc = useQueryClient();
  const [applying, setApplying] = useState<number | null>(null);
  const [error, setError] = useState('');
  // Selected option index for selector-mode discounts: { descuentoId → reglaIndex }
  const [selectorOpciones, setSelectorOpciones] = useState<Record<number, number>>({});

  const { data: descuentos = [], isLoading } = useQuery({
    queryKey: ['descuentos', 'activos'],
    queryFn: () => descuentosApi.getAll(true),
  });

  // IDs already applied to this item or version
  const appliedIds = new Set(
    item
      ? item.descuentos.map((d) => d.descuentoId)
      : version.descuentos.map((d) => d.descuentoId),
  );

  // Calcula el ratio_cultivo para el ítem actual (bolsas_cultivo / total_bolsas)
  function getRatioCultivo(): number | undefined {
    if (!item) return undefined;
    const totalBolsas = version.items.reduce((sum, i) => sum + Number(i.bolsas), 0);
    if (totalBolsas === 0) return undefined;
    const bolsasCultivo = version.items
      .filter((i) => i.cultivoId === item.cultivoId)
      .reduce((sum, i) => sum + Number(i.bolsas), 0);
    return bolsasCultivo / totalBolsas;
  }

  // Calcula los agregados de la cotización: volumen/monto a nivel cultivo y global
  function getAgregados() {
    const subtotalItems = version.items.reduce((sum, i) => sum + Number(i.subtotal), 0);
    const descuentosItems = version.items.reduce((sum, i) => {
      const totalPct = (i.descuentos ?? []).reduce((dp, d) => dp + Number(d.valorPorcentaje), 0);
      return sum + Number(i.subtotal) * totalPct / 100;
    }, 0);
    const totalCotizacion = Number(version.total);

    if (item) {
      const bolsasCultivo = version.items
        .filter((i) => i.cultivoId === item.cultivoId)
        .reduce((sum, i) => sum + Number(i.bolsas), 0);
      const montoCultivo = version.items
        .filter((i) => i.cultivoId === item.cultivoId)
        .reduce((sum, i) => sum + Number(i.precioBase), 0);
      const precioPonderado = bolsasCultivo > 0 ? montoCultivo / bolsasCultivo : undefined;
      return {
        volumen: bolsasCultivo,
        monto: montoCultivo,
        ...(precioPonderado != null ? { precioPonderado } : {}),
        subtotalItems,
        descuentosItems,
        totalCotizacion,
      };
    }

    // alcance global
    return {
      subtotalItems,
      descuentosItems,
      totalCotizacion,
    };
  }

  async function apply(descuentoId: number, valorPorcentaje: number | null, modo: string) {
    setApplying(descuentoId);
    setError('');
    try {
      let porcentaje: number | undefined = undefined;

      if (modo === 'selector') {
        const descuento = descuentos.find((d) => d.id === descuentoId);
        const reglas = [...(descuento?.reglas ?? [])].sort((a, b) => a.prioridad - b.prioridad);
        const idx = selectorOpciones[descuentoId] ?? 0;
        const regla = reglas[idx];
        if (!regla) {
          setError('Seleccioná una opción');
          return;
        }
        porcentaje = Number(regla.valor);
      } else if (modo === 'avanzado') {
        const ratioCultivo = getRatioCultivo();
        const agregados = getAgregados();
        const ctx = item
          ? {
              ...(item.bolsas != null ? { cantidad: Number(item.bolsas) } : {}),
              tipoAplicacion: 'global' as const,
              cultivoId: item.cultivoId,
              hibridoId: item.hibridoId,
              bandaId: item.bandaId,
              precio: Number(item.precioBase),
              subtotal: Number(item.subtotal),
              ...(ratioCultivo != null ? { ratioCultivo } : {}),
              ...agregados,
            }
          : { tipoAplicacion: 'global' as const, ...agregados };

        const resultados = await descuentosApi.evaluar({ ...ctx });
        const match = resultados.find((r) => r.descuentoId === descuentoId);
        if (!match) {
          setError('Este descuento avanzado no aplica al contexto actual');
          return;
        }
        porcentaje = match.porcentaje;
      } else {
        porcentaje = valorPorcentaje ?? undefined;
      }

      if (item) {
        await cotizacionesApi.applyItemDescuento(cotizacionId, version.id, item.id, {
          descuentoId,
          porcentaje,
        });
      } else {
        await cotizacionesApi.applyGlobalDescuento(cotizacionId, version.id, {
          descuentoId,
          porcentaje,
        });
      }

      await qc.invalidateQueries({ queryKey: ['version', cotizacionId] });
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Error al aplicar descuento');
    } finally {
      setApplying(null);
    }
  }

  return (
    <Modal title={item ? `Descuento en ítem` : 'Descuento global'} onClose={onClose}>
      {isLoading ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : (
        <div className="space-y-2">
          {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
          {descuentos.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Sin descuentos activos</p>
          )}
          {descuentos.map((d) => {
            const isApplied = appliedIds.has(d.id);
            const isSelector = d.modo === 'selector';
            const reglasSorted = [...(d.reglas ?? [])].sort((a, b) => a.prioridad - b.prioridad);
            const selectedIdx = selectorOpciones[d.id] ?? 0;

            return (
              <div
                key={d.id}
                className={`p-3 rounded-lg border ${isApplied ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800">{d.nombre}</span>
                      <Badge label={d.modo} />
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {d.modo === 'basico'
                        ? `${d.valorPorcentaje}%`
                        : isSelector
                        ? `${reglasSorted.length} opción(es)`
                        : `${d.reglas?.length ?? 0} regla(s) configurada(s)`}
                    </div>
                  </div>
                  {isApplied ? (
                    <span className="text-xs text-green-700 font-medium shrink-0">Aplicado</span>
                  ) : !isSelector ? (
                    <button
                      onClick={() => apply(d.id, d.valorPorcentaje, d.modo)}
                      disabled={applying === d.id}
                      className="ml-3 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
                    >
                      {applying === d.id ? <Spinner /> : 'Aplicar'}
                    </button>
                  ) : null}
                </div>

                {/* Selector options */}
                {isSelector && !isApplied && reglasSorted.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <select
                      value={selectedIdx}
                      onChange={(e) =>
                        setSelectorOpciones((prev) => ({ ...prev, [d.id]: Number(e.target.value) }))
                      }
                      className="flex-1 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {reglasSorted.map((r, idx) => (
                        <option key={r.id} value={idx}>
                          {r.nombre ?? `Opción ${idx + 1}`} — {r.valor}%
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => apply(d.id, null, d.modo)}
                      disabled={applying === d.id}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
                    >
                      {applying === d.id ? <Spinner /> : 'Aplicar'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
