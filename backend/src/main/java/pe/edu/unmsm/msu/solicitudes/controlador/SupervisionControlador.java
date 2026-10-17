package pe.edu.unmsm.msu.solicitudes.controlador;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.unmsm.msu.seguridad.UsuarioAutenticado;
import pe.edu.unmsm.msu.solicitudes.dto.AsignacionSolicitud;
import pe.edu.unmsm.msu.solicitudes.dto.CancelacionSolicitud;
import pe.edu.unmsm.msu.solicitudes.dto.EvaluacionSolicitud;
import pe.edu.unmsm.msu.solicitudes.dto.SolicitudDetalle;
import pe.edu.unmsm.msu.solicitudes.dto.TecnicoCarga;
import pe.edu.unmsm.msu.solicitudes.servicio.SupervisionServicio;

/** Épica E03 · Evaluación y asignación (Marcelo, MR04 a MR06). Solo supervisores. */
@RestController
@Tag(name = "Supervisión", description = "Evaluar, asignar y cancelar solicitudes (HU07, HU08, HU09)")
public class SupervisionControlador {

    private final SupervisionServicio servicio;

    public SupervisionControlador(SupervisionServicio servicio) {
        this.servicio = servicio;
    }

    @PostMapping("/api/v1/solicitudes/{id}/evaluacion")
    @Operation(summary = "Evaluar y priorizar (HU07)",
            description = "Desde Registrada pasa a En evaluación. Cambiar impacto, urgencia o categoría exige motivo "
                    + "(10 a 1000) y recalcula los límites desde el registro con la matriz guardada. "
                    + "Versión antigua: 409 CONFLICTO_VERSION.")
    public SolicitudDetalle evaluar(@PathVariable long id, @Valid @RequestBody EvaluacionSolicitud datos,
                                    @AuthenticationPrincipal UsuarioAutenticado sesion) {
        return servicio.evaluar(id, datos, sesion);
    }

    @PostMapping("/api/v1/solicitudes/{id}/asignaciones")
    @Operation(summary = "Asignar o reasignar técnico (HU08)",
            description = "En evaluación pasa a Asignada. En Asignada o En atención es una reasignación: exige motivo "
                    + "y conserva el estado y los plazos. El técnico debe estar activo y ser del área de la solicitud.")
    public SolicitudDetalle asignar(@PathVariable long id, @Valid @RequestBody AsignacionSolicitud datos,
                                    @AuthenticationPrincipal UsuarioAutenticado sesion) {
        return servicio.asignar(id, datos, sesion);
    }

    @PostMapping("/api/v1/solicitudes/{id}/cancelacion")
    @Operation(summary = "Cancelar una solicitud pendiente (HU09)",
            description = "Motivo de 10 a 1000 caracteres. Si duplicado es true, codigo_original debe existir y ser "
                    + "distinto del propio. Resuelta, Cerrada o Cancelada: 409 TRANSICION_INVALIDA.")
    public SolicitudDetalle cancelar(@PathVariable long id, @Valid @RequestBody CancelacionSolicitud datos,
                                     @AuthenticationPrincipal UsuarioAutenticado sesion) {
        return servicio.cancelar(id, datos, sesion);
    }

    @GetMapping("/api/v1/supervision/tecnicos")
    @Operation(summary = "Técnicos activos con su carga pendiente (RF10)",
            description = "Filtra por área si se indica area_id. La carga es un apoyo; la asignación es manual.")
    public List<TecnicoCarga> tecnicos(@RequestParam(name = "area_id", required = false) Long areaId,
                                       @AuthenticationPrincipal UsuarioAutenticado sesion) {
        return servicio.tecnicos(areaId, sesion);
    }
}
