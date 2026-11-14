import { useEffect, useRef } from 'react';

/**
 * Para bloques que se abren lejos del botón que los abrió (por ejemplo, «Editar» en una fila
 * de una tabla larga, o el caso elegido en una bandeja): lleva el bloque a la vista y, si es un
 * formulario, enfoca su primer campo. Sin esto aparece fuera de pantalla y parece que el botón
 * no hizo nada.
 *
 * `listo` permite esperar a que el contenido exista (datos cargados) antes de desplazar.
 */
export function useLlevarALaVista({ listo = true, enfocar = true } = {}) {
  const ref = useRef(null);
  useEffect(() => {
    const nodo = ref.current;
    if (!listo || !nodo) return;
    const sinMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    nodo.style.scrollMarginTop = '16px';
    nodo.scrollIntoView?.({ block: 'start', behavior: sinMovimiento ? 'auto' : 'smooth' });
    if (enfocar) nodo.querySelector('input, select, textarea')?.focus({ preventScroll: true });
  }, [listo, enfocar]);
  return ref;
}
