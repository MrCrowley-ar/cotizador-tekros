import { useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import type { Cotizacion, CotizacionVersion, Descuento, TotalDesglose } from '../../api/types';

const fmt = (n: number) =>
  n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface ExportPngProps {
  cotizacion?: Cotizacion;
  version?: CotizacionVersion;
  totals?: TotalDesglose;
  allDescuentos: Descuento[];
  activeDescuentos: Descuento[];
}

export function useCotizacionExportPng({
  cotizacion,
  version,
  totals,
  allDescuentos,
  activeDescuentos,
}: ExportPngProps) {
  const ref = useRef<HTMLDivElement>(null);

  const download = useCallback(async () => {
    if (!ref.current || !cotizacion || !version) return;
    try {
      const dataUrl = await toPng(ref.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `${cotizacion.numero}_v${version.version}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error generando PNG:', err);
    }
  }, [cotizacion, version]);

  // If data not ready, return empty node
  if (!cotizacion || !version || !totals) {
    return { node: null, download };
  }

  const items = version.items ?? [];
  const fecha = new Date().toLocaleDateString('es-AR');
  const cliente = cotizacion.cliente;

  // Total bolsas & precio ponderado
  const totalBolsas = items.reduce((s, i) => s + Number(i.bolsas), 0);
  const totalMonto = items.reduce((s, i) => s + Number(i.precioBase), 0);
  const precioPonderado = totalBolsas > 0 ? totalMonto / totalBolsas : 0;

  // Medio de pago: find applied global selector discount
  const globalSelectorDescs = allDescuentos.filter(
    (d) => d.tipoAplicacion === 'global' && d.modo === 'selector',
  );
  let medioDePago = '—';
  for (const desc of globalSelectorDescs) {
    // Check per-item (selectors moved to per-item application)
    const appliedItem = items[0]?.descuentos.find((d) => d.descuentoId === desc.id);
    // Also check global descuentos
    const appliedGlobal = version.descuentos.find((d) => d.descuentoId === desc.id);
    const appliedPct = appliedItem
      ? Number(appliedItem.valorPorcentaje)
      : appliedGlobal
        ? Number(appliedGlobal.valorPorcentaje)
        : null;
    if (appliedPct !== null) {
      const regla = [...(desc.reglas ?? [])]
        .sort((a, b) => a.prioridad - b.prioridad)
        .find((r) => Number(r.valor) === appliedPct);
      medioDePago = regla?.nombre ?? `${appliedPct}%`;
      break;
    }
  }

  // Compute item subtotal after discounts — same logic as ItemRow
  function getItemSubtotal(item: typeof items[0]) {
    const bruto = Number(item.precioBase);
    return activeDescuentos.reduce((acc, d) => {
      const applied = item.descuentos.find((x) => x.descuentoId === d.id);
      if (!applied) return acc;
      return acc * (1 - Number(applied.valorPorcentaje) / 100);
    }, bruto);
  }

  const node = (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: '-9999px',
        top: 0,
        width: '800px',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '14px',
        color: '#111',
        background: '#fff',
        padding: '40px',
      }}
    >
      <h1 style={{ textAlign: 'center', fontSize: '22px', fontWeight: 'bold', marginBottom: '24px' }}>
        Cotización Tekros
      </h1>

      <div style={{ marginBottom: '24px', lineHeight: '1.8' }}>
        <div>Fecha: {fecha}</div>
        <div>Cliente: {cliente?.razonSocial ?? cliente?.nombre ?? '—'}</div>
        <div>CUIT: {cliente?.cuit ?? '—'}</div>
        <div>Total Bolsas: {totalBolsas.toLocaleString('es-AR')}</div>
        <div>Precio Promedio: {fmt(precioPonderado)} USD</div>
        <div>Total USD: {fmt(totals.total)}</div>
        <div>Medio de pago: {medioDePago}</div>
      </div>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '16px',
          fontSize: '13px',
        }}
      >
        <thead>
          <tr style={{ borderBottom: '2px solid #333' }}>
            <th style={{ textAlign: 'left', padding: '8px', fontWeight: 'bold' }}>Híbrido</th>
            <th style={{ textAlign: 'center', padding: '8px', fontWeight: 'bold' }}>Banda</th>
            <th style={{ textAlign: 'center', padding: '8px', fontWeight: 'bold' }}>Bolsas</th>
            <th style={{ textAlign: 'right', padding: '8px', fontWeight: 'bold' }}>Precio USD</th>
            <th style={{ textAlign: 'right', padding: '8px', fontWeight: 'bold' }}>Total USD</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const subtotal = getItemSubtotal(item);
            const totalItem = subtotal * Number(item.bolsas);
            return (
              <tr key={item.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '8px' }}>{item.hibrido?.nombre ?? item.hibridoId}</td>
                <td style={{ textAlign: 'center', padding: '8px' }}>{item.banda?.nombre ?? item.bandaId}</td>
                <td style={{ textAlign: 'center', padding: '8px' }}>{Number(item.bolsas).toLocaleString('es-AR')}</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>{fmt(subtotal)}</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>{fmt(totalItem)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return { node, download };
}
