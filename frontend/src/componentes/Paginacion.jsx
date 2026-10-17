/** Paginación con los campos del contrato: pagina (desde 1), tamaño y total. */
export function Paginacion({ pagina, tamano, total, onCambiar, nombre = 'registros' }) {
  const paginas = Math.max(1, Math.ceil(total / tamano));
  if (total === 0) return null;
  const desde = (pagina - 1) * tamano + 1;
  const hasta = Math.min(pagina * tamano, total);

  return (
    <nav className="paginacion" aria-label="Paginación">
      <p className="paginacion__resumen">
        Mostrando {desde}–{hasta} de {total} {nombre}
      </p>
      <div className="paginacion__botones">
        <button type="button" className="boton boton--secundario" disabled={pagina <= 1}
          onClick={() => onCambiar(pagina - 1)}>
          Anterior
        </button>
        <span className="paginacion__pagina" aria-current="page">
          Página {pagina} de {paginas}
        </span>
        <button type="button" className="boton boton--secundario" disabled={pagina >= paginas}
          onClick={() => onCambiar(pagina + 1)}>
          Siguiente
        </button>
      </div>
    </nav>
  );
}
