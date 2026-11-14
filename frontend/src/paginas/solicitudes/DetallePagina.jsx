/*
 * P06 · Seguimiento de una solicitud (Alex, AX05). Usa el detalle reutilizable; las acciones de
 * conformidad (confirmar o reabrir, HU12) y la encuesta (HU13) se agregan como props sin copiar el detalle.
 */
import { Link, useParams } from 'react-router-dom';
import { useSesion } from '../../sesion/SesionContext.jsx';
import { AccionesConformidad, AccionesTecnico } from '../atencion/AccionesAtencion.jsx';
import { DetalleSolicitud } from './DetalleSolicitud.jsx';
import { EncuestaSatisfaccion } from './Encuesta.jsx';

const VOLVER = {
  SOLICITANTE: { ruta: '/solicitudes', texto: 'Volver a mis solicitudes' },
  SUPERVISOR: { ruta: '/supervision', texto: 'Volver a la bandeja' },
  TECNICO: { ruta: '/atencion', texto: 'Volver a mis asignaciones' },
};

// El técnico llega aquí desde el aviso «Se le asignó la solicitud»: necesita las mismas acciones
// que en su bandeja. El servidor valida que sea el técnico asignado.
const ACCIONES = {
  SOLICITANTE: (s, recargar) => (
    <>
      <AccionesConformidad solicitud={s} recargar={recargar} />
      <EncuestaSatisfaccion solicitud={s} />
    </>
  ),
  TECNICO: (s, recargar) => <AccionesTecnico solicitud={s} recargar={recargar} />,
};

export function DetallePagina() {
  const { id } = useParams();
  const { usuario } = useSesion();
  const volver = VOLVER[usuario?.rol] ?? VOLVER.SOLICITANTE;
  return (
    <section className="pagina" aria-label="Seguimiento de solicitud">
      <p><Link to={volver.ruta}>← {volver.texto}</Link></p>
      <DetalleSolicitud id={Number(id)}
        acciones={ACCIONES[usuario?.rol]} />
    </section>
  );
}
