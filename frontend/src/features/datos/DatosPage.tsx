import { useState } from 'react';
import { Layout } from '../../components/Layout';
import { CultivosTab } from './CultivosTab';
import { HibridosTab } from './HibridosTab';
import { PreciosTab } from './PreciosTab';
import { ClientesTab } from './ClientesTab';
import { DescuentosTab } from './DescuentosTab';

type Tab = 'cultivos' | 'hibridos' | 'precios' | 'clientes' | 'descuentos';

const TABS: { id: Tab; label: string }[] = [
  { id: 'cultivos', label: 'Cultivos' },
  { id: 'hibridos', label: 'Híbridos' },
  { id: 'precios', label: 'Precios' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'descuentos', label: 'Descuentos' },
];

export function DatosPage() {
  const [tab, setTab] = useState<Tab>('cultivos');

  return (
    <Layout title="Datos">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Datos del sistema</h1>

        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-0">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {tab === 'cultivos' && <CultivosTab />}
        {tab === 'hibridos' && <HibridosTab />}
        {tab === 'precios' && <PreciosTab />}
        {tab === 'clientes' && <ClientesTab />}
        {tab === 'descuentos' && <DescuentosTab />}
      </div>
    </Layout>
  );
}
