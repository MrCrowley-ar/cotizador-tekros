const colors: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  enviada: 'bg-blue-100 text-blue-700',
  aprobada: 'bg-green-100 text-green-700',
  rechazada: 'bg-red-100 text-red-700',
  cerrada: 'bg-gray-200 text-gray-500',
  admin: 'bg-purple-100 text-purple-700',
  vendedor: 'bg-blue-100 text-blue-700',
  global: 'bg-gray-100 text-gray-700',
  cultivo: 'bg-green-100 text-green-700',
  hibrido: 'bg-blue-100 text-blue-700',
  basico: 'bg-gray-100 text-gray-600',
  avanzado: 'bg-orange-100 text-orange-700',
};

export function Badge({ label }: { label: string }) {
  const cls = colors[label] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}
