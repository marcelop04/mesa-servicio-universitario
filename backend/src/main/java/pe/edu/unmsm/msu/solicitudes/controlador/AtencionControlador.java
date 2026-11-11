package pe.edu.unmsm.msu.solicitudes.controlador;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.unmsm.msu.seguridad.UsuarioAutenticado;
import pe.edu.unmsm.msu.solicitudes.dto.ConformidadSolicitud;
import pe.edu.unmsm.msu.solicitudes.dto.EncuestaVista;
import pe.edu.unmsm.msu.solicitudes.dto.EventoVista;
import pe.edu.unmsm.msu.solicitudes.dto.NuevaEncuesta;
import pe.edu.unmsm.msu.solicitudes.dto.ResolucionSolicitud;
import pe.edu.unmsm.msu.solicitudes.dto.SolicitudDetalle;
import pe.edu.unmsm.msu.solicitudes.servicio.AtencionServicio;
import pe.edu.unmsm.msu.solicitudes.servicio.EncuestaServicio;
import pe.edu.unmsm.msu.solicitudes.servicio.HistorialServicio;

/** Épica E04 · Atención, conformidad y encuesta (HU10 a HU13), y HU23 historial (Emanuel). */
@RestController
@Tag(name = "Atención y conformidad", description = "HU10, HU11, HU12, HU13 y HU23")
public class AtencionControlador {

    private final AtencionServicio atencion;
    private final HistorialServicio historial;
    private final EncuestaServicio encuestas;

    public AtencionControlador(AtencionServicio atencion, HistorialServicio historial, EncuestaServicio encuestas) {
        this.atencion = atencion;
        this.historial = historial;
        this.encuestas = encuestas;
    }

    @PostMapping("/api/v1/solicitudes/{id}/inicio")
    @Operation(summary = "Iniciar la atención (HU10)",
            description = "Solo el técnico asignado. Asignada pasa a En atención y la primera atención se registra una vez.")
    public SolicitudDetalle iniciar(@PathVariable long id, @Valid @RequestBody ResolucionSolicitud datos,
                                    @AuthenticationPrincipal UsuarioAutenticado sesion) {
        return atencion.iniciar(id, datos.version(), sesion);
    }

    @PostMapping("/api/v1/solicitudes/{id}/resoluciones")
    @Operation(summary = "Registrar la solución (HU11)",
            description = "Solo el técnico asignado y En atención. Solución de 20 a 2000 caracteres; abre 72 horas de conformidad.")
    public SolicitudDetalle resolver(@PathVariable long id, @Valid @RequestBody ResolucionSolicitud datos,
                                     @AuthenticationPrincipal UsuarioAutenticado sesion) {
        return atencion.resolver(id, datos.solucion(), datos.version(), sesion);
    }

    @PostMapping("/api/v1/solicitudes/{id}/conformidad")
    @Operation(summary = "Confirmar o reabrir (HU12)",
            description = "Solo el solicitante propietario de una solicitud Resuelta, dentro de 72 horas. accion: CONFIRMAR "
                    + "o REABRIR (motivo de 10 a 1000). Fuera de plazo: 409 VENTANA_VENCIDA.")
    public SolicitudDetalle conformidad(@PathVariable long id, @Valid @RequestBody ConformidadSolicitud datos,
                                        @AuthenticationPrincipal UsuarioAutenticado sesion) {
        return atencion.conformidad(id, datos, sesion);
    }

    @GetMapping("/api/v1/solicitudes/{id}/encuesta")
    @Operation(summary = "Consultar la encuesta de satisfacción (HU13)",
            description = "Mismo acceso que el detalle. 200 con la encuesta o 204 si la solicitud aún no fue calificada.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Encuesta registrada"),
            @ApiResponse(responseCode = "204", description = "Sin encuesta", content = @Content),
            @ApiResponse(responseCode = "403", description = "Solicitud ajena", content = @Content)})
    public ResponseEntity<EncuestaVista> encuesta(@PathVariable long id,
                                                  @AuthenticationPrincipal UsuarioAutenticado sesion) {
        return encuestas.consultar(id, sesion).map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/api/v1/solicitudes/{id}/encuesta")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Calificar el servicio (HU13)",
            description = "Solo el solicitante propietario de una solicitud Cerrada. Calificación entera de 1 a 5 y "
                    + "comentario opcional de hasta 500 caracteres. No cambia el estado ni la versión del caso.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Encuesta registrada"),
            @ApiResponse(responseCode = "400", description = "DATOS_INVALIDOS: calificación o comentario fuera de rango",
                    content = @Content),
            @ApiResponse(responseCode = "403", description = "Otro rol o solicitud ajena", content = @Content),
            @ApiResponse(responseCode = "409", description = "ENCUESTA_DUPLICADA o ENCUESTA_NO_DISPONIBLE (no está Cerrada)",
                    content = @Content)})
    public EncuestaVista calificar(@PathVariable long id, @RequestBody NuevaEncuesta datos,
                                   @AuthenticationPrincipal UsuarioAutenticado sesion) {
        return encuestas.registrar(id, datos, sesion);
    }

    @GetMapping("/api/v1/solicitudes/{id}/historial")
    @Operation(summary = "Historial operativo (HU23)", description = "Mismo acceso que el detalle. Orden cronológico.")
    public List<EventoVista> historial(@PathVariable long id, @AuthenticationPrincipal UsuarioAutenticado sesion) {
        return historial.historial(id, sesion);
    }
}
