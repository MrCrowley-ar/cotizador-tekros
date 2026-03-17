import { useEffect, useState } from 'react';

function App() {
  const [apiStatus, setApiStatus] = useState<string>('Conectando...');

  useEffect(() => {
    fetch('/api')
      .then((res) => res.text())
      .then((data) => setApiStatus(data))
      .catch(() => setApiStatus('Error al conectar con el backend'));
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Cotizador Tekros</h1>
      <p>
        <strong>Estado del backend:</strong> {apiStatus}
      </p>
    </div>
  );
}

export default App;
