package pe.edu.unmsm.msu.administracion.controlador;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.unmsm.msu.administracion.dto.CambioUsuario;
import pe.edu.unmsm.msu.administracion.dto.NuevoUsuarioInterno;
import pe.edu.unmsm.msu.administracion.dto.UsuarioAdmin;
import pe.edu.unmsm.msu.administracion.servicio.UsuarioAdminServicio;
import pe.edu.unmsm.msu.comun.web.Pagina;
import pe.edu.unmsm.msu.seguridad.UsuarioAutenticado;

/** GB04 · HU20: administración de usuarios internos. */
@RestController
@RequestMapping("/api/v1/admin/usuarios")
@Tag(name = "Administración de usuarios", description = "Solo administradores (HU20)")
public class AdminUsuarioControlador {

    private final UsuarioAdminServicio servicio;

    public AdminUsuarioControlador(UsuarioAdminServicio servicio) {
        this.servicio = servicio;
    }

    @GetMapping
    @Operation(summary = "Listar cuentas",
            description = "Filtros por rol, estado y texto (nombre o correo). Incluye la carga pendiente de cada técnico.")
    public Pagina<UsuarioAdmin> listar(@RequestParam(required = false) String rol,
                                       @RequestParam(required = false) Boolean activo,
                                       @RequestParam(required = false) String q,
                                       @RequestParam(required = false) Integer pagina,
                                       @RequestParam(required = false) Integer tamano) {
        return servicio.listar(rol, activo, q, pagina, tamano);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Crear una cuenta interna", description = "Un técnico requiere un área activa.")
    public UsuarioAdmin crear(@Valid @RequestBody NuevoUsuarioInterno datos) {
        return servicio.crear(datos);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cambiar nombre, rol, área o estado",
            description = "Desactivar o cambiar el rol de un técnico con casos pendientes responde 409.")
    public UsuarioAdmin actualizar(@PathVariable long id, @Valid @RequestBody CambioUsuario cambio,
                                   @AuthenticationPrincipal UsuarioAutenticado actor) {
        return servicio.actualizar(id, cambio, actor.id());
    }
}
