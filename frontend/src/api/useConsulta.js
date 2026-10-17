import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Ejecuta una consulta a la API y expone datos, carga, error y recargar.
 * Se vuelve a ejecutar cuando cambian las dependencias; descarta respuestas viejas.
 */
export function useConsulta(consultar, dependencias) {
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: null });
  const ultima = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ejecutar = useCallback(consultar, dependencias);

  const recargar = useCallback(async () => {
    const id = ++ultima.current;
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    try {
      const datos = await ejecutar();
      if (id === ultima.current) setEstado({ datos, cargando: false, error: null });
    } catch (error) {
      if (id === ultima.current) setEstado((e) => ({ ...e, cargando: false, error }));
    }
  }, [ejecutar]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { ...estado, recargar };
}
