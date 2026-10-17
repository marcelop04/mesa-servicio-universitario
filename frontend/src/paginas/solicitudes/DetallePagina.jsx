/*
 * P06 · Seguimiento de una solicitud (Alex, AX05). Usa el detalle reutilizable; las acciones de
 * conformidad (confirmar o reabrir, HU12) se agregan como props sin copiar el detalle.
 */
import { Link, useParams } from 'react-router-dom';
import { useSesion } from '../../sesion/SesionContext.jsx';
import { AccionesConformidad } from '../atencion/AccionesAtencion.jsx';
import { DetalleSolicitud } from './DetalleSolicitud.jsx';

const VOLVER = {
  SOLICITANTE: { ruta: '/solicitudes', texto: 'Volver a mis solicitudes' },
  SUPERVISOR: { ruta: '/supervision', texto: 'Volver a la bandeja' },
  TECNICO: { ruta: '/atencion', texto: 'Volver a mis asignaciones' },
};

export function DetallePagina() {
  const { id } = useParams();
  const { usuario } = useSesion();
  const volver = VOLVER[usuario?.rol] ?? VOLVER.SOLICITANTE;
  return (
    <section className="pagina" aria-label="Seguimiento de solicitud">
      <p><Link to={volver.ruta}>← {volver.texto}</Link></p>
      <DetalleSolicitud id={Number(id)}
        acciones={usuario?.rol === 'SOLICITANTE'
          ? (s, recargar) => <AccionesConformidad solicitud={s} recargar={recargar} />
          : undefined} />
    </section>
  );
}
