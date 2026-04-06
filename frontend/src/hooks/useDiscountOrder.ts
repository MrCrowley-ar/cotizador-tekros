import { useState, useEffect, useCallback } from 'react';

interface Identifiable {
  id: number;
}

function getStorageKey(versionId: number) {
  return `discount-order-v${versionId}`;
}

function loadOrder(versionId: number | null): number[] | null {
  if (!versionId) return null;
  try {
    const raw = localStorage.getItem(getStorageKey(versionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'number')) return parsed;
  } catch { /* ignore */ }
  return null;
}

function saveOrder(versionId: number | null, ids: number[]) {
  if (!versionId) return;
  try {
    localStorage.setItem(getStorageKey(versionId), JSON.stringify(ids));
  } catch { /* ignore */ }
}

export function useDiscountOrder<T extends Identifiable>(
  versionId: number | null,
  allDescuentos: T[],
) {
  const [orderedIds, setOrderedIds] = useState<number[]>(() => {
    return loadOrder(versionId) ?? allDescuentos.map((d) => d.id);
  });

  // Re-initialize when versionId changes
  useEffect(() => {
    const stored = loadOrder(versionId);
    if (stored) {
      setOrderedIds(stored);
    } else {
      setOrderedIds(allDescuentos.map((d) => d.id));
    }
  }, [versionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // When allDescuentos changes, merge new IDs (append any not yet in orderedIds)
  useEffect(() => {
    setOrderedIds((prev) => {
      const existing = new Set(prev);
      const newIds = allDescuentos.map((d) => d.id).filter((id) => !existing.has(id));
      if (newIds.length === 0) return prev;
      return [...prev, ...newIds];
    });
  }, [allDescuentos]);

  // Persist on change
  useEffect(() => {
    saveOrder(versionId, orderedIds);
  }, [versionId, orderedIds]);

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    setOrderedIds((prev) => {
      if (fromIndex === toIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const sortDescuentos = useCallback(
    <U extends Identifiable>(descuentos: U[]): U[] => {
      const indexMap = new Map(orderedIds.map((id, i) => [id, i]));
      return [...descuentos].sort((a, b) => {
        const ia = indexMap.get(a.id) ?? Infinity;
        const ib = indexMap.get(b.id) ?? Infinity;
        return ia - ib;
      });
    },
    [orderedIds],
  );

  return { orderedIds, reorder, sortDescuentos };
}
