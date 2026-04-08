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

  if (!cotizacion || !version || !totals) {
    return { node: null, download };
  }

  const items = version.items ?? [];
  const fecha = new Date().toLocaleDateString('es-AR');
  const cliente = cotizacion.cliente;

  const totalBolsas = items.reduce((s, i) => s + Number(i.bolsas), 0);
  const totalMonto = items.reduce((s, item) => {
    const subtUnit = getItemSubtotal(item);
    return s + subtUnit * Number(item.bolsas);
  }, 0);
  const precioPonderado = totalBolsas > 0 ? totalMonto / totalBolsas : 0;

  // Group items by cultivo
  const cultivoMap = new Map<string, typeof items>();
  for (const item of items) {
    const name = item.cultivo?.nombre ?? `Cultivo ${item.cultivoId}`;
    const arr = cultivoMap.get(name) ?? [];
    arr.push(item);
    cultivoMap.set(name, arr);
  }
  const cultivoGroups = [...cultivoMap.entries()];

  // Compute item subtotal after discounts, optionally filtering by seccionId
  function getItemSubtotal(item: typeof items[0], seccionId?: number) {
    const bruto = Number(item.precioBase);
    const descs = seccionId
      ? item.descuentos.filter((d) => !d.seccionId || d.seccionId === seccionId)
      : item.descuentos;
    return activeDescuentos.reduce((acc, d) => {
      if (d.modo === 'comision') {
        if (d.comisionMargen == null || d.comisionDescuentoId == null) return acc;
        const refApplied = descs.find((x) => x.descuentoId === d.comisionDescuentoId);
        if (!refApplied) return acc;
        const pct = Math.max(0, Number(d.comisionMargen) - Number(refApplied.valorPorcentaje));
        return acc * (1 - pct / 100);
      }
      const applied = descs.find((x) => x.descuentoId === d.id);
      if (!applied) return acc;
      return acc * (1 - Number(applied.valorPorcentaje) / 100);
    }, bruto);
  }

  // Detect sections
  const secciones = version.secciones ?? [];
  const hasSecciones = secciones.length > 0;

  // Resolve section label from variable selector discount
  function getSeccionLabel(seccion: typeof secciones[0]): string {
    // Find the selector discount applied in this section
    for (const desc of allDescuentos) {
      if (desc.modo !== 'selector') continue;
      // Check item descuentos for this section
      for (const item of items) {
        const applied = item.descuentos.find(
          (d) => d.descuentoId === desc.id && d.seccionId === seccion.id,
        );
        if (applied) {
          const pct = Number(applied.valorPorcentaje);
          const regla = [...(desc.reglas ?? [])]
            .sort((a, b) => a.prioridad - b.prioridad)
            .find((r) => Number(r.valor) === pct);
          return regla?.nombre ?? `${desc.nombre} ${pct}%`;
        }
      }
      // Check global descuentos
      const appliedGlobal = (version?.descuentos ?? []).find(
        (d) => d.descuentoId === desc.id && d.seccionId === seccion.id,
      );
      if (appliedGlobal) {
        const pct = Number(appliedGlobal.valorPorcentaje);
        const regla = [...(desc.reglas ?? [])]
          .sort((a, b) => a.prioridad - b.prioridad)
          .find((r) => Number(r.valor) === pct);
        return regla?.nombre ?? `${desc.nombre} ${pct}%`;
      }
    }
    return seccion.nombre ?? `Sección ${seccion.orden + 1}`;
  }

  // Medio de pago for non-section mode
  let medioDePago = '—';
  if (!hasSecciones) {
    const globalSelectorDescs = allDescuentos.filter(
      (d) => d.tipoAplicacion === 'global' && d.modo === 'selector',
    );
    for (const desc of globalSelectorDescs) {
      const appliedItem = items[0]?.descuentos.find((d) => d.descuentoId === desc.id);
      const appliedGlobal = (version?.descuentos ?? []).find((d) => d.descuentoId === desc.id);
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
  }

  // Table styles
  const thStyle: React.CSSProperties = { textAlign: 'left', padding: '8px 10px', fontWeight: 'bold', borderBottom: '2px solid #333' };
  const thRight: React.CSSProperties = { ...thStyle, textAlign: 'right' };
  const thCenter: React.CSSProperties = { ...thStyle, textAlign: 'center' };
  const tdStyle: React.CSSProperties = { padding: '6px 10px', borderBottom: '1px solid #e5e5e5' };
  const tdRight: React.CSSProperties = { ...tdStyle, textAlign: 'right' };
  const tdCenter: React.CSSProperties = { ...tdStyle, textAlign: 'center' };

  function renderCultivoTable(cultivoName: string, cultivoItems: typeof items, seccionId?: number) {
    let cultivoTotal = 0;
    let cultivoBolsas = 0;
    const rows = cultivoItems.map((item) => {
      const subtotal = getItemSubtotal(item, seccionId);
      const totalItem = subtotal * Number(item.bolsas);
      cultivoTotal += totalItem;
      cultivoBolsas += Number(item.bolsas);
      return (
        <tr key={`${seccionId ?? 0}-${item.id}`}>
          <td style={tdStyle}>{item.hibrido?.nombre ?? item.hibridoId}</td>
          <td style={tdCenter}>{item.banda?.nombre ?? item.bandaId}</td>
          <td style={tdCenter}>{Number(item.bolsas).toLocaleString('es-AR')}</td>
          <td style={tdRight}>{fmt(subtotal)}</td>
          <td style={tdRight}>{fmt(totalItem)}</td>
        </tr>
      );
    });

    return (
      <div key={`${seccionId ?? 0}-${cultivoName}`} style={{ marginBottom: '20px' }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#333',
          padding: '6px 10px',
          background: '#f3f4f6',
          borderRadius: '4px',
          marginBottom: '4px',
        }}>
          {cultivoName}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr>
              <th style={thStyle}>Híbrido</th>
              <th style={thCenter}>Banda</th>
              <th style={thCenter}>Bolsas</th>
              <th style={thRight}>Precio USD</th>
              <th style={thRight}>Total USD</th>
            </tr>
          </thead>
          <tbody>
            {rows}
            <tr style={{ borderTop: '2px solid #ccc' }}>
              <td colSpan={2} style={{ ...tdStyle, borderBottom: 'none' }}></td>
              <td style={{ ...tdCenter, fontWeight: 'bold', borderBottom: 'none' }}>
                {cultivoBolsas.toLocaleString('es-AR')}
              </td>
              <td style={{ ...tdStyle, borderBottom: 'none' }}></td>
              <td style={{ ...tdRight, fontWeight: 'bold', borderBottom: 'none' }}>{fmt(cultivoTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  const node = (
    <div style={{ position: 'absolute', left: '-9999px', top: 0, overflow: 'hidden' }}>
    <div
      ref={ref}
      style={{
        width: '800px',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '14px',
        color: '#111',
        background: '#fff',
        padding: '40px',
      }}
    >
      {/* Header */}
      <h1 style={{ textAlign: 'center', fontSize: '22px', fontWeight: 'bold', marginBottom: '4px' }}>
        Cotización Tekros
      </h1>
      <div style={{ height: '16px' }} />

      {/* Client info */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '24px',
        padding: '12px 16px',
        background: '#f9fafb',
        borderRadius: '6px',
        fontSize: '13px',
        lineHeight: '1.7',
      }}>
        <div>
          <div><strong>Fecha:</strong> {fecha}</div>
          <div><strong>Cliente:</strong> {cliente?.razonSocial ?? cliente?.nombre ?? '—'}</div>
          <div><strong>CUIT:</strong> {cliente?.cuit ?? '—'}</div>
        </div>
      </div>

      {/* Content: with or without sections */}
      {hasSecciones ? (
        [...secciones].sort((a, b) => a.orden - b.orden).map((seccion) => {
          const label = getSeccionLabel(seccion);
          // Calculate weighted average price for this section
          const secBolsas = items.reduce((s, i) => s + Number(i.bolsas), 0);
          const secMonto = items.reduce((s, item) => {
            return s + getItemSubtotal(item, seccion.id) * Number(item.bolsas);
          }, 0);
          const secPrecioProm = secBolsas > 0 ? secMonto / secBolsas : 0;
          return (
            <div key={seccion.id} style={{ marginBottom: '32px' }}>
              {/* Section title */}
              <div style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#fff',
                background: '#1f2937',
                padding: '10px 16px',
                borderRadius: '6px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span>{label}</span>
                <span style={{ fontSize: '14px', fontWeight: 'normal' }}>
                  Precio Promedio: {fmt(secPrecioProm)} USD
                </span>
              </div>
              {cultivoGroups.map(([name, cultivoItems]) =>
                renderCultivoTable(name, cultivoItems, seccion.id),
              )}
            </div>
          );
        })
      ) : (
        <>
          {/* Grand total */}
          <div style={{
            marginBottom: '16px',
            padding: '12px 16px',
            background: '#1f2937',
            color: '#fff',
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '16px',
            fontWeight: 'bold',
          }}>
            <span>Medio de pago: {medioDePago}</span>
            <span style={{ fontSize: '14px', fontWeight: 'normal' }}>
              Precio Promedio: {fmt(precioPonderado)} USD
            </span>
          </div>
          {cultivoGroups.map(([name, cultivoItems]) =>
            renderCultivoTable(name, cultivoItems),
          )}
        </>
      )}

      {/* Aclaración legal */}
      <div style={{
        marginTop: '24px',
        fontSize: '11px',
        color: '#6b7280',
        lineHeight: '1.5',
        textAlign: 'left',
      }}>
        <p style={{ margin: '0 0 6px 0' }}>
          La presente cotización refleja valores de referencia expresados en dólares estadounidenses, no contemplando IVA ni otros tributos que pudieran corresponder según la jurisdicción.
        </p>
        <p style={{ margin: '0 0 6px 0' }}>
          Las condiciones aquí detalladas podrán ser revisadas o ajustadas sin notificación previa.
        </p>
        <p style={{ margin: '0 0 6px 0' }}>
          La concreción de la operación estará condicionada a la disponibilidad de stock al momento de su confirmación.
        </p>
        <p style={{ margin: 0 }}>
          El presente documento no constituye una oferta vinculante de venta.
        </p>
      </div>
    </div>
    </div>
  );

  return { node, download };
}
