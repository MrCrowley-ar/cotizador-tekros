import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mensajesApi } from '../../api/mensajes';
import type { Mensaje } from '../../api/types';
import { Spinner } from '../../components/Spinner';

const MIN_WIDTH = 192;
const MAX_WIDTH = 576;
const STEP = 64;

function MessageItem({ msg, onToggle, onDelete }: {
  msg: Mensaje;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [imgOpen, setImgOpen] = useState<string | null>(null);

  return (
    <>
      <div className={`rounded-lg p-3 text-sm space-y-1.5 ${msg.fijado ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium text-gray-800 break-words flex-1 whitespace-pre-wrap">{msg.contenido}</span>
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

        {/* Imágenes adjuntas */}
        {msg.imagenes && msg.imagenes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {msg.imagenes.map((img) => (
              <img
                key={img.id}
                src={img.urlImagen}
                alt="adjunto"
                className="max-h-24 rounded cursor-pointer object-cover border border-gray-200 hover:opacity-90 transition-opacity"
                onClick={() => setImgOpen(img.urlImagen)}
              />
            ))}
          </div>
        )}

        <div className="text-xs text-gray-400">
          {msg.usuario?.nombre ?? 'Usuario'} · {new Date(msg.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
        </div>
      </div>

      {/* Lightbox simple */}
      {imgOpen && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setImgOpen(null)}
        >
          <img src={imgOpen} alt="imagen" className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl" />
        </div>
      )}
    </>
  );
}

export function FeedPanel() {
  const [texto, setTexto] = useState('');
  const [panelWidth, setPanelWidth] = useState(288); // default w-72
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data: mensajes = [], isLoading } = useQuery({
    queryKey: ['mensajes'],
    queryFn: mensajesApi.getAll,
    refetchInterval: 30_000,
  });

  const uploadMut = useMutation({
    mutationFn: (file: File) => mensajesApi.uploadImagen(file),
  });

  const createMut = useMutation({
    mutationFn: async ({ contenido, file }: { contenido: string; file: File | null }) => {
      let imageUrls: string[] | undefined;
      if (file) {
        const { url } = await mensajesApi.uploadImagen(file);
        imageUrls = [url];
      }
      return mensajesApi.create(contenido, imageUrls);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mensajes'] });
      setTexto('');
      setSelectedFile(null);
      setPreviewUrl(null);
    },
  });

  const toggleMut = useMutation({
    mutationFn: mensajesApi.toggleFijado,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mensajes'] }),
  });
  const deleteMut = useMutation({
    mutationFn: mensajesApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mensajes'] }),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  }

  function removeFile() {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim() && !selectedFile) return;
    createMut.mutate({ contenido: texto.trim(), file: selectedFile });
  }

  const narrower = () => setPanelWidth((w) => Math.max(MIN_WIDTH, w - STEP));
  const wider = () => setPanelWidth((w) => Math.min(MAX_WIDTH, w + STEP));

  return (
    <aside
      className="shrink-0 bg-white border-l flex flex-col min-h-screen transition-all duration-150"
      style={{ width: panelWidth }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">Anotador</span>
        <div className="flex items-center gap-1">
          <button
            onClick={narrower}
            disabled={panelWidth <= MIN_WIDTH}
            title="Más angosto"
            className="text-gray-400 hover:text-gray-700 disabled:opacity-30 px-1 text-xs font-bold transition-colors"
          >
            ◀
          </button>
          <button
            onClick={wider}
            disabled={panelWidth >= MAX_WIDTH}
            title="Más ancho"
            className="text-gray-400 hover:text-gray-700 disabled:opacity-30 px-1 text-xs font-bold transition-colors"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-3 py-3 border-b space-y-2">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribir nota..."
          rows={3}
          className="w-full text-sm border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
        />

        {/* Preview imagen */}
        {previewUrl && (
          <div className="relative inline-block">
            <img src={previewUrl} alt="preview" className="max-h-24 rounded border border-gray-200 object-cover" />
            <button
              type="button"
              onClick={removeFile}
              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center leading-none hover:bg-red-600"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Botón subir imagen */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Adjuntar imagen"
            className="text-gray-400 hover:text-blue-600 transition-colors text-lg leading-none"
          >
            🖼
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            type="submit"
            disabled={createMut.isPending || (!texto.trim() && !selectedFile)}
            className="flex-1 text-sm bg-blue-600 text-white rounded-lg py-1.5 hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {createMut.isPending ? 'Publicando…' : 'Publicar'}
          </button>
        </div>
      </form>

      {/* Lista de mensajes */}
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
