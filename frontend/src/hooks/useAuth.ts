import { clearToken, getToken } from '../api/client';

interface JwtPayload {
  sub: number;
  email: string;
  rol: 'admin' | 'vendedor';
  nombre?: string;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function useAuth() {
  const token = getToken();
  const user = token ? decodeJwt(token) : null;

  function logout() {
    clearToken();
    window.location.href = '/login';
  }

  return { user, isAuthenticated: !!user, isAdmin: user?.rol === 'admin', logout };
}
