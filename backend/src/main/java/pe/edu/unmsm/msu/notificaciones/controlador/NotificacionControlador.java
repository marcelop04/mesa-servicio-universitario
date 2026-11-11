package pe.edu.unmsm.msu.notificaciones.controlador;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.unmsm.msu.comun.web.Pagina;
import pe.edu.unmsm.msu.notificaciones.dto.NotificacionVista;
import pe.edu.unmsm.msu.notificaciones.servicio.NotificacionesServicio;
import pe.edu.unmsm.msu.seguridad.UsuarioAutenticado;

/** HU16 · Centro de notificaciones y D07 (DELETE de un aviso propio). Solo el usuario actual. */
@RestController
@RequestMapping("/api/v1/notificaciones")
@Tag(name = "Notificaciones", description = "Avisos internos del usuario actual (HU15, HU16)")
public class NotificacionControlador {

    private final NotificacionesServicio servicio;

    public NotificacionControlador(NotificacionesServicio servicio) {
        this.servicio = servicio;
    }

    @GetMapping
    @Operation(summary = "Mis avisos", description = "Del más reciente al más antiguo. no_leidas=true filtra los pendientes.")
    public Pagina<NotificacionVista> listar(@RequestParam(name = "no_leidas", defaultValue = "false") boolean noLeidas,
                                            @RequestParam(required = false) Integer pagina,
                                            @RequestParam(required = false) Integer tamano,
                                            @AuthenticationPrincipal UsuarioAutenticado sesion) {
        return servicio.listar(sesion, noLeidas, pagina, tamano);
    }

    @GetMapping("/no-leidas")
    @Operation(summary = "Cantidad de avisos no leídos (para la campana)")
    public Map<String, Long> noLeidas(@AuthenticationPrincipal UsuarioAutenticado sesion) {
        return Map.of("total", servicio.noLeidas(sesion));
    }

    @PutMapping("/{id}/lectura")
    @Operation(summary = "Marcar un aviso propio como leído")
    public NotificacionVista marcarLeida(@PathVariable long id, @AuthenticationPrincipal UsuarioAutenticado sesion) {
        return servicio.marcarLeida(id, sesion);
    }

    @PutMapping("/lectura")
    @Operation(summary = "Marcar todos mis avisos como leídos")
    public Map<String, Integer> marcarTodas(@AuthenticationPrincipal UsuarioAutenticado sesion) {
        return Map.of("marcadas", servicio.marcarTodas(sesion));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Borrar un aviso propio (D07)", description = "El historial de la solicitud no cambia.")
    public void eliminar(@PathVariable long id, @AuthenticationPrincipal UsuarioAutenticado sesion) {
        servicio.eliminar(id, sesion);
    }
}
