package pe.edu.unmsm.msu.indicadores.controlador;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.format.annotation.DateTimeFormat.ISO;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.unmsm.msu.auditoria.servicio.AuditoriaServicio;
import pe.edu.unmsm.msu.comun.web.Pagina;
import pe.edu.unmsm.msu.identidad.entidad.Rol;
import pe.edu.unmsm.msu.indicadores.dto.Indicadores;
import pe.edu.unmsm.msu.indicadores.servicio.IndicadoresServicio;
import pe.edu.unmsm.msu.seguridad.UsuarioAutenticado;
import pe.edu.unmsm.msu.solicitudes.dto.SolicitudResumen;
import pe.edu.unmsm.msu.solicitudes.servicio.ListadoSolicitudesServicio;
import pe.edu.unmsm.msu.solicitudes.servicio.ListadoSolicitudesServicio.Filtros;
import pe.edu.unmsm.msu.solicitudes.servicio.Permisos;

/** HU17, HU18 y HU19 · Indicadores del dashboard (P10) y exportación CSV. Solo supervisores. */
@RestController
@Tag(name = "Indicadores y reportes", description = "Dashboard del supervisor y exportación CSV")
public class IndicadoresControlador {

    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(ZoneId.of("America/Lima"));

    private final IndicadoresServicio indicadores;
    private final ListadoSolicitudesServicio listado;
    private final AuditoriaServicio auditoria;

    public IndicadoresControlador(IndicadoresServicio indicadores, ListadoSolicitudesServicio listado,
                                  AuditoriaServicio auditoria) {
        this.indicadores = indicadores;
        this.listado = listado;
        this.auditoria = auditoria;
    }

    @GetMapping("/api/v1/indicadores")
    @Operation(summary = "Indicadores del periodo (HU17, HU18)",
            description = "desde y hasta en AAAA-MM-DD (hora de Lima, incluye el día final); por defecto los últimos 30 días. "
                    + "area_id opcional. Denominador cero: null (Sin datos).")
    public Indicadores indicadores(@RequestParam(required = false) @DateTimeFormat(iso = ISO.DATE) LocalDate desde,
                                   @RequestParam(required = false) @DateTimeFormat(iso = ISO.DATE) LocalDate hasta,
                                   @RequestParam(name = "area_id", required = false) Long areaId,
                                   @AuthenticationPrincipal UsuarioAutenticado sesion) {
        return indicadores.calcular(desde, hasta, areaId, sesion);
    }

    @GetMapping("/api/v1/reportes/solicitudes.csv")
    @Operation(summary = "Exportar el listado filtrado en CSV (HU19)",
            description = "Mismos filtros que GET /solicitudes. Sin imágenes, contraseñas ni tokens; los textos que una hoja "
                    + "de cálculo interpretaría como fórmula se neutralizan.")
    public ResponseEntity<byte[]> csv(@RequestParam(required = false) String estado,
                                      @RequestParam(name = "area_id", required = false) Long areaId,
                                      @RequestParam(name = "categoria_id", required = false) Long categoriaId,
                                      @RequestParam(required = false) String prioridad,
                                      @RequestParam(required = false) String responsable,
                                      @RequestParam(required = false) String q,
                                      @RequestParam(required = false) @DateTimeFormat(iso = ISO.DATE) LocalDate desde,
                                      @RequestParam(required = false) @DateTimeFormat(iso = ISO.DATE) LocalDate hasta,
                                      @RequestParam(required = false) String orden,
                                      @AuthenticationPrincipal UsuarioAutenticado sesion) {
        Permisos.exigirRol(sesion, Rol.SUPERVISOR);
        List<SolicitudResumen> filas = new ArrayList<>();
        for (int pagina = 1; ; pagina++) {
            Pagina<SolicitudResumen> p = listado.listar(new Filtros(estado, areaId, categoriaId, prioridad, responsable, q,
                    desde, hasta, orden, pagina, Pagina.TAMANO_MAXIMO), sesion);
            filas.addAll(p.items());
            if ((long) pagina * Pagina.TAMANO_MAXIMO >= p.total()) {
                break;
            }
        }
        StringBuilder csv = new StringBuilder("﻿"); // BOM: Excel reconoce las tildes
        csv.append("Código;Categoría;Área;Ubicación;Prioridad;Estado;Responsable;Plazo;Registrada;Límite de atención;"
                + "Límite de resolución\r\n");
        for (SolicitudResumen s : filas) {
            csv.append(String.join(";", celda(s.codigo()), celda(s.categoriaNombre()), celda(s.areaNombre()),
                    celda(s.ubicacionNombre()), celda(s.prioridadNombre()), celda(s.estadoNombre()),
                    celda(s.tecnicoNombre() == null ? "Sin asignar" : s.tecnicoNombre()), celda(nivel(s.nivelPlazo())),
                    celda(fecha(s.registradaEn())), celda(fecha(s.limiteAtencion())), celda(fecha(s.limiteResolucion()))))
                    .append("\r\n");
        }
        // HU23: la exportación de datos es un acceso relevante; se guardan los filtros, no el contenido.
        Map<String, Object> filtros = new LinkedHashMap<>();
        filtros.put("estado", estado);
        filtros.put("area_id", areaId);
        filtros.put("categoria_id", categoriaId);
        filtros.put("prioridad", prioridad);
        filtros.put("responsable", responsable);
        filtros.put("q", q);
        filtros.put("desde", desde == null ? null : desde.toString());
        filtros.put("hasta", hasta == null ? null : hasta.toString());
        filtros.values().removeIf(java.util.Objects::isNull);
        auditoria.registrar("REPORTE_EXPORTAR", "SOLICITUD", null, Map.of("filas", filas.size(), "filtros", filtros));
        String nombre = "solicitudes-" + LocalDate.now(ZoneId.of("America/Lima")) + ".csv";
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(nombre).build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .body(csv.toString().getBytes(StandardCharsets.UTF_8));
    }

    /** Neutraliza fórmulas (=, +, -, @) y escapa comillas y separadores. */
    static String celda(String valor) {
        String v = valor == null ? "" : valor;
        if (!v.isEmpty() && "=+-@\t\r".indexOf(v.charAt(0)) >= 0) {
            v = "'" + v;
        }
        return "\"" + v.replace("\"", "\"\"") + "\"";
    }

    private static String fecha(Instant instante) {
        return instante == null ? "" : FECHA.format(instante);
    }

    private static String nivel(String nivel) {
        if (nivel == null) {
            return "";
        }
        return switch (nivel) {
            case "VENCIDA" -> "Vencida";
            case "ALERTA" -> "Plazo al 80 %";
            default -> "En plazo";
        };
    }
}
