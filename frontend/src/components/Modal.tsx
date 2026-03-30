import { ReactNode, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

type Dir = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

const CURSOR: Record<Dir, string> = {
  n: 'ns-resize', s: 'ns-resize',
  e: 'ew-resize', w: 'ew-resize',
  ne: 'nesw-resize', sw: 'nesw-resize',
  nw: 'nwse-resize', se: 'nwse-resize',
};

export function Modal({ title, onClose, children, wide }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number | null; h: number | null }>({ w: null, h: null });
  const [pos,  setPos]  = useState<{ x: number | null; y: number | null }>({ x: null, y: null });

  const startResize = useCallback((dir: Dir) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ox = e.clientX, oy = e.clientY;
    const ow = rect.width, oh = rect.height;
    const ol = rect.left, ot = rect.top;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - ox;
      const dy = ev.clientY - oy;
      let w = ow, h = oh, x = ol, y = ot;
      if (dir.includes('e')) w = Math.max(360, ow + dx);
      if (dir.includes('s')) h = Math.max(180, oh + dy);
      if (dir.includes('w')) { w = Math.max(360, ow - dx); x = ol + (ow - w); }
      if (dir.includes('n')) { h = Math.max(180, oh - dy); y = ot + (oh - h); }
      setSize({ w, h });
      setPos({ x, y });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const startDrag = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const offX = e.clientX - rect.left;
    const offY = e.clientY - rect.top;
    const onMove = (ev: MouseEvent) => {
      setPos({ x: ev.clientX - offX, y: ev.clientY - offY });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const isPositioned = pos.x !== null && pos.y !== null;

  const containerStyle: React.CSSProperties = {
    ...(size.w !== null ? { width: size.w } : {}),
    ...(size.h !== null ? { height: size.h } : {}),
    ...(isPositioned ? { position: 'fixed', left: pos.x!, top: pos.y!, transform: 'none', margin: 0 } : {}),
  };

  const handle = (dir: Dir) => (
    <div
      key={dir}
      style={{ cursor: CURSOR[dir] }}
      className={[
        'absolute z-20 select-none',
        dir === 'n'  && 'top-0 left-3 right-3 h-1.5',
        dir === 's'  && 'bottom-0 left-3 right-3 h-1.5',
        dir === 'e'  && 'right-0 top-3 bottom-3 w-1.5',
        dir === 'w'  && 'left-0 top-3 bottom-3 w-1.5',
        dir === 'ne' && 'top-0 right-0 w-4 h-4',
        dir === 'nw' && 'top-0 left-0 w-4 h-4',
        dir === 'se' && 'bottom-0 right-0 w-4 h-4',
        dir === 'sw' && 'bottom-0 left-0 w-4 h-4',
      ].filter(Boolean).join(' ')}
      onMouseDown={startResize(dir)}
    />
  );

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        ref={ref}
        className={`relative bg-white rounded-xl shadow-xl flex flex-col ${wide ? 'w-[700px]' : 'w-[520px]'}`}
        style={containerStyle}
      >
        {(['n','ne','e','se','s','sw','w','nw'] as Dir[]).map(handle)}

        <div
          className="flex items-center justify-between border-b px-6 py-4 cursor-move select-none shrink-0 rounded-t-xl"
          onMouseDown={startDrag}
        >
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none cursor-pointer"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-4 overflow-auto flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
