import { NavLink } from 'react-router-dom';

const links = [
  { to: '/cotizaciones', label: 'Cotizaciones', icon: '📄' },
  { to: '/datos', label: 'Datos', icon: '⚙️' },
];

export function Sidebar() {
  return (
    <aside className="flex flex-col w-56 shrink-0 bg-gray-900 text-gray-100 min-h-screen">
      <div className="px-5 py-5 border-b border-gray-700">
        <span className="font-bold text-white text-base tracking-wide">Tekros</span>
        <span className="ml-1 text-xs text-gray-400">Cotizador</span>
      </div>
      <nav className="flex-1 py-4 space-y-1 px-2">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`
            }
          >
            <span>{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
