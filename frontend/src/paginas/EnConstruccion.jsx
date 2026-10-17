import { Link } from 'react-router-dom';
import { Mensaje } from '../componentes/index.js';

/** Lugar reservado para la pantalla de otro integrante; indica quién la construye. */
export function EnConstruccion({ id, titulo, responsable, tarea, publica = false }) {
  const contenido = (
    <div className="panel">
      <Mensaje tipo="info" titulo={`${id} ${titulo} se integra en la fase II.`}>
        Responsable: <strong>{responsable}</strong> ({tarea}). Usa el layout, los componentes de{' '}
        <code>src/componentes</code> y el cliente <code>src/api/cliente.js</code>.
      </Mensaje>
      {publica && <p style={{ marginTop: 16 }}><Link to="/login">Volver al inicio de sesión</Link></p>}
    </div>
  );
  if (!publica) return <section className="pagina" aria-label={titulo}>{contenido}</section>;
  return (
    <main className="acceso__formulario" style={{ minHeight: '100vh' }}>
      <section className="acceso__tarjeta" aria-labelledby="titulo-pagina">
        <h1 id="titulo-pagina" className="acceso__titulo">{titulo}</h1>
        {contenido}
      </section>
    </main>
  );
}
