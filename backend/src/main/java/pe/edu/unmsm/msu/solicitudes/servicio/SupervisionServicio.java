package pe.edu.unmsm.msu.solicitudes.servicio;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.unmsm.msu.catalogos.entidad.Categoria;
import pe.edu.unmsm.msu.catalogos.entidad.Prioridad;
import pe.edu.unmsm.msu.catalogos.repositorio.CategoriaRepositorio;
import pe.edu.unmsm.msu.catalogos.repositorio.PrioridadRepositorio;
import pe.edu.unmsm.msu.comun.error.ErrorCampo;
import pe.edu.unmsm.msu.comun.error.ExcepcionApi;
import pe.edu.unmsm.msu.identidad.entidad.Rol;
import pe.edu.unmsm.msu.identidad.entidad.Usuario;
import pe.edu.unmsm.msu.identidad.repositorio.UsuarioRepositorio;
import pe.edu.unmsm.msu.notificaciones.servicio.Notificador;
import pe.edu.unmsm.msu.politicas.servicio.MatrizPrioridad;
import pe.edu.unmsm.msu.politicas.servicio.PlazosServicio;
import pe.edu.unmsm.msu.politicas.servicio.PlazosServicio.Limites;
import pe.edu.unmsm.msu.seguridad.UsuarioAutenticado;
import pe.edu.unmsm.msu.solicitudes.dto.AsignacionSolicitud;
import pe.edu.unmsm.msu.solicitudes.dto.CancelacionSolicitud;
import pe.edu.unmsm.msu.solicitudes.dto.EvaluacionSolicitud;
import pe.edu.unmsm.msu.solicitudes.dto.SolicitudDetalle;
import pe.edu.unmsm.msu.solicitudes.dto.TecnicoCarga;
import pe.edu.unmsm.msu.solicitudes.entidad.AsignacionHistorica;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;
import pe.edu.unmsm.msu.solicitudes.repositorio.AsignacionHistoricaRepositorio;
import pe.edu.unmsm.msu.solicitudes.repositorio.SolicitudRepositorio;

/**
 * Épica E03 · Evaluación y asignación (Marcelo).
 * <ul>
 *   <li>MR04 · HU07 Evaluar y priorizar: motivo obligatorio y recálculo desde el registro (RN05).</li>
 *   <li>MR05 · HU08 Asignar y reasignar técnico, con carga por técnico (RF10).</li>
 *   <li>MR06 · HU09 Cancelar con motivo y referencia a duplicado (RN09).</li>
 * </ul>
 * Todas las acciones usan el servicio de transiciones (MR03) y devuelven la versión nueva.
 */
@Service
public class SupervisionServicio {

    static final int MOTIVO_MIN = 10;
    static final int MOTIVO_MAX = 1000;
    private static final Set<String> ASIGNADAS = Set.of(Solicitud.ASIGNADA, Solicitud.EN_ATENCION);

    private final TransicionesServicio transiciones;
    private final PlazosServicio plazos;
    private final SolicitudRepositorio solicitudes;
    private final CategoriaRepositorio categorias;
    private final PrioridadRepositorio prioridades;
    private final UsuarioRepositorio usuarios;
    private final AsignacionHistoricaRepositorio asignaciones;
    private final ConsultaSolicitudes consulta;
    private final Notificador notificador;
    private final Clock reloj;

    public SupervisionServicio(TransicionesServicio transiciones, PlazosServicio plazos,
                               SolicitudRepositorio solicitudes, CategoriaRepositorio categorias,
                               PrioridadRepositorio prioridades, UsuarioRepositorio usuarios,
                               AsignacionHistoricaRepositorio asignaciones, ConsultaSolicitudes consulta,
                               Notificador notificador, Clock reloj) {
        this.transiciones = transiciones;
        this.plazos = plazos;
        this.solicitudes = solicitudes;
        this.categorias = categorias;
        this.prioridades = prioridades;
        this.usuarios = usuarios;
        this.asignaciones = asignaciones;
        this.consulta = consulta;
        this.notificador = notificador;
        this.reloj = reloj;
    }

    /** MR04 · HU07. BDD 1: Registrada pasa a En evaluación con actor. BDD 2: cambio sin motivo se rechaza. */
    @Transactional
    public SolicitudDetalle evaluar(long id, EvaluacionSolicitud datos, UsuarioAutenticado actor) {
        Permisos.exigirRol(actor, Rol.SUPERVISOR);
        Solicitud s = transiciones.cargar(id, datos.version());
        transiciones.exigirEstado(s, Solicitud.PENDIENTES, "La solicitud " + s.getCodigo() + " está "
                + s.getEstado().getNombreVisible() + " y ya no admite evaluación.");

        String impacto = datos.impacto() == null ? s.getImpacto() : datos.impacto().trim().toUpperCase();
        String urgencia = datos.urgencia() == null ? s.getUrgencia() : datos.urgencia().trim().toUpperCase();
        List<ErrorCampo> errores = new ArrayList<>();
        if (!MatrizPrioridad.impactoValido(impacto)) {
            errores.add(new ErrorCampo("impacto", "Indique el impacto: Alto, Medio o Bajo."));
        }
        if (!MatrizPrioridad.urgenciaValida(urgencia)) {
            errores.add(new ErrorCampo("urgencia", "Indique la urgencia: Alta, Media o Baja."));
        }
        boolean cambiaPrioridad = !impacto.equals(s.getImpacto()) || !urgencia.equals(s.getUrgencia());

        Categoria nuevaCategoria = null;
        if (datos.categoriaId() != null && !datos.categoriaId().equals(s.getCategoria().getId())) {
            nuevaCategoria = categorias.findById(datos.categoriaId()).filter(Categoria::disponible).orElse(null);
            if (nuevaCategoria == null) {
                errores.add(new ErrorCampo("categoria_id", "La categoría no existe o no está activa."));
            } else if (s.getTecnico() != null) {
                errores.add(new ErrorCampo("categoria_id",
                        "La solicitud ya tiene técnico; para cambiar la categoría primero cancele o reasigne el caso."));
            }
        }
        boolean hayCorreccion = cambiaPrioridad || nuevaCategoria != null;
        String motivo = limpiar(datos.motivo());
        if (hayCorreccion) {
            validarMotivo(motivo, "motivo", errores);
        } else if (!Solicitud.REGISTRADA.equals(s.getEstadoCodigo())) {
            errores.add(new ErrorCampo("impacto",
                    "No hay cambios: modifique el impacto, la urgencia o la categoría para registrar la evaluación."));
        }
        if (!errores.isEmpty()) {
            throw ExcepcionApi.datosInvalidos(errores);
        }

        if (Solicitud.REGISTRADA.equals(s.getEstadoCodigo())) {
            transiciones.aplicar(s, Transicion.EVALUAR, actor.id(), null, null);
        }
        if (nuevaCategoria != null) {
            Map<String, Object> anterior = categoria(s);
            s.reclasificar(nuevaCategoria);
            transiciones.registrarEvento(s, actor.id(), "CAMBIAR_CATEGORIA", anterior, categoria(s), motivo);
        }
        String prioridadAnterior = s.getPrioridadCodigo();
        if (cambiaPrioridad) {
            Map<String, Object> anterior = prioridad(s.getImpacto(), s.getUrgencia(), Limites.de(s));
            Limites nuevos = plazos.recalcular(s, MatrizPrioridad.calcular(impacto, urgencia));
            Prioridad nueva = prioridades.getReferenceById(nuevos.prioridad());
            s.cambiarPrioridad(impacto, urgencia, nueva, nuevos.limiteAtencion(), nuevos.limiteResolucion());
            transiciones.registrarEvento(s, actor.id(), "CAMBIAR_PRIORIDAD", anterior,
                    prioridad(impacto, urgencia, nuevos), motivo);
        }
        transiciones.guardar(s);
        if (!s.getPrioridadCodigo().equals(prioridadAnterior)) {
            notificador.avisar(s.getSolicitante(), actor.id(), s, "PRIORIDAD", "La prioridad de su solicitud "
                    + s.getCodigo() + " ahora es " + s.getPrioridad().getNombreVisible() + ".");
        }
        return SolicitudDetalle.de(s, Instant.now(reloj));
    }

    /** MR05 · HU08. BDD 1: queda Asignada y se avisa. BDD 2: técnico inactivo o de otra área se rechaza. */
    @Transactional
    public SolicitudDetalle asignar(long id, AsignacionSolicitud datos, UsuarioAutenticado actor) {
        Permisos.exigirRol(actor, Rol.SUPERVISOR);
        Solicitud s = transiciones.cargar(id, datos.version());
        if (Solicitud.REGISTRADA.equals(s.getEstadoCodigo())) {
            throw ExcepcionApi.conflicto(TransicionesServicio.TRANSICION_INVALIDA,
                    "Primero inicie la evaluación de la solicitud; luego asigne un técnico.");
        }
        boolean reasignacion = ASIGNADAS.contains(s.getEstadoCodigo());
        if (!reasignacion) {
            transiciones.exigirEstado(s, Set.of(Solicitud.EN_EVALUACION), "No se puede asignar una solicitud en estado "
                    + s.getEstado().getNombreVisible() + ".");
        }

        List<ErrorCampo> errores = new ArrayList<>();
        Usuario tecnico = usuarios.findById(datos.tecnicoId()).orElse(null);
        if (tecnico == null || !tecnico.esTecnico()) {
            errores.add(new ErrorCampo("tecnico_id", "La persona seleccionada no es un técnico."));
        } else if (!tecnico.isActivo()) {
            errores.add(new ErrorCampo("tecnico_id", "El técnico seleccionado está inactivo."));
        } else if (tecnico.getArea() == null || !tecnico.getArea().getId().equals(s.getArea().getId())) {
            errores.add(new ErrorCampo("tecnico_id",
                    "El técnico no pertenece al área " + s.getArea().getNombre() + " de la solicitud."));
        } else if (s.getTecnico() != null && s.getTecnico().getId().equals(tecnico.getId())) {
            errores.add(new ErrorCampo("tecnico_id", "El técnico seleccionado ya es el responsable."));
        }
        String motivo = limpiar(datos.motivo());
        if (reasignacion) {
            validarMotivo(motivo, "motivo", errores);
        }
        if (!errores.isEmpty()) {
            throw ExcepcionApi.datosInvalidos(errores);
        }

        Usuario anterior = s.getTecnico();
        s.asignar(tecnico);
        if (reasignacion) {
            transiciones.registrarEvento(s, actor.id(), "REASIGNAR", responsable(anterior), responsable(tecnico),
                    motivo);
        } else {
            transiciones.aplicar(s, Transicion.ASIGNAR, actor.id(), null, responsable(tecnico));
        }
        asignaciones.save(new AsignacionHistorica(s, anterior, tecnico, usuarios.getReferenceById(actor.id()),
                reasignacion ? motivo : null, Instant.now(reloj)));
        transiciones.guardar(s);

        notificador.avisar(tecnico, actor.id(), s, "ASIGNACION", "Se le asignó la solicitud " + s.getCodigo() + ".");
        if (reasignacion) {
            notificador.avisar(anterior, actor.id(), s, "REASIGNACION",
                    "La solicitud " + s.getCodigo() + " fue reasignada a otro técnico.");
        }
        notificador.avisar(s.getSolicitante(), actor.id(), s, "ASIGNACION",
                "Su solicitud " + s.getCodigo() + " tiene como responsable a " + tecnico.getNombre() + ".");
        return SolicitudDetalle.de(s, Instant.now(reloj));
    }

    /** MR06 · HU09. BDD 1: duplicado queda Cancelada y vinculada. BDD 2: Resuelta o Cerrada se rechaza. */
    @Transactional
    public SolicitudDetalle cancelar(long id, CancelacionSolicitud datos, UsuarioAutenticado actor) {
        Permisos.exigirRol(actor, Rol.SUPERVISOR);
        Solicitud s = transiciones.cargar(id, datos.version());
        transiciones.exigirEstado(s, Solicitud.PENDIENTES, "Solo se cancela una solicitud pendiente; "
                + s.getCodigo() + " está " + s.getEstado().getNombreVisible() + ".");

        List<ErrorCampo> errores = new ArrayList<>();
        String motivo = limpiar(datos.motivo());
        validarMotivo(motivo, "motivo", errores);
        Solicitud original = null;
        if (datos.duplicado()) {
            String codigo = limpiar(datos.codigoOriginal());
            if (codigo == null) {
                errores.add(new ErrorCampo("codigo_original", "Indique el código de la solicitud original."));
            } else {
                original = solicitudes.findByCodigoIgnoreCase(codigo).orElse(null);
                if (original == null) {
                    errores.add(new ErrorCampo("codigo_original", "No existe una solicitud con el código " + codigo + "."));
                } else if (original.getId().equals(s.getId())) {
                    errores.add(new ErrorCampo("codigo_original", "El caso original debe ser distinto del que se cancela."));
                }
            }
        }
        if (!errores.isEmpty()) {
            throw ExcepcionApi.datosInvalidos(errores);
        }

        Map<String, Object> extra = new LinkedHashMap<>();
        if (original != null) {
            s.marcarDuplicadaDe(original);
            extra.put("duplicada_de", original.getCodigo());
        }
        transiciones.aplicar(s, Transicion.CANCELAR, actor.id(), motivo, extra);
        transiciones.guardar(s);
        String texto = "La solicitud " + s.getCodigo() + " fue cancelada"
                + (original == null ? "." : " por ser duplicado de " + original.getCodigo() + ".");
        notificador.avisar(s.getSolicitante(), actor.id(), s, "CANCELACION", texto);
        notificador.avisar(s.getTecnico(), actor.id(), s, "CANCELACION", texto);
        return SolicitudDetalle.de(s, Instant.now(reloj));
    }

    /** RF10 · Técnicos activos (de un área, si se indica) con su carga pendiente. Sin asignación automática. */
    @Transactional(readOnly = true)
    public List<TecnicoCarga> tecnicos(Long areaId, UsuarioAutenticado actor) {
        Permisos.exigirRol(actor, Rol.SUPERVISOR);
        Map<Long, Long> carga = consulta.pendientesPorTecnico();
        return usuarios.buscar(Rol.TECNICO, true, null, Pageable.unpaged(Sort.by("nombre"))).stream()
                .filter(u -> u.getArea() != null && (areaId == null || u.getArea().getId().equals(areaId)))
                .map(u -> new TecnicoCarga(u.getId(), u.getNombre(), u.getArea().getId(), u.getArea().getNombre(),
                        carga.getOrDefault(u.getId(), 0L)))
                .sorted(Comparator.comparing(TecnicoCarga::areaNombre).thenComparing(TecnicoCarga::nombre))
                .toList();
    }

    static String limpiar(String texto) {
        return texto == null || texto.isBlank() ? null : texto.trim();
    }

    static void validarMotivo(String motivo, String campo, List<ErrorCampo> errores) {
        if (motivo == null) {
            errores.add(new ErrorCampo(campo, "El motivo es obligatorio (entre " + MOTIVO_MIN + " y " + MOTIVO_MAX
                    + " caracteres)."));
        } else if (motivo.length() < MOTIVO_MIN) {
            errores.add(new ErrorCampo(campo, "El motivo es muy corto: tiene " + motivo.length()
                    + " caracteres y el mínimo es " + MOTIVO_MIN + "."));
        } else if (motivo.length() > MOTIVO_MAX) {
            errores.add(new ErrorCampo(campo, "El motivo supera el máximo de " + MOTIVO_MAX + " caracteres."));
        }
    }

    private static Map<String, Object> prioridad(String impacto, String urgencia, Limites limites) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("impacto", impacto);
        m.put("urgencia", urgencia);
        m.putAll(limites.comoMapa());
        return m;
    }

    private static Map<String, Object> categoria(Solicitud s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("categoria_id", s.getCategoria().getId());
        m.put("categoria_nombre", s.getCategoria().getNombre());
        m.put("area_id", s.getArea().getId());
        m.put("area_nombre", s.getArea().getNombre());
        return m;
    }

    private static Map<String, Object> responsable(Usuario tecnico) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("tecnico_id", tecnico == null ? null : tecnico.getId());
        m.put("tecnico_nombre", tecnico == null ? null : tecnico.getNombre());
        return m;
    }
}
