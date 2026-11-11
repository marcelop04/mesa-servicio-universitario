package pe.edu.unmsm.msu.identidad.servicio;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.unmsm.msu.auditoria.servicio.AuditoriaServicio;
import pe.edu.unmsm.msu.comun.error.ErrorCampo;
import pe.edu.unmsm.msu.comun.error.ExcepcionApi;
import pe.edu.unmsm.msu.identidad.dto.CambioPassword;
import pe.edu.unmsm.msu.identidad.dto.CambioPerfil;
import pe.edu.unmsm.msu.identidad.dto.Perfil;
import pe.edu.unmsm.msu.identidad.dto.RegistroCuenta;
import pe.edu.unmsm.msu.identidad.entidad.Rol;
import pe.edu.unmsm.msu.identidad.entidad.Usuario;
import pe.edu.unmsm.msu.identidad.repositorio.RolRepositorio;
import pe.edu.unmsm.msu.identidad.repositorio.UsuarioRepositorio;

/**
 * Épica E01 · Identidad (David).
 * <ul>
 *   <li>DV03 · HU01 Registrar una cuenta: siempre con rol Solicitante y correo único normalizado.</li>
 *   <li>DV05 · HU03 Consultar el perfil, cambiar el nombre y cambiar la contraseña comprobando la actual.</li>
 * </ul>
 */
@Service
public class CuentaServicio {

    private final UsuarioRepositorio usuarios;
    private final RolRepositorio roles;
    private final PasswordEncoder encoder;
    private final AuditoriaServicio auditoria;

    public CuentaServicio(UsuarioRepositorio usuarios, RolRepositorio roles, PasswordEncoder encoder,
                          AuditoriaServicio auditoria) {
        this.auditoria = auditoria;
        this.usuarios = usuarios;
        this.roles = roles;
        this.encoder = encoder;
    }

    /** HU01 BDD 1: crea un solicitante. BDD 2: un correo ya registrado responde 409 sin duplicar. */
    @Transactional
    public Perfil registrar(RegistroCuenta datos) {
        String correo = Usuario.normalizarCorreo(datos.correo());
        if (usuarios.existsByCorreo(correo)) {
            throw ExcepcionApi.conflicto("CORREO_DUPLICADO", "Ya existe una cuenta con ese correo.");
        }
        Rol solicitante = roles.findByCodigo(Rol.SOLICITANTE).orElseThrow();
        Usuario u = usuarios.saveAndFlush(new Usuario(datos.nombre().trim(), correo, encoder.encode(datos.password()),
                datos.vinculo(), solicitante, null));
        auditoria.registrarComo(u.getId(), "CUENTA_REGISTRAR", "USUARIO", u.getId(),
                Map.of("correo", correo, "vinculo", String.valueOf(datos.vinculo())));
        return Perfil.de(u);
    }

    /** HU03 BDD 2: solo cambia el nombre; rol, área y correo no se modifican desde el perfil. */
    @Transactional
    public Perfil cambiarPerfil(long usuarioId, CambioPerfil datos) {
        Usuario u = usuarios.findById(usuarioId).orElseThrow();
        String anterior = u.getNombre();
        u.setNombre(datos.nombre().trim());
        if (!anterior.equals(u.getNombre())) {
            auditoria.registrarComo(usuarioId, "CUENTA_ACTUALIZAR_PERFIL", "USUARIO", usuarioId,
                    Map.of("cambios", Map.of("nombre", Map.of("anterior", anterior, "nuevo", u.getNombre()))));
        }
        return Perfil.de(u);
    }

    /**
     * HU03 BDD 1: actualiza el hash y la contraseña anterior deja de autenticar. Además incrementa la
     * versión de autorización, así cualquier otra sesión abierta queda revocada; quien llama emite un
     * token nuevo para la sesión actual.
     */
    @Transactional
    public Usuario cambiarPassword(long usuarioId, CambioPassword datos) {
        Usuario u = usuarios.findById(usuarioId).orElseThrow();
        List<ErrorCampo> errores = new ArrayList<>();
        if (!encoder.matches(datos.actual(), u.getPasswordHash())) {
            errores.add(new ErrorCampo("actual", "La contraseña actual no es correcta."));
        }
        if (!datos.nueva().equals(datos.confirmacion())) {
            errores.add(new ErrorCampo("confirmacion", "La confirmación no coincide con la nueva contraseña."));
        }
        if (errores.isEmpty() && encoder.matches(datos.nueva(), u.getPasswordHash())) {
            errores.add(new ErrorCampo("nueva", "La nueva contraseña debe ser distinta de la actual."));
        }
        if (!errores.isEmpty()) {
            throw ExcepcionApi.datosInvalidos(errores);
        }
        u.cambiarPasswordHash(encoder.encode(datos.nueva()));
        u.revocarAutorizacion();
        // Solo se registra que hubo un cambio: nunca la contraseña anterior, la nueva ni su hash.
        auditoria.registrarComo(usuarioId, "CUENTA_CAMBIAR_CLAVE_ACCESO", "USUARIO", usuarioId, Map.of());
        return usuarios.saveAndFlush(u);
    }
}
