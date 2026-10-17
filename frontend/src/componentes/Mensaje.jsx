/** Mensaje de éxito, error, aviso o información. Los errores se anuncian de inmediato. */
export function Mensaje({ tipo = 'info', titulo, children, onCerrar, accion }) {
  const urgente = tipo === 'error';
  return (
    <div className={`mensaje mensaje--${tipo}`} role={urgente ? 'alert' : 'status'}>
      <div className="mensaje__texto">
        {titulo && <strong className="mensaje__titulo">{titulo}</strong>}
        {children && <div>{children}</div>}
      </div>
      {accion}
      {onCerrar && (
        <button type="button" className="mensaje__cerrar" onClick={onCerrar} aria-label="Cerrar mensaje">
          ×
        </button>
      )}
    </div>
  );
}

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <p className="cargando" role="status">
      <span className="cargando__indicador" aria-hidden="true" />
      {texto}
    </p>
  );
}
