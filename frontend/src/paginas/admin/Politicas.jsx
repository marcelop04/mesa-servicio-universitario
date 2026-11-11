/*
 * HU22 · Políticas de plazos en P12 (Emanuel, fase III).
 * Muestra la versión vigente y su historial. Publicar crea una versión nueva que rige desde ese instante
 * para las solicitudes nuevas; las anteriores no se editan y los casos existentes conservan su matriz.
 */
import { useState } from 'react';
import { api } from '../../api/cliente.js';
import { useConsulta } from '../../api/useConsulta.js';
import { Confirmacion, Mensaje, Tabla } from '../../componentes/index.js';
import { fechaLima } from '../../reglas/prioridad.js';

export const PRIORIDADES = [
  { codigo: 'CRITICA', nombre: 'Crítica' },
  { codigo: 'ALTA', nombre: 'Alta' },
  { codigo: 'MEDIA', nombre: 'Media' },
  { codigo: 'BAJA', nombre: 'Baja' },
];
const HORAS_MAXIMAS = 8760;
const CAMPOS = [
  { clave: 'horas_primera_atencion', titulo: 'Primera atención' },
  { clave: 'horas_resolucion', titulo: 'Resolución' },
];

export function horasLegibles(h) {
  if (h == null) return '—';
  if (h >= 24 && h % 24 === 0) return `${h} h (${h / 24} ${h === 24 ? 'día' : 'días'})`;
  return `${h} h`;
}

/** Mismas reglas que el servidor; devuelve { 'ALTA.horas_resolucion': mensaje }. */
export function validarPolitica(matriz) {
  const errores = {};
  const nombre = Object.fromEntries(PRIORIDADES.map((p) => [p.codigo, p.nombre]));
  PRIORIDADES.forEach(({ codigo }) => {
    CAMPOS.forEach(({ clave }) => {
      const valor = matriz[codigo]?.[clave];
      if (valor === '' || valor == null) errores[`${codigo}.${clave}`] = 'Indique las horas.';
      else if (!Number.isInteger(Number(valor)) || Number(valor) < 1 || Number(valor) > HORAS_MAXIMAS) {
        errores[`${codigo}.${clave}`] = `Use un número entero entre 1 y ${HORAS_MAXIMAS}.`;
      }
    });
    const a = Number(matriz[codigo]?.horas_primera_atencion);
    const r = Number(matriz[codigo]?.horas_resolucion);
    if (!errores[`${codigo}.horas_primera_atencion`] && !errores[`${codigo}.horas_resolucion`] && a > r) {
      errores[`${codigo}.horas_primera_atencion`] = `La primera atención (${a} h) no puede superar la resolución (${r} h).`;
    }
  });
  for (let i = 0; i + 1 < PRIORIDADES.length; i += 1) {
    const urgente = PRIORIDADES[i].codigo;
    const siguiente = PRIORIDADES[i + 1].codigo;
    CAMPOS.forEach(({ clave, titulo }) => {
      const id = `${urgente}.${clave}`;
      const a = Number(matriz[urgente]?.[clave]);
      const b = Number(matriz[siguiente]?.[clave]);
      if (!errores[id] && !errores[`${siguiente}.${clave}`] && a > b) {
        errores[id] = `${titulo} de ${nombre[urgente]} (${a} h) no puede ser mayor que la de ${nombre[siguiente]} (${b} h).`;
      }
    });
  }
  return errores;
}

function matrizDe(politica) {
  return Object.fromEntries(PRIORIDADES.map(({ codigo }) => {
    const d = politica?.detalles.find((x) => x.prioridad_codigo === codigo);
    return [codigo, { horas_primera_atencion: d?.horas_primera_atencion ?? '', horas_resolucion: d?.horas_resolucion ?? '' }];
  }));
}

function FormularioPolitica({ vigente, onPublicada, onCancelar }) {
  const [matriz, setMatriz] = useState(() => matrizDe(vigente));
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const siguiente = (vigente?.version ?? 0) + 1;

  const cambiar = (codigo, clave) => (e) => setMatriz((m) => ({ ...m, [codigo]: { ...m[codigo], [clave]: e.target.value } }));

  const revisar = (e) => {
    e.preventDefault();
    const locales = validarPolitica(matriz);
    setErrores(locales);
    setError(null);
    if (!Object.keys(locales).length) setConfirmar(true);
  };

  const publicar = async () => {
    setEnviando(true);
    try {
      const detalles = PRIORIDADES.map(({ codigo }) => ({
        prioridad_codigo: codigo,
        horas_primera_atencion: Number(matriz[codigo].horas_primera_atencion),
        horas_resolucion: Number(matriz[codigo].horas_resolucion),
      }));
      const publicada = await api.post('/admin/politicas', { detalles, version_base: vigente?.version ?? 0 });
      onPublicada(publicada);
    } catch (err) {
      setErrores(err.porCampo ?? {});
      setError(err.message);
    } finally {
      setEnviando(false);
      setConfirmar(false);
    }
  };

  return (
    <form className="panel" onSubmit={revisar} noValidate aria-labelledby="titulo-politica">
      <h2 id="titulo-politica" className="panel__titulo">Nueva versión {siguiente}</h2>
      <p className="texto-secundario">
        Horas corridas desde el registro. Una prioridad más urgente no puede tener plazos más largos que la siguiente.
      </p>
      {error && <div style={{ margin: '12px 0' }}><Mensaje tipo="error">{error}</Mensaje></div>}
      {errores.detalles && <div style={{ margin: '12px 0' }}><Mensaje tipo="error">{errores.detalles}</Mensaje></div>}
      <div className="matriz-politica">
        {PRIORIDADES.map(({ codigo, nombre }) => (
          <fieldset key={codigo} className="matriz-politica__fila">
            <legend className="matriz-politica__prioridad">{nombre}</legend>
            {CAMPOS.map(({ clave, titulo }) => {
              const id = `${codigo}.${clave}`;
              const idHtml = `politica-${codigo}-${clave}`;
              return (
                <div key={clave} className={`campo${errores[id] ? ' campo--error' : ''}`}>
                  <label htmlFor={idHtml} className="campo__etiqueta">{titulo} (horas)</label>
                  <input id={idHtml} className="campo__control" type="number" inputMode="numeric" min={1}
                    max={HORAS_MAXIMAS} step={1} required value={matriz[codigo][clave]} onChange={cambiar(codigo, clave)}
                    aria-invalid={errores[id] ? 'true' : undefined}
                    aria-describedby={errores[id] ? `${idHtml}-error` : undefined} />
                  {errores[id] && <p id={`${idHtml}-error`} className="campo__mensaje-error">{errores[id]}</p>}
                </div>
              );
            })}
          </fieldset>
        ))}
      </div>
      <div className="formulario__acciones">
        <button type="button" className="boton boton--secundario" onClick={onCancelar} disabled={enviando}>Cancelar</button>
        <button type="submit" className="boton boton--primario" disabled={enviando}>Revisar y publicar</button>
      </div>
      <Confirmacion abierto={confirmar} titulo={`Publicar la versión ${siguiente}`} textoConfirmar="Publicar"
        ocupado={enviando} onConfirmar={publicar} onCancelar={() => setConfirmar(false)}>
        <p>
          Regirá desde ahora para las solicitudes nuevas. Las solicitudes existentes conservan los plazos de la versión
          con la que se registraron, y la versión {vigente?.version ?? '—'} queda en el historial sin cambios.
        </p>
      </Confirmacion>
    </form>
  );
}

export function Politicas() {
  const historial = useConsulta(() => api.get('/admin/politicas'), []);
  const [editando, setEditando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const versiones = Array.isArray(historial.datos) ? historial.datos : [];
  const vigente = versiones.find((p) => p.vigente);

  const columnas = [
    { clave: 'version', titulo: 'Versión', render: (p) => <strong>v{p.version}{p.vigente ? ' · vigente' : ''}</strong> },
    { clave: 'vigente_desde', titulo: 'Vigente desde', render: (p) => fechaLima(p.vigente_desde) },
    { clave: 'publicada_por', titulo: 'Publicada por' },
    ...PRIORIDADES.map(({ codigo, nombre }) => ({
      clave: codigo,
      titulo: nombre,
      render: (p) => {
        const d = p.detalles.find((x) => x.prioridad_codigo === codigo);
        return d ? `${d.horas_primera_atencion} h / ${d.horas_resolucion} h` : '—';
      },
    })),
    { clave: 'solicitudes', titulo: 'Solicitudes', render: (p) => p.solicitudes },
  ];

  return (
    <div className="panel-pestanas__cuerpo">
      <div className="pagina__resumen">
        <div>
          <p className="antetitulo">HU22 · Plazos institucionales</p>
          <h2 className="panel__titulo" style={{ margin: '4px 0' }}>Políticas de plazos</h2>
          <p className="texto-secundario">Cada versión publicada queda en el historial; no se editan ni se borran.</p>
        </div>
        {!editando && !historial.cargando && !historial.error && (
          <button type="button" className="boton boton--primario" onClick={() => { setEditando(true); setAviso(null); }}>
            Nueva versión
          </button>
        )}
      </div>
      {aviso && <Mensaje tipo={aviso.tipo} onCerrar={() => setAviso(null)}>{aviso.texto}</Mensaje>}
      {editando && (
        <FormularioPolitica vigente={vigente} onCancelar={() => setEditando(false)}
          onPublicada={(p) => {
            setEditando(false);
            setAviso({ tipo: 'exito', texto: `Se publicó la versión ${p.version}. Rige para las solicitudes nuevas desde ahora.` });
            historial.recargar();
          }} />
      )}
      {vigente && !editando && (
        <section className="panel" aria-labelledby="titulo-vigente">
          <h3 id="titulo-vigente" className="panel__titulo">Versión vigente: v{vigente.version}</h3>
          <p className="texto-secundario">
            Desde el {fechaLima(vigente.vigente_desde)} · publicada por {vigente.publicada_por} ·{' '}
            {vigente.solicitudes} {vigente.solicitudes === 1 ? 'solicitud la usa' : 'solicitudes la usan'}
          </p>
          <ul className="plazos-vigentes">
            {vigente.detalles.map((d) => (
              <li key={d.prioridad_codigo} className="plazos-vigentes__item">
                <span className="plazos-vigentes__prioridad">{d.prioridad_nombre}</span>
                <span>Primera atención: <strong>{horasLegibles(d.horas_primera_atencion)}</strong></span>
                <span>Resolución: <strong>{horasLegibles(d.horas_resolucion)}</strong></span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="panel panel--tabla">
        <h3 className="panel__titulo" style={{ padding: '16px 16px 0' }}>Historial de versiones</h3>
        <Tabla titulo="Historial de versiones de la política de plazos" columnas={columnas} filas={versiones}
          cargando={historial.cargando} error={historial.error} onReintentar={historial.recargar}
          vacio="Aún no hay una política publicada. Publica la primera versión para poder registrar solicitudes." />
      </div>
    </div>
  );
}
