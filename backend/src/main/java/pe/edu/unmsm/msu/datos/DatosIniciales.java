package pe.edu.unmsm.msu.datos;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.unmsm.msu.catalogos.entidad.Area;
import pe.edu.unmsm.msu.catalogos.repositorio.AreaRepositorio;
import pe.edu.unmsm.msu.identidad.entidad.Rol;
import pe.edu.unmsm.msu.identidad.entidad.Usuario;
import pe.edu.unmsm.msu.identidad.repositorio.RolRepositorio;
import pe.edu.unmsm.msu.identidad.repositorio.UsuarioRepositorio;

/**
 * GB07. Cuentas de prueba por rol y política de plazos v1 (tabla 6 del informe), para que la
 * demo funcione en una base recién creada. Las áreas, categorías y ubicaciones vienen de la
 * migración V2. Todos los datos son ficticios; los correos usan el dominio reservado .test.
 */
@Component
@ConditionalOnProperty(name = "msu.datos-demo.habilitado", havingValue = "true")
public class DatosIniciales implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DatosIniciales.class);

    record Cuenta(String nombre, String correo, String vinculo, String rol, String area) {
    }

    static final List<Cuenta> CUENTAS = List.of(
            new Cuenta("Ana Solicitante", "solicitante@msu.test", "ESTUDIANTE", Rol.SOLICITANTE, null),
            new Cuenta("Tomás Soporte", "tecnico.soporte@msu.test", "ADMINISTRATIVO", Rol.TECNICO,
                    "Soporte informático"),
            new Cuenta("Teresa Mantenimiento", "tecnico.mantenimiento@msu.test", "ADMINISTRATIVO", Rol.TECNICO,
                    "Mantenimiento"),
            new Cuenta("Tito Servicios", "tecnico.servicios@msu.test", "ADMINISTRATIVO", Rol.TECNICO,
                    "Servicios generales"),
            new Cuenta("Sara Supervisora", "supervisor@msu.test", "ADMINISTRATIVO", Rol.SUPERVISOR, null),
            new Cuenta("Adán Administrador", "admin@msu.test", "ADMINISTRATIVO", Rol.ADMINISTRADOR, null));

    /** Tabla 6: prioridad, horas de primera atención y horas de resolución. */
    static final List<Object[]> PLAZOS = List.of(
            new Object[] {"CRITICA", 4, 24},
            new Object[] {"ALTA", 8, 48},
            new Object[] {"MEDIA", 24, 120},
            new Object[] {"BAJA", 48, 240});

    private final UsuarioRepositorio usuarios;
    private final RolRepositorio roles;
    private final AreaRepositorio areas;
    private final PasswordEncoder encoder;
    private final JdbcTemplate jdbc;
    private final String password;

    public DatosIniciales(UsuarioRepositorio usuarios, RolRepositorio roles, AreaRepositorio areas,
                          PasswordEncoder encoder, JdbcTemplate jdbc,
                          @Value("${msu.datos-demo.password}") String password) {
        this.usuarios = usuarios;
        this.roles = roles;
        this.areas = areas;
        this.encoder = encoder;
        this.jdbc = jdbc;
        this.password = password;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        int creadas = 0;
        for (Cuenta c : CUENTAS) {
            if (usuarios.existsByCorreo(c.correo())) {
                continue;
            }
            Rol rol = roles.findByCodigo(c.rol()).orElseThrow();
            Area area = c.area() == null ? null : areas.findAll().stream()
                    .filter(a -> a.getNombre().equals(c.area())).findFirst().orElseThrow();
            usuarios.save(new Usuario(c.nombre(), c.correo(), encoder.encode(password), c.vinculo(), rol, area));
            creadas++;
        }
        if (creadas > 0) {
            log.info("Datos de demostración: {} cuentas de prueba creadas.", creadas);
        }
        publicarPoliticaInicial();
    }

    private void publicarPoliticaInicial() {
        Integer politicas = jdbc.queryForObject("SELECT COUNT(*) FROM politica", Integer.class);
        if (politicas != null && politicas > 0) {
            return;
        }
        long admin = usuarios.findByCorreo("admin@msu.test").orElseThrow().getId();
        jdbc.update("INSERT INTO politica (version, vigente_desde, publicada_por) VALUES (1, ?, ?)",
                Timestamp.from(Instant.now()), admin);
        Long politicaId = jdbc.queryForObject("SELECT id FROM politica WHERE version = 1", Long.class);
        for (Object[] p : PLAZOS) {
            jdbc.update("INSERT INTO detalle_politica (politica_id, prioridad_codigo, horas_primera_atencion,"
                    + " horas_resolucion) VALUES (?, ?, ?, ?)", politicaId, p[0], p[1], p[2]);
        }
        log.info("Datos de demostración: política de plazos v1 publicada.");
    }
}
