package pe.edu.unmsm.msu.solicitudes.servicio;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.unmsm.msu.catalogos.entidad.Categoria;
import pe.edu.unmsm.msu.catalogos.entidad.Ubicacion;
import pe.edu.unmsm.msu.catalogos.repositorio.CategoriaRepositorio;
import pe.edu.unmsm.msu.catalogos.repositorio.EstadoRepositorio;
import pe.edu.unmsm.msu.catalogos.repositorio.PrioridadRepositorio;
import pe.edu.unmsm.msu.catalogos.repositorio.UbicacionRepositorio;
import pe.edu.unmsm.msu.comun.error.ErrorCampo;
import pe.edu.unmsm.msu.comun.error.ExcepcionApi;
import pe.edu.unmsm.msu.identidad.entidad.Rol;
import pe.edu.unmsm.msu.identidad.entidad.Usuario;
import pe.edu.unmsm.msu.identidad.repositorio.UsuarioRepositorio;
import pe.edu.unmsm.msu.notificaciones.servicio.Notificador;
import pe.edu.unmsm.msu.politicas.servicio.MatrizPrioridad;
import pe.edu.unmsm.msu.politicas.servicio.PlazosServicio;
import pe.edu.unmsm.msu.seguridad.UsuarioAutenticado;
import pe.edu.unmsm.msu.solicitudes.dto.NuevaSolicitud;
import pe.edu.unmsm.msu.solicitudes.dto.SolicitudDetalle;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;
import pe.edu.unmsm.msu.solicitudes.repositorio.SolicitudRepositorio;

/**
 * AX01 · HU04 Registrar una solicitud (Alex).
 * Genera el código MSU, toma el solicitante de la sesión, calcula la prioridad inicial con la
 * matriz (tabla 5) y los límites con la política vigente (HU14). Todo ocurre en una transacción:
 * un error de campo no deja registros parciales (sección 6.3).
 */
@Service
public class RegistroSolicitudServicio {

    static final int DESCRIPCION_MIN = 20;
    static final int DESCRIPCION_MAX = 2000;

    private final SolicitudRepositorio solicitudes;
    private final CategoriaRepositorio categorias;
    private final UbicacionRepositorio ubicaciones;
    private final PrioridadRepositorio prioridades;
    private final EstadoRepositorio estados;
    private final UsuarioRepositorio usuarios;
    private final PlazosServicio plazos;
    private final GeneradorCodigo codigos;
    private final TransicionesServicio transiciones;
    private final Notificador notificador;
    private final Clock reloj;

    public RegistroSolicitudServicio(SolicitudRepositorio solicitudes, CategoriaRepositorio categorias,
                                     UbicacionRepositorio ubicaciones, PrioridadRepositorio prioridades,
                                     EstadoRepositorio estados, UsuarioRepositorio usuarios, PlazosServicio plazos,
                                     GeneradorCodigo codigos, TransicionesServicio transiciones,
                                     Notificador notificador, Clock reloj) {
        this.solicitudes = solicitudes;
        this.categorias = categorias;
        this.ubicaciones = ubicaciones;
        this.prioridades = prioridades;
        this.estados = estados;
        this.usuarios = usuarios;
        this.plazos = plazos;
        this.codigos = codigos;
        this.transiciones = transiciones;
        this.notificador = notificador;
        this.reloj = reloj;
    }

    /** POST /solicitudes: solo solicitantes; HU04 BDD 1 (se guarda una vez) y BDD 2 (campos inválidos). */
    @Transactional
    public SolicitudDetalle registrar(NuevaSolicitud datos, UsuarioAutenticado sesion) {
        Permisos.exigirRol(sesion, Rol.SOLICITANTE);
        // DATETIME(3): la fecha se trunca a milisegundos para responder lo mismo que se guarda.
        Solicitud s = registrar(usuarios.getReferenceById(sesion.id()), datos,
                Instant.now(reloj).truncatedTo(ChronoUnit.MILLIS));
        return SolicitudDetalle.de(s, Instant.now(reloj));
    }

    /** También lo usan los datos de demostración, con una fecha de registro anterior. */
    @Transactional
    public Solicitud registrar(Usuario solicitante, NuevaSolicitud datos, Instant registro) {
        List<ErrorCampo> errores = new ArrayList<>();
        Categoria categoria = categorias.findById(datos.categoriaId()).filter(Categoria::disponible).orElse(null);
        if (categoria == null) {
            errores.add(new ErrorCampo("categoria_id", "La categoría seleccionada no existe o ya no está activa."));
        }
        Ubicacion ubicacion = ubicaciones.findById(datos.ubicacionId()).filter(Ubicacion::isActivo).orElse(null);
        if (ubicacion == null) {
            errores.add(new ErrorCampo("ubicacion_id", "La ubicación seleccionada no existe o ya no está activa."));
        }
        String descripcion = datos.descripcion().trim();
        if (descripcion.length() < DESCRIPCION_MIN) {
            errores.add(new ErrorCampo("descripcion", "La descripción es muy corta: tiene " + descripcion.length()
                    + " caracteres y el mínimo es " + DESCRIPCION_MIN + "."));
        } else if (descripcion.length() > DESCRIPCION_MAX) {
            errores.add(new ErrorCampo("descripcion", "La descripción supera el máximo de " + DESCRIPCION_MAX
                    + " caracteres."));
        }
        String impacto = datos.impacto().trim().toUpperCase(Locale.ROOT);
        String urgencia = datos.urgencia().trim().toUpperCase(Locale.ROOT);
        if (!MatrizPrioridad.impactoValido(impacto)) {
            errores.add(new ErrorCampo("impacto", "Indica el impacto: Alto, Medio o Bajo."));
        }
        if (!MatrizPrioridad.urgenciaValida(urgencia)) {
            errores.add(new ErrorCampo("urgencia", "Indica la urgencia: Alta, Media o Baja."));
        }
        if (!errores.isEmpty()) {
            throw ExcepcionApi.datosInvalidos(errores);
        }

        String prioridad = MatrizPrioridad.calcular(impacto, urgencia);
        Solicitud s = new Solicitud(codigos.siguiente(registro), solicitante, categoria, ubicacion,
                datos.referencia(), descripcion, impacto, urgencia, prioridades.getReferenceById(prioridad),
                estados.getReferenceById(Solicitud.REGISTRADA), registro);
        plazos.aplicarPoliticaVigente(s);
        s = solicitudes.saveAndFlush(s);
        transiciones.registrarEvento(s, solicitante.getId(), "REGISTRAR", null,
                PlazosServicio.Limites.de(s).comoMapa(), null);

        // RF19: los supervisores reciben aviso de cada nueva solicitud pendiente de evaluación.
        for (Usuario supervisor : usuarios.buscar(Rol.SUPERVISOR, true, null, Pageable.unpaged())) {
            notificador.avisar(supervisor, solicitante.getId(), s, "REGISTRO",
                    "Nueva solicitud " + s.getCodigo() + " pendiente de evaluación.");
        }
        return s;
    }
}
