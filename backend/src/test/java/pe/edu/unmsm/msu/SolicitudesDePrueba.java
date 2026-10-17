package pe.edu.unmsm.msu;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.unmsm.msu.catalogos.entidad.Categoria;
import pe.edu.unmsm.msu.catalogos.repositorio.CategoriaRepositorio;
import pe.edu.unmsm.msu.catalogos.repositorio.EstadoRepositorio;
import pe.edu.unmsm.msu.catalogos.repositorio.PrioridadRepositorio;
import pe.edu.unmsm.msu.catalogos.repositorio.UbicacionRepositorio;
import pe.edu.unmsm.msu.identidad.repositorio.UsuarioRepositorio;
import pe.edu.unmsm.msu.politicas.servicio.MatrizPrioridad;
import pe.edu.unmsm.msu.politicas.servicio.PlazosServicio;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;
import pe.edu.unmsm.msu.solicitudes.repositorio.SolicitudRepositorio;

/**
 * Crea solicitudes reales (con política aplicada y límites) para las pruebas, mientras el registro
 * por la API (AX01) no exista. Reemplaza la tabla mínima de prueba que había antes de MR01.
 */
@Component
public class SolicitudesDePrueba {

    private static final AtomicInteger SECUENCIA = new AtomicInteger();

    @PersistenceContext
    private EntityManager em;

    private final SolicitudRepositorio solicitudes;
    private final UsuarioRepositorio usuarios;
    private final CategoriaRepositorio categorias;
    private final UbicacionRepositorio ubicaciones;
    private final PrioridadRepositorio prioridades;
    private final EstadoRepositorio estados;
    private final PlazosServicio plazos;
    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;

    public SolicitudesDePrueba(SolicitudRepositorio solicitudes, UsuarioRepositorio usuarios,
                               CategoriaRepositorio categorias, UbicacionRepositorio ubicaciones,
                               PrioridadRepositorio prioridades, EstadoRepositorio estados, PlazosServicio plazos,
                               JdbcTemplate jdbc, PasswordEncoder encoder) {
        this.solicitudes = solicitudes;
        this.usuarios = usuarios;
        this.categorias = categorias;
        this.ubicaciones = ubicaciones;
        this.prioridades = prioridades;
        this.estados = estados;
        this.plazos = plazos;
        this.jdbc = jdbc;
        this.encoder = encoder;
    }

    /** Solicitud Registrada de solicitante@msu.test con la política vigente. */
    @Transactional
    public Solicitud crear(long categoriaId, String impacto, String urgencia, Instant registro) {
        Categoria categoria = categorias.findById(categoriaId).orElseThrow();
        Solicitud s = new Solicitud(String.format("MSU-T-%05d", SECUENCIA.incrementAndGet()),
                usuarios.findByCorreo("solicitante@msu.test").orElseThrow(), categoria,
                ubicaciones.findAll().get(0), null, "Descripción de prueba con más de veinte caracteres.", impacto,
                urgencia, prioridades.getReferenceById(MatrizPrioridad.calcular(impacto, urgencia)),
                estados.getReferenceById(Solicitud.REGISTRADA), registro);
        plazos.aplicarPoliticaVigente(s);
        return solicitudes.saveAndFlush(s);
    }

    public Solicitud crear(String categoria, String impacto, String urgencia, Instant registro) {
        return crear(categoriaId(categoria), impacto, urgencia, registro);
    }

    /** Atajo para preparar datos: fija estado y técnico sin pasar por las reglas de transición. */
    @Transactional
    public long crearConEstado(long categoriaId, String estado, Long tecnicoId) {
        long id = crear(categoriaId, "MEDIO", "MEDIA", Instant.now()).getId();
        jdbc.update("UPDATE solicitud SET estado_codigo = ?, tecnico_id = ? WHERE id = ?", estado, tecnicoId, id);
        em.clear();
        return id;
    }

    /** Cambia datos directamente en la base y descarta la caché de JPA para que la API vea el cambio. */
    @Transactional
    public void sql(String sentencia, Object... parametros) {
        em.flush();
        jdbc.update(sentencia, parametros);
        em.clear();
    }

    public long categoriaId(String nombre) {
        return jdbc.queryForObject("SELECT id FROM categoria WHERE nombre = ?", Long.class, nombre);
    }

    /** Otro solicitante con la contraseña de las cuentas de prueba, para comprobar el aislamiento (HU05, HU24). */
    @Transactional
    public long crearSolicitante(String correo) {
        jdbc.update("INSERT INTO usuario (nombre, correo, password_hash, vinculo, rol_id, activo, creado_en,"
                + " version_autorizacion) SELECT 'Otro Solicitante', ?, ?, 'DOCENTE', id, TRUE, CURRENT_TIMESTAMP, 0"
                + " FROM rol WHERE codigo = 'SOLICITANTE'", correo, encoder.encode("Demo12345!"));
        return usuarioId(correo);
    }

    public long usuarioId(String correo) {
        return jdbc.queryForObject("SELECT id FROM usuario WHERE correo = ?", Long.class, correo);
    }
}
