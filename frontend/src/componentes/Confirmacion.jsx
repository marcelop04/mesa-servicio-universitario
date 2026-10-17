import { useEffect, useRef } from 'react';

/** Diálogo de confirmación para cancelaciones y cambios sensibles (11.4). Escape cancela. */
export function Confirmacion({
  abierto, titulo, children, textoConfirmar = 'Confirmar', peligro = false,
  ocupado = false, deshabilitado = false, onConfirmar, onCancelar,
}) {
  const cancelarRef = useRef(null);
  const alCancelar = useRef(onCancelar);
  alCancelar.current = onCancelar;

  // El foco va a Cancelar solo al abrir; así el diálogo admite campos (motivos) sin perder el foco al escribir.
  useEffect(() => {
    if (!abierto) return undefined;
    const anterior = document.activeElement;
    cancelarRef.current?.focus();
    return () => anterior?.focus?.();
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return undefined;
    const alPresionar = (e) => {
      if (e.key === 'Escape' && !ocupado) alCancelar.current();
    };
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [abierto, ocupado]);

  if (!abierto) return null;
  return (
    <div className="dialogo__fondo">
      <div className="dialogo" role="dialog" aria-modal="true" aria-labelledby="dialogo-titulo">
        <h2 id="dialogo-titulo" className="dialogo__titulo">
          {titulo}
        </h2>
        <div className="dialogo__cuerpo">{children}</div>
        <div className="dialogo__acciones">
          <button ref={cancelarRef} type="button" className="boton boton--secundario" onClick={onCancelar}
            disabled={ocupado}>
            Cancelar
          </button>
          <button type="button" className={`boton ${peligro ? 'boton--peligro' : 'boton--primario'}`}
            onClick={onConfirmar} disabled={ocupado || deshabilitado}>
            {ocupado ? 'Procesando…' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
