/*
 * DV08 · Contexto de sesión: usuario y rol en el estado de React.
 * La sesión vive en la cookie HttpOnly MSU_SESION (JWT, DV04): JavaScript no la lee; al cargar
 * se pregunta /me y un 401 en cualquier petición limpia el usuario y lleva al inicio de sesión.
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

  /** Tras editar el perfil (HU03) se actualiza el nombre visible sin volver a iniciar sesión. */
  const actualizarUsuario = useCallback((perfil) => setUsuario(perfil), []);

  const valor = useMemo(
    () => ({ usuario, cargando, iniciarSesion, cerrarSesion, actualizarUsuario }),
    [usuario, cargando, iniciarSesion, cerrarSesion, actualizarUsuario],
  );
  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion() {
  const contexto = useContext(SesionContext);
  if (!contexto) throw new Error('useSesion debe usarse dentro de <SesionProvider>');
  return contexto;
}
