import type { VigenciaSnapshot } from '../../api/types';

// Devuelve la fecha efectiva (la más temprana / más restrictiva) de un snapshot.
// Retorna null si el snapshot está vacío o no hay fechas.
export function getEffectiveVigenciaDate(snapshot: VigenciaSnapshot | null | undefined): string | null {
  if (!snapshot) return null;
  if (snapshot.modo === 'global') return snapshot.fecha ?? null;
  const fechas = Object.values(snapshot.fechas ?? {});
  if (fechas.length === 0) return null;
  // Devolver la más temprana (la más restrictiva en términos de vencimiento)
  return fechas.sort()[0];
}

// Parsea YYYY-MM-DD como fecha local (sin desfase por TZ).
function parseLocal(iso: string): Date | null {
  const [y, m, d] = iso.substring(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

// Retorna true si la fecha actual es igual o mayor a la fecha dada.
export function isVigenciaExpired(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const date = parseLocal(iso);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime() >= date.getTime();
}

// Formatea una fecha ISO YYYY-MM-DD como DD/MM/YYYY (local, sin TZ shift).
export function formatVigenciaDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = parseLocal(iso);
  if (!date) return '—';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}
