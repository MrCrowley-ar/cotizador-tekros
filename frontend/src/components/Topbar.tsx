import { useAuth } from '../hooks/useAuth';

export function Topbar({ title, onToggleFeed, showFeed }: {
  title?: string;
  onToggleFeed?: () => void;
  showFeed?: boolean;
}) {
  const { user, logout } = useAuth();
  return (
    <header className="h-14 bg-white border-b flex items-center justify-between px-6 shrink-0">
      <span className="text-sm font-medium text-gray-600">{title}</span>
      <div className="flex items-center gap-3">
        {onToggleFeed && (
          <button
            onClick={onToggleFeed}
            title={showFeed ? 'Ocultar Anotador' : 'Mostrar Anotador'}
            className={`text-sm px-2.5 py-1 rounded-lg border transition-colors ${
              showFeed
                ? 'text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100'
                : 'text-gray-400 border-gray-200 hover:bg-gray-50 hover:text-gray-600'
            }`}
          >
            {showFeed ? '📝 Anotador' : '📝'}
          </button>
        )}
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
