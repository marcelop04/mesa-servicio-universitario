import { Etiqueta } from './Etiquetas.jsx';

/** Situación del plazo de un caso pendiente (RN07): vencido, al 80 % o en plazo. */
const PLAZO = {
  VENCIDA: { tono: 'peligro', texto: 'Vencida' },
  ALERTA: { tono: 'aviso', texto: 'Plazo al 80 %' },
  EN_PLAZO: { tono: 'exito', texto: 'En plazo' },
};

export function EtiquetaPlazo({ nivel }) {
  const p = PLAZO[nivel];
  return p ? <Etiqueta tono={p.tono}>{p.texto}</Etiqueta> : <span className="texto-secundario">—</span>;
}
