import { useAuth } from '../hooks/useAuth';

export function Topbar({ title }: { title?: string }) {
  const { user, logout } = useAuth();
  return (
    <header className="h-14 bg-white border-b flex items-center justify-between px-6 shrink-0">
      <span className="text-sm font-medium text-gray-600">{title}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-700">{user?.email}</span>
        <button
          onClick={logout}
          className="text-xs text-gray-500 hover:text-red-600 transition-colors"
        >
          Salir
        </button>
      </div>
    </header>
  );
}
