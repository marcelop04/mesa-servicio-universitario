/*
 * HU23 · Auditoría administrativa en P12 (Emanuel, fase III).
 * Solo lectura: accesos relevantes y cambios administrativos, sin contraseñas ni tokens.
 */
import { useState } from 'react';
import { api } from '../../api/cliente.js';
import { useConsulta } from '../../api/useConsulta.js';
import { Campo, Mensaje, Paginacion, Tabla } from '../../componentes/index.js';
import { fechaLima } from '../../reglas/prioridad.js';

export const NOMBRE_ACCION = {
  SESION_INICIAR: 'Inicio de sesión',
  SESION_CERRAR: 'Cierre de sesión',
  SESION_RECHAZADA: 'Inicio de sesión rechazado',
  CUENTA_REGISTRAR: 'Registro de cuenta',
  CUENTA_ACTUALIZAR_PERFIL: 'Cambio de perfil',
  CUENTA_CAMBIAR_CLAVE_ACCESO: 'Cambio de contraseña',
  USUARIO_CREAR: 'Alta de usuario interno',
  USUARIO_ACTUALIZAR: 'Cambio de usuario',
  USUARIO_DESACTIVAR: 'Desactivación de usuario',
  USUARIO_REACTIVAR: 'Reactivación de usuario',
  CATALOGO_CREAR: 'Alta en catálogo',
  CATALOGO_ACTUALIZAR: 'Cambio en catálogo',
  CATALOGO_DESACTIVAR: 'Desactivación en catálogo',
  CATALOGO_REACTIVAR: 'Reactivación en catálogo',
  POLITICA_PUBLICAR: 'Publicación de política',
  REPORTE_EXPORTAR: 'Exportación CSV',
  TOKENS_LIMPIEZA: 'Limpieza de sesiones vencidas',
};

const NOMBRE_ENTIDAD = {
  USUARIO: 'Usuario', AREA: 'Área', CATEGORIA: 'Categoría', UBICACION: 'Ubicación', ESTADO: 'Estado',
  PRIORIDAD: 'Prioridad', POLITICA: 'Política', SOLICITUD: 'Solicitudes', SESION: 'Sesiones',
};

const ORDEN_PRIORIDAD = ['CRITICA', 'ALTA', 'MEDIA', 'BAJA'];

function valorLegible(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** Resume los metadatos en texto: cambios como «campo: anterior → nuevo» y el resto como «clave: valor». */
export function describirMetadatos(m) {
  if (!m) return [];
  const lineas = [];
  Object.entries(m).forEach(([clave, valor]) => {
    if (clave === 'cambios' && valor && typeof valor === 'object') {
      Object.entries(valor).forEach(([campo, par]) => {
        lineas.push(`${campo}: ${valorLegible(par?.anterior)} → ${valorLegible(par?.nuevo)}`);
      });
    } else if (clave === 'matriz' && valor && typeof valor === 'object') {
      const orden = (p) => { const i = ORDEN_PRIORIDAD.indexOf(p); return i < 0 ? ORDEN_PRIORIDAD.length : i; };
      lineas.push(`matriz: ${Object.entries(valor).sort(([a], [b]) => orden(a) - orden(b))
        .map(([p, h]) => `${p} ${h.horas_primera_atencion}/${h.horas_resolucion} h`).join(' · ')}`);
    } else if (clave === 'filtros' && valor && typeof valor === 'object') {
      const filtros = Object.entries(valor).map(([k, v]) => `${k}=${valorLegible(v)}`).join(', ');
      lineas.push(`filtros: ${filtros || 'ninguno'}`);
    } else {
      lineas.push(`${clave.replaceAll('_', ' ')}: ${valorLegible(valor)}`);
    }
  });
  return lineas;
}

const VACIOS = { accion: '', entidad: '', actor: '', desde: '', hasta: '' };

export function Auditoria() {
  const [filtros, setFiltros] = useState(VACIOS);
  const [pagina, setPagina] = useState(1);
  const opciones = useConsulta(() => api.get('/admin/auditoria/opciones'), []);
  const rangoInvalido = filtros.desde && filtros.hasta && filtros.hasta < filtros.desde;
  const listado = useConsulta(
    () => (rangoInvalido ? Promise.resolve(null) : api.get('/admin/auditoria', { ...filtros, pagina, tamano: 20 })),
    [filtros.accion, filtros.entidad, filtros.actor, filtros.desde, filtros.hasta, pagina, rangoInvalido],
  );
  const filtrar = (campo) => (e) => {
    setFiltros((f) => ({ ...f, [campo]: e.target.value }));
    setPagina(1);
  };

  const columnas = [
    { clave: 'creada_en', titulo: 'Fecha y hora', render: (a) => fechaLima(a.creada_en) },
    {
      clave: 'actor',
      titulo: 'Actor',
      render: (a) => (a.actor_nombre
        ? <><span>{a.actor_nombre}</span><br /><span className="texto-secundario">{a.actor_correo}</span></>
        : <span className="texto-secundario">Sistema o anónimo</span>),
    },
    { clave: 'accion', titulo: 'Acción', render: (a) => NOMBRE_ACCION[a.accion] ?? a.accion },
    {
      clave: 'entidad',
      titulo: 'Entidad',
      render: (a) => `${NOMBRE_ENTIDAD[a.entidad] ?? a.entidad}${a.entidad_id ? ` #${a.entidad_id}` : ''}`,
    },
    {
      clave: 'metadatos',
      titulo: 'Detalle',
      render: (a) => {
        const lineas = describirMetadatos(a.metadatos);
        return lineas.length
          ? <ul className="auditoria__detalle">{lineas.map((l) => <li key={l}>{l}</li>)}</ul>
          : '—';
      },
    },
  ];

  return (
    <div className="panel-pestanas__cuerpo">
      <div>
        <p className="antetitulo">HU23 · Trazabilidad</p>
        <h2 className="panel__titulo" style={{ margin: '4px 0' }}>Auditoría administrativa</h2>
        <p className="texto-secundario">
          Accesos y cambios administrativos, del más reciente al más antiguo. No se puede editar ni borrar, y nunca
          muestra contraseñas, tokens ni archivos.
        </p>
      </div>
      <form className="panel filtros filtros--auditoria" role="search" onSubmit={(e) => e.preventDefault()}>
        <Campo id="auditoria-accion" como="select" etiqueta="Acción" value={filtros.accion} onChange={filtrar('accion')}>
          <option value="">Todas</option>
          {(opciones.datos?.acciones ?? []).map((a) => <option key={a} value={a}>{NOMBRE_ACCION[a] ?? a}</option>)}
        </Campo>
        <Campo id="auditoria-entidad" como="select" etiqueta="Entidad" value={filtros.entidad} onChange={filtrar('entidad')}>
          <option value="">Todas</option>
          {(opciones.datos?.entidades ?? []).map((e) => <option key={e} value={e}>{NOMBRE_ENTIDAD[e] ?? e}</option>)}
        </Campo>
        <Campo id="auditoria-actor" etiqueta="Actor" type="search" placeholder="Nombre o correo…" value={filtros.actor}
          onChange={filtrar('actor')} />
        <Campo id="auditoria-desde" etiqueta="Desde" type="date" value={filtros.desde} onChange={filtrar('desde')} />
        <Campo id="auditoria-hasta" etiqueta="Hasta" type="date" value={filtros.hasta} onChange={filtrar('hasta')}
          error={rangoInvalido ? 'La fecha final no puede ser anterior a la inicial.' : undefined} />
        <div className="filtros__acciones">
          <button type="button" className="boton boton--secundario" onClick={() => { setFiltros(VACIOS); setPagina(1); }}>
            Limpiar filtros
          </button>
        </div>
      </form>
      {rangoInvalido ? (
        <Mensaje tipo="info">Corrige el rango de fechas para ver resultados.</Mensaje>
      ) : (
        <div className="panel panel--tabla">
          <Tabla titulo="Registros de auditoría" columnas={columnas} filas={listado.datos?.items}
            cargando={listado.cargando} error={listado.error} onReintentar={listado.recargar}
            vacio="No hay registros que coincidan con los filtros." />
          {listado.datos && (
            <Paginacion pagina={listado.datos.pagina} tamano={listado.datos['tamaño']} total={listado.datos.total}
              onCambiar={setPagina} nombre="registros" />
          )}
        </div>
      )}
    </div>
  );
}
