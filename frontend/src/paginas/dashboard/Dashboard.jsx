/*
 * P10 · Dashboard del supervisor (HU17, HU18 y HU19). Indicadores de la tabla 7 del informe de la fase I
 * para el periodo y el área elegidos, distribuciones y exportación CSV del listado filtrado.
 * Un denominador cero se muestra como «Sin datos», nunca como 0 %.
 */
import { useState } from 'react';
import { BASE_API, api } from '../../api/cliente.js';
import { useConsulta } from '../../api/useConsulta.js';
import { Campo, Cargando, Icono, Mensaje } from '../../componentes/index.js';
import { fechaLima } from '../../reglas/prioridad.js';

const formato = new Intl.NumberFormat('es', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const porcentaje = (v) => (v === null || v === undefined ? 'Sin datos' : `${formato.format(v)} %`);
export const horas = (v) => (v === null || v === undefined ? 'Sin datos' : `${formato.format(v)} h`);

function hoyLima(diasAtras = 0) {
  const d = new Date(Date.now() - diasAtras * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(d);
}

/** URL de descarga del CSV con los mismos filtros (la cookie de sesión viaja sola: mismo origen). */
export function urlCsv(filtros) {
  const url = new URL(`${BASE_API}/reportes/solicitudes.csv`, window.location.origin);
  Object.entries(filtros).forEach(([k, v]) => v && url.searchParams.set(k, v));
  return url.pathname + url.search;
}

function Cifra({ valor, etiqueta, detalle, tono }) {
  return (
    <div className={`cifra${tono ? ` cifra--${tono}` : ''}`}>
      <span className="cifra__valor">{valor}</span>
      <span className="cifra__etiqueta">{etiqueta}</span>
      {detalle && <span className="cifra__detalle">{detalle}</span>}
    </div>
  );
}

/** Barras horizontales de una sola serie: valor rotulado al final y tooltip con el dato exacto. */
function Barras({ titulo, datos }) {
  const maximo = Math.max(1, ...datos.map((d) => d.valor));
  const total = datos.reduce((s, d) => s + d.valor, 0);
  const id = `grafico-${titulo.normalize('NFD').replace(/[^A-Za-z0-9]+/g, '-').toLowerCase()}`;
  return (
    <section className="panel grafico" aria-labelledby={id}>
      <h2 id={id} className="panel__titulo">{titulo}</h2>
      {total === 0 ? <p className="texto-secundario">Sin datos en el periodo.</p> : (
        <ul className="barras">
          {datos.map((d) => (
            <li key={d.clave} className="barras__fila" title={`${d.etiqueta}: ${d.valor} de ${total}`}>
              <span className="barras__etiqueta">{d.etiqueta}</span>
              <span className="barras__pista" aria-hidden="true">
                {d.valor > 0 && <span className="barras__barra" style={{ width: `${(100 * d.valor) / maximo}%` }} />}
              </span>
              <span className="barras__valor">{d.valor}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Dashboard() {
  const [filtros, setFiltros] = useState({ desde: hoyLima(29), hasta: hoyLima(), area_id: '' });
  const rangoInvalido = Boolean(filtros.desde && filtros.hasta && filtros.hasta < filtros.desde);
  const datos = useConsulta(() => (rangoInvalido ? Promise.resolve(null) : api.get('/indicadores', filtros)), [filtros, rangoInvalido]);
  const catalogo = useConsulta(() => api.get('/catalogos', { tipo: 'areas' }), []);
  const ind = datos.datos;
  const cambiar = (campo) => (e) => setFiltros((f) => ({ ...f, [campo]: e.target.value }));

  return (
    <section className="pagina" aria-label="Dashboard">
      <form className="panel filtros filtros--supervision" role="search" onSubmit={(e) => e.preventDefault()}>
        <Campo id="dash-desde" etiqueta="Registradas desde" type="date" value={filtros.desde} onChange={cambiar('desde')} />
        <Campo id="dash-hasta" etiqueta="Hasta" type="date" value={filtros.hasta} onChange={cambiar('hasta')}
          error={rangoInvalido ? 'La fecha final no puede ser anterior a la inicial.' : undefined} />
        <Campo id="dash-area" como="select" etiqueta="Área" value={filtros.area_id} onChange={cambiar('area_id')}>
          <option value="">Todas las áreas</option>
          {(catalogo.datos ?? []).map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </Campo>
        <div className="filtros__acciones">
          {/* Se exporta el mismo periodo que muestran los indicadores, también si las fechas están vacías. */}
          {!rangoInvalido && (
            <a className="boton boton--secundario" download
              href={urlCsv({ desde: filtros.desde || ind?.desde, hasta: filtros.hasta || ind?.hasta, area_id: filtros.area_id })}>
              <Icono nombre="archivo" tamano={16} /> Exportar CSV
            </a>
          )}
        </div>
      </form>

      {datos.error && <Mensaje tipo="error" titulo="No se pudieron calcular los indicadores.">{datos.error.message}</Mensaje>}
      {!ind ? (datos.cargando && <Cargando texto="Calculando indicadores…" />) : (
        <>
          <p className="pagina__nota">
            Solicitudes registradas del {ind.desde.split('-').reverse().join('/')} al {ind.hasta.split('-').reverse().join('/')}
            {' '}· estado actual al {fechaLima(ind.generado_en)} (hora de Lima)
          </p>
          <div className="cifras">
            <Cifra valor={ind.conteos.registradas} etiqueta="Registradas" detalle="incluye canceladas" />
            <Cifra valor={ind.conteos.pendientes} etiqueta="Pendientes" detalle="antes de Resuelta" />
            <Cifra valor={ind.conteos.atendidas} etiqueta="Atendidas" detalle="con primera atención" />
            <Cifra valor={ind.conteos.resueltas + ind.conteos.cerradas} etiqueta="Solucionadas"
              detalle={`${ind.conteos.resueltas} resueltas · ${ind.conteos.cerradas} cerradas`} />
            <Cifra valor={ind.conteos.canceladas} etiqueta="Canceladas" />
            <Cifra valor={ind.conteos.vencidas_activas} etiqueta="Vencidas activas" detalle="pendientes fuera de plazo"
              tono={ind.conteos.vencidas_activas > 0 ? 'alerta' : undefined} />
          </div>
          <div className="cifras cifras--kpi">
            <Cifra valor={porcentaje(ind.conteos.porcentaje_solucionado)} etiqueta="Porcentaje solucionado"
              detalle={`base: ${ind.conteos.registradas - ind.conteos.canceladas} sin canceladas`} />
            <Cifra valor={horas(ind.tiempos.tiempo_medio_resolucion_horas)} etiqueta="Tiempo medio de resolución"
              detalle={`base: ${ind.tiempos.base_tiempo} casos`} />
            <Cifra valor={porcentaje(ind.tiempos.cumplimiento_resolucion)} etiqueta="Resueltas dentro del plazo"
              detalle={`base: ${ind.tiempos.base_resolucion} casos`} />
            <Cifra valor={porcentaje(ind.tiempos.cumplimiento_primera_atencion)} etiqueta="Primera atención a tiempo"
              detalle={`base: ${ind.tiempos.base_primera_atencion} casos`} />
            <Cifra valor={ind.satisfaccion.promedio === null ? 'Sin datos' : `${formato.format(ind.satisfaccion.promedio)} / 5`}
              etiqueta="Satisfacción" detalle={`${ind.satisfaccion.encuestas} encuestas`} />
          </div>
          <div className="graficos">
            <Barras titulo="Por estado" datos={ind.por_estado} />
            <Barras titulo="Por prioridad" datos={ind.por_prioridad} />
            <Barras titulo="Por categoría" datos={ind.por_categoria} />
            <Barras titulo="Por técnico responsable" datos={ind.por_tecnico} />
          </div>
        </>
      )}
    </section>
  );
}
