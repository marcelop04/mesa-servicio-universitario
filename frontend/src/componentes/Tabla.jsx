import { Cargando, Mensaje } from './Mensaje.jsx';

/*
 * Tabla con estados de carga, vacío, error y reintento (11.4). En móvil cada fila se
 * muestra como tarjeta usando el título de la columna (data-titulo).
 * columnas: [{ clave, titulo, render?: (fila) => nodo, clase? }]
 */
export function Tabla({ titulo, columnas, filas, claveFila = 'id', cargando, error, onReintentar, vacio }) {
  if (cargando && !filas?.length) return <Cargando />;
  if (error) {
    return (
      <Mensaje tipo="error" titulo="No se pudo cargar la información."
        accion={onReintentar && (
          <button type="button" className="boton boton--secundario" onClick={onReintentar}>
            Reintentar
          </button>
        )}>
        {error.message}
      </Mensaje>
    );
  }
  if (!filas?.length) {
    return <p className="tabla__vacia">{vacio ?? 'No hay registros para mostrar.'}</p>;
  }

  return (
    <div className="tabla__contenedor">
      <table className="tabla">
        {titulo && <caption className="solo-lector">{titulo}</caption>}
        <thead>
          <tr>
            {columnas.map((c) => (
              <th key={c.clave} scope="col" className={c.clase}>
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila[claveFila]}>
              {columnas.map((c) => (
                <td key={c.clave} data-titulo={c.titulo} className={c.clase}>
                  {c.render ? c.render(fila) : fila[c.clave] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
