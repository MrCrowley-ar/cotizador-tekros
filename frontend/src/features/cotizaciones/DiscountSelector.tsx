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

  async function apply(descuentoId: number, valorPorcentaje: number | null, modo: string) {
    setApplying(descuentoId);
    setError('');
    try {
      let porcentaje: number | undefined = undefined;

      if (modo === 'avanzado') {
        // For advanced discounts, evaluate first to get the percentage
        const ctx = item
          ? {
              cantidad: item.bolsas,
              tipoAplicacion: 'global' as const,
              cultivoId: item.cultivoId,
              hibridoId: item.hibridoId,
              bandaId: item.bandaId,
            }
          : { tipoAplicacion: 'global' as const };

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
            return (
              <div
                key={d.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${isApplied ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{d.nombre}</span>
                    <Badge label={d.modo} />
                    <Badge label={d.tipoAplicacion} />
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {d.modo === 'basico'
                      ? `${d.valorPorcentaje}%`
                      : `${d.reglas?.length ?? 0} regla(s) configurada(s)`}
                  </div>
                </div>
                {isApplied ? (
                  <span className="text-xs text-green-700 font-medium">Aplicado</span>
                ) : (
                  <button
                    onClick={() => apply(d.id, d.valorPorcentaje, d.modo)}
                    disabled={applying === d.id}
                    className="ml-3 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {applying === d.id ? <Spinner /> : 'Aplicar'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
