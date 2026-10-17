/*
 * Contexto de sesión: usuario y rol en el estado de React.
 * Base mínima para que el layout por rol (GB01) y las pantallas de administración funcionen;
 * David la completa en DV08 cuando integre el login definitivo con JWT (DV04).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { alRecibirError, api } from '../api/cliente.js';

const SesionContext = createContext(null);

export function SesionProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;
    api
      .get('/me')
      .then((perfil) => vigente && setUsuario(perfil))
      .catch(() => vigente && setUsuario(null))
      .finally(() => vigente && setCargando(false));
    const dejarDeOir = alRecibirError((error) => {
      if (error.estado === 401) setUsuario(null);
    });
    return () => {
      vigente = false;
      dejarDeOir();
    };
  }, []);

  const iniciarSesion = useCallback(async (correo, password) => {
    const perfil = await api.post('/auth/login', { correo, password });
    setUsuario(perfil);
    return perfil;
  }, []);

  const cerrarSesion = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUsuario(null);
    }
  }, []);

  const valor = useMemo(
    () => ({ usuario, cargando, iniciarSesion, cerrarSesion }),
    [usuario, cargando, iniciarSesion, cerrarSesion],
  );
  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion() {
  const contexto = useContext(SesionContext);
  if (!contexto) throw new Error('useSesion debe usarse dentro de <SesionProvider>');
  return contexto;
}
