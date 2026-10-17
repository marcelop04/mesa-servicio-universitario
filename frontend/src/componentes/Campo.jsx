/*
 * Campo con etiqueta visible, ayuda breve, marca de obligatorio y error junto al campo (11.4).
 * Uso: <Campo id="correo" etiqueta="Correo" error={errores.correo} value={…} onChange={…} />
 *      <Campo como="select" …><option …/></Campo>
 */
export function Campo({ id, etiqueta, error, ayuda, obligatorio = false, como = 'input', children, ...props }) {
  const Control = como;
  const idAyuda = ayuda ? `${id}-ayuda` : null;
  const idError = error ? `${id}-error` : null;
  const describe = [idAyuda, idError].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`campo${error ? ' campo--error' : ''}`}>
      <label htmlFor={id} className="campo__etiqueta">
        {etiqueta}
        {obligatorio && (
          <span className="campo__obligatorio" aria-hidden="true">
            {' '}*
          </span>
        )}
        {obligatorio && <span className="solo-lector"> (obligatorio)</span>}
      </label>
      <Control
        id={id}
        name={id}
        className="campo__control"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describe}
        required={obligatorio}
        {...props}
      >
        {children}
      </Control>
      {ayuda && (
        <p id={idAyuda} className="campo__ayuda">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} className="campo__mensaje-error">
          {error}
        </p>
      )}
    </div>
  );
}
