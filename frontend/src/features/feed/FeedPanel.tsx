import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mensajesApi } from '../../api/mensajes';
import type { Mensaje } from '../../api/types';
import { Spinner } from '../../components/Spinner';

function MessageItem({ msg, onToggle, onDelete }: {
  msg: Mensaje;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`rounded-lg p-3 text-sm space-y-1 ${msg.fijado ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-gray-800 break-words flex-1">{msg.contenido}</span>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onToggle}
            title={msg.fijado ? 'Desfijar' : 'Fijar'}
            className="text-gray-400 hover:text-yellow-500 transition-colors"
          >
            {msg.fijado ? '📌' : '📍'}
          </button>
          <button
            onClick={onDelete}
            title="Eliminar"
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            ×
          </button>
        </div>
      </div>
      <div className="text-xs text-gray-400">
        {msg.usuario?.nombre ?? 'Usuario'} · {new Date(msg.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
      </div>
    </div>
  );
}

export function FeedPanel() {
  const [texto, setTexto] = useState('');
  const qc = useQueryClient();

  const { data: mensajes = [], isLoading } = useQuery({
    queryKey: ['mensajes'],
    queryFn: mensajesApi.getAll,
    refetchInterval: 30_000,
  });

  const createMut = useMutation({
    mutationFn: (contenido: string) => mensajesApi.create(contenido),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mensajes'] }); setTexto(''); },
  });
  const toggleMut = useMutation({
    mutationFn: mensajesApi.toggleFijado,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mensajes'] }),
  });
  const deleteMut = useMutation({
    mutationFn: mensajesApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mensajes'] }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (texto.trim()) createMut.mutate(texto.trim());
  }

  return (
    <aside className="w-72 shrink-0 bg-white border-l flex flex-col min-h-screen">
      <div className="px-4 py-3 border-b">
        <span className="text-sm font-semibold text-gray-700">Anotador</span>
      </div>

      <form onSubmit={handleSubmit} className="px-3 py-3 border-b">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribir nota..."
          rows={3}
          className="w-full text-sm border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
        />
        <button
          type="submit"
          disabled={createMut.isPending || !texto.trim()}
          className="mt-2 w-full text-sm bg-blue-600 text-white rounded-lg py-1.5 hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {createMut.isPending ? 'Publicando…' : 'Publicar'}
        </button>
      </form>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {isLoading && <div className="flex justify-center pt-4"><Spinner /></div>}
        {mensajes.map((m) => (
          <MessageItem
            key={m.id}
            msg={m}
            onToggle={() => toggleMut.mutate(m.id)}
            onDelete={() => deleteMut.mutate(m.id)}
          />
        ))}
        {!isLoading && mensajes.length === 0 && (
          <p className="text-xs text-gray-400 text-center pt-4">Sin anotaciones aún</p>
        )}
      </div>
    </aside>
  );
}
