package pe.edu.unmsm.msu.solicitudes.datos;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.unmsm.msu.catalogos.repositorio.CategoriaRepositorio;
import pe.edu.unmsm.msu.catalogos.repositorio.UbicacionRepositorio;
import pe.edu.unmsm.msu.identidad.entidad.Usuario;
import pe.edu.unmsm.msu.identidad.repositorio.UsuarioRepositorio;
import pe.edu.unmsm.msu.politicas.repositorio.PoliticaRepositorio;
import pe.edu.unmsm.msu.seguridad.UsuarioAutenticado;
import pe.edu.unmsm.msu.solicitudes.dto.AsignacionSolicitud;
import pe.edu.unmsm.msu.solicitudes.dto.EvaluacionSolicitud;
import pe.edu.unmsm.msu.solicitudes.dto.NuevaSolicitud;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;
import pe.edu.unmsm.msu.solicitudes.repositorio.SolicitudRepositorio;
import pe.edu.unmsm.msu.solicitudes.servicio.RegistroSolicitudServicio;
import pe.edu.unmsm.msu.solicitudes.servicio.SupervisionServicio;
import pe.edu.unmsm.msu.solicitudes.servicio.Transicion;
import pe.edu.unmsm.msu.solicitudes.servicio.TransicionesServicio;

/**
 * Solicitudes ficticias para la demo en una base recién creada. Se crean solo si no hay solicitudes,
 * después de las cuentas y la política de {@code DatosIniciales}, y recorren las mismas operaciones
 * que la API (código MSU, eventos, asignaciones y avisos incluidos).
 */
@Component
@ConditionalOnProperty(name = "msu.datos-demo.solicitudes", havingValue = "true")
public class SolicitudesDemo {

    private static final Logger log = LoggerFactory.getLogger(SolicitudesDemo.class);

    record Caso(String descripcion, String categoria, String edificio, String ambiente, String impacto,
                String urgencia, int horasAtras, String estado, String tecnico) {
    }

    static final List<Caso> CASOS = List.of(
            new Caso("Sin acceso a la red en todo el laboratorio de cómputo 1; no se puede dictar la práctica.",
                    "Conectividad y red", "Pabellón B", "Laboratorio de cómputo 1", "ALTO", "ALTA", 30,
                    Solicitud.REGISTRADA, null),
            new Caso("El proyector del aula 101 no enciende y hay clases programadas toda la mañana.",
                    "Proyector y multimedia", "Pabellón A", "Aula 101", "MEDIO", "ALTA", 2, Solicitud.REGISTRADA, null),
            new Caso("Actualizar el software estadístico de los equipos del laboratorio de cómputo 2.",
                    "Software académico", "Pabellón B", "Laboratorio de cómputo 2", "BAJO", "MEDIA", 3,
                    Solicitud.REGISTRADA, null),
            new Caso("Filtración de agua en el techo del aula 201 cada vez que llueve; se moja el piso.",
                    "Gasfitería", "Pabellón A", "Aula 201", "MEDIO", "MEDIA", 5, Solicitud.EN_EVALUACION, null),
            new Caso("Cuatro sillas rotas en la sala de lectura de la biblioteca, cerca de la entrada.",
                    "Mobiliario", "Biblioteca", "Sala de lectura", "BAJO", "BAJA", 20, Solicitud.ASIGNADA,
                    "tecnico.mantenimiento@msu.test"),
            new Caso("Limpieza extraordinaria del auditorio antes de la ceremonia de la facultad.",
                    "Limpieza de ambiente", "Auditorio", "Sala principal", "ALTO", "MEDIA", 40,
                    Solicitud.EN_ATENCION, "tecnico.servicios@msu.test"));

    private final SolicitudRepositorio solicitudes;
    private final PoliticaRepositorio politicas;
    private final UsuarioRepositorio usuarios;
    private final CategoriaRepositorio categorias;
    private final UbicacionRepositorio ubicaciones;
    private final RegistroSolicitudServicio registro;
    private final SupervisionServicio supervision;
    private final TransicionesServicio transiciones;
    private final Clock reloj;

    public SolicitudesDemo(SolicitudRepositorio solicitudes, PoliticaRepositorio politicas, UsuarioRepositorio usuarios,
                           CategoriaRepositorio categorias, UbicacionRepositorio ubicaciones,
                           RegistroSolicitudServicio registro, SupervisionServicio supervision,
                           TransicionesServicio transiciones, Clock reloj) {
        this.solicitudes = solicitudes;
        this.politicas = politicas;
        this.usuarios = usuarios;
        this.categorias = categorias;
        this.ubicaciones = ubicaciones;
        this.registro = registro;
        this.supervision = supervision;
        this.transiciones = transiciones;
        this.reloj = reloj;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void crear() {
        if (solicitudes.count() > 0 || politicas.count() == 0) {
            return;
        }
        Usuario solicitante = usuarios.findByCorreo("solicitante@msu.test").orElse(null);
        Usuario supervisor = usuarios.findByCorreo("supervisor@msu.test").orElse(null);
        if (solicitante == null || supervisor == null) {
            return;
        }
        UsuarioAutenticado sesionSupervisor = UsuarioAutenticado.de(supervisor);
        Instant ahora = Instant.now(reloj);
        for (Caso c : CASOS) {
            Solicitud s = registro.registrar(solicitante, datos(c), ahora.minus(Duration.ofHours(c.horasAtras())));
            if (!Solicitud.REGISTRADA.equals(c.estado())) {
                supervision.evaluar(s.getId(), new EvaluacionSolicitud(null, null, null, null, s.getVersion()),
                        sesionSupervisor);
            }
            if (c.tecnico() != null) {
                Usuario tecnico = usuarios.findByCorreo(c.tecnico()).orElseThrow();
                supervision.asignar(s.getId(), new AsignacionSolicitud(tecnico.getId(), null, s.getVersion()),
                        sesionSupervisor);
                if (Solicitud.EN_ATENCION.equals(c.estado())) {
                    transiciones.aplicar(s, Transicion.INICIAR_ATENCION, tecnico.getId(), null, null);
                    transiciones.guardar(s);
                }
            }
        }
        log.info("Datos de demostración: {} solicitudes de ejemplo creadas.", CASOS.size());
    }

    private NuevaSolicitud datos(Caso c) {
        long categoria = categorias.findAll().stream().filter(x -> x.getNombre().equals(c.categoria()))
                .findFirst().orElseThrow().getId();
        long ubicacion = ubicaciones.findAll().stream()
                .filter(u -> u.getEdificio().equals(c.edificio()) && u.getAmbiente().equals(c.ambiente()))
                .findFirst().orElseThrow().getId();
        return new NuevaSolicitud(categoria, ubicacion, null, c.descripcion(), c.impacto(), c.urgencia());
    }
}
