package pe.edu.unmsm.msu.administracion.servicio;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.unmsm.msu.administracion.dto.CambioUsuario;
import pe.edu.unmsm.msu.administracion.dto.NuevoUsuarioInterno;
import pe.edu.unmsm.msu.administracion.dto.UsuarioAdmin;
import pe.edu.unmsm.msu.auditoria.servicio.AuditoriaServicio;
import pe.edu.unmsm.msu.catalogos.entidad.Area;
import pe.edu.unmsm.msu.catalogos.repositorio.AreaRepositorio;
import pe.edu.unmsm.msu.comun.error.ExcepcionApi;
import pe.edu.unmsm.msu.comun.web.Pagina;
import pe.edu.unmsm.msu.identidad.entidad.Rol;
import pe.edu.unmsm.msu.identidad.entidad.Usuario;
import pe.edu.unmsm.msu.identidad.repositorio.RolRepositorio;
import pe.edu.unmsm.msu.identidad.repositorio.UsuarioRepositorio;
import pe.edu.unmsm.msu.seguridad.LimiteClave;
import pe.edu.unmsm.msu.solicitudes.servicio.ConsultaSolicitudes;

/**
 * HU20 Administrar usuarios internos (RF25). Un técnico debe tener un área activa, no se
 * desactiva un técnico con casos pendientes sin reasignarlos y un cambio de rol o la
 * desactivación invalidan la autorización anterior del usuario.
 */
@Service
@Transactional(readOnly = true)
public class UsuarioAdminServicio {

    private static final Set<String> ROLES_INTERNOS = Set.of(Rol.TECNICO, Rol.SUPERVISOR, Rol.ADMINISTRADOR);
    private static final Set<String> ROLES = Set.of(Rol.SOLICITANTE, Rol.TECNICO, Rol.SUPERVISOR, Rol.ADMINISTRADOR);

    private final UsuarioRepositorio usuarios;
    private final RolRepositorio roles;
    private final AreaRepositorio areas;
    private final ConsultaSolicitudes solicitudes;
    private final PasswordEncoder encoder;
    private final AuditoriaServicio auditoria;

    public UsuarioAdminServicio(UsuarioRepositorio usuarios, RolRepositorio roles, AreaRepositorio areas,
                                ConsultaSolicitudes solicitudes, PasswordEncoder encoder, AuditoriaServicio auditoria) {
        this.usuarios = usuarios;
        this.roles = roles;
        this.areas = areas;
        this.solicitudes = solicitudes;
        this.encoder = encoder;
        this.auditoria = auditoria;
    }

    public Pagina<UsuarioAdmin> listar(String rol, Boolean activo, String texto, Integer pagina, Integer tamano) {
        String filtro = texto == null || texto.isBlank() ? null : texto.trim().toLowerCase();
        String rolFiltro = rol == null || rol.isBlank() ? null : rol;
        Map<Long, Long> carga = solicitudes.pendientesPorTecnico();
        var page = usuarios.buscar(rolFiltro, activo, filtro,
                Pagina.solicitud(pagina, tamano, Sort.by("nombre").and(Sort.by("id"))));
        return Pagina.de(page, u -> UsuarioAdmin.de(u, carga.getOrDefault(u.getId(), 0L)));
    }

    @Transactional
    public UsuarioAdmin crear(NuevoUsuarioInterno datos) {
        if (!ROLES_INTERNOS.contains(datos.rol())) {
            throw ExcepcionApi.datoInvalido("rol",
                    "La administración solo crea técnicos, supervisores o administradores.");
        }
        String correo = Usuario.normalizarCorreo(datos.correo());
        if (usuarios.existsByCorreo(correo)) {
            throw ExcepcionApi.conflicto("CORREO_DUPLICADO", "Ya existe una cuenta con ese correo.");
        }
        LimiteClave.exigir("password", datos.password());
        Rol rol = rol(datos.rol());
        Area area = Rol.TECNICO.equals(datos.rol()) ? areaActivaObligatoria(datos.areaId()) : null;
        Usuario nuevo = usuarios.save(new Usuario(datos.nombre().trim(), correo, encoder.encode(datos.password()),
                "ADMINISTRATIVO", rol, area));
        Map<String, Object> datosAuditados = new LinkedHashMap<>();
        datosAuditados.put("nombre", nuevo.getNombre());
        datosAuditados.put("correo", correo);
        datosAuditados.put("rol", rol.getCodigo());
        datosAuditados.put("area", area == null ? null : area.getNombre());
        auditoria.registrar("USUARIO_CREAR", "USUARIO", nuevo.getId(), datosAuditados);
        return UsuarioAdmin.de(nuevo, 0L);
    }

    @Transactional
    public UsuarioAdmin actualizar(long id, CambioUsuario cambio, long actorId) {
        Usuario usuario = usuarios.findById(id)
                .orElseThrow(() -> ExcepcionApi.noEncontrado("La cuenta indicada no existe."));

        String rolNuevo = cambio.rol() == null ? usuario.getRol().getCodigo() : cambio.rol();
        if (!ROLES.contains(rolNuevo)) {
            throw ExcepcionApi.datoInvalido("rol", "Seleccione un rol válido.");
        }
        boolean cambiaRol = !rolNuevo.equals(usuario.getRol().getCodigo());
        boolean desactiva = Boolean.FALSE.equals(cambio.activo()) && usuario.isActivo();
        boolean reactiva = Boolean.TRUE.equals(cambio.activo()) && !usuario.isActivo();

        Area areaNueva = null;
        if (Rol.TECNICO.equals(rolNuevo)) {
            Long areaId = cambio.areaId() != null ? cambio.areaId()
                    : usuario.getArea() == null ? null : usuario.getArea().getId();
            boolean mismaArea = usuario.getArea() != null && usuario.getArea().getId().equals(areaId);
            areaNueva = mismaArea && !cambiaRol && !reactiva ? usuario.getArea() : areaActivaObligatoria(areaId);
        }
        boolean cambiaArea = usuario.esTecnico() && areaNueva != usuario.getArea();

        if (id == actorId && (desactiva || cambiaRol)) {
            throw ExcepcionApi.conflicto("OPERACION_SOBRE_SI_MISMO",
                    "No puede desactivar su propia cuenta ni cambiar su propio rol.");
        }
        if (usuario.esTecnico() && (desactiva || cambiaRol || cambiaArea)) {
            long pendientes = solicitudes.contarPendientesDeTecnico(id);
            if (pendientes > 0) {
                throw ExcepcionApi.conflicto("TECNICO_CON_CARGA", "El técnico tiene " + pendientes
                        + (pendientes == 1 ? " solicitud pendiente" : " solicitudes pendientes")
                        + ". Pida al supervisor que las reasigne antes de desactivarlo o cambiar su rol o área.");
            }
        }

        if (cambiaRol && Rol.SOLICITANTE.equals(usuario.getRol().getCodigo())) {
            long abiertas = solicitudes.contarAbiertasDeSolicitante(id);
            if (abiertas > 0) {
                throw ExcepcionApi.conflicto("SOLICITANTE_CON_CASOS", "La cuenta tiene " + abiertas
                        + (abiertas == 1 ? " solicitud sin cerrar" : " solicitudes sin cerrar")
                        + ". Con otro rol ya no podría seguirlas ni confirmar la solución: cambie el rol cuando estén"
                        + " cerradas o canceladas.");
            }
        }

        Map<String, Object> antes = estadoAuditable(usuario);
        if (cambio.nombre() != null) {
            usuario.setNombre(cambio.nombre().trim());
        }
        if (cambiaRol) {
            usuario.setRol(rol(rolNuevo));
        }
        usuario.setArea(areaNueva);
        if (cambio.activo() != null) {
            usuario.setActivo(cambio.activo());
        }
        if (cambiaRol || desactiva || reactiva || cambiaArea) {
            usuario.revocarAutorizacion();
        }
        Map<String, Object> despues = estadoAuditable(usuario);
        Map<String, Object> cambios = new LinkedHashMap<>();
        antes.forEach((campo, valor) -> {
            if (!Objects.equals(valor, despues.get(campo))) {
                Map<String, Object> par = new LinkedHashMap<>();
                par.put("anterior", valor);
                par.put("nuevo", despues.get(campo));
                cambios.put(campo, par);
            }
        });
        if (!cambios.isEmpty()) {
            String accion = desactiva ? "USUARIO_DESACTIVAR" : reactiva ? "USUARIO_REACTIVAR" : "USUARIO_ACTUALIZAR";
            auditoria.registrar(accion, "USUARIO", usuario.getId(), Map.of("correo", usuario.getCorreo(), "cambios", cambios));
        }
        return UsuarioAdmin.de(usuario, solicitudes.contarPendientesDeTecnico(id));
    }

    /** Datos que se comparan para la auditoría (HU23). Nunca incluye la contraseña ni su hash. */
    private static Map<String, Object> estadoAuditable(Usuario u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("nombre", u.getNombre());
        m.put("rol", u.getRol().getCodigo());
        m.put("area", u.getArea() == null ? null : u.getArea().getNombre());
        m.put("activo", u.isActivo());
        return m;
    }

    private Rol rol(String codigo) {
        return roles.findByCodigo(codigo)
                .orElseThrow(() -> ExcepcionApi.datoInvalido("rol", "Seleccione un rol válido."));
    }

    private Area areaActivaObligatoria(Long areaId) {
        if (areaId == null) {
            throw ExcepcionApi.datoInvalido("area_id", "Un técnico debe pertenecer a un área.");
        }
        return areas.findById(areaId).filter(Area::isActivo)
                .orElseThrow(() -> ExcepcionApi.datoInvalido("area_id", "Seleccione un área activa."));
    }
}
