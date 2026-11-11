package pe.edu.unmsm.msu.indicadores.servicio;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.unmsm.msu.catalogos.repositorio.EstadoRepositorio;
import pe.edu.unmsm.msu.catalogos.repositorio.PrioridadRepositorio;
import pe.edu.unmsm.msu.comun.error.ExcepcionApi;
import pe.edu.unmsm.msu.identidad.entidad.Rol;
import pe.edu.unmsm.msu.indicadores.dto.Indicadores;
import pe.edu.unmsm.msu.indicadores.dto.Indicadores.Conteos;
import pe.edu.unmsm.msu.indicadores.dto.Indicadores.Dato;
import pe.edu.unmsm.msu.indicadores.dto.Indicadores.Satisfaccion;
import pe.edu.unmsm.msu.indicadores.dto.Indicadores.Tiempos;
import pe.edu.unmsm.msu.seguridad.UsuarioAutenticado;
import pe.edu.unmsm.msu.solicitudes.entidad.Encuesta;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;
import pe.edu.unmsm.msu.solicitudes.repositorio.EncuestaRepositorio;
import pe.edu.unmsm.msu.solicitudes.repositorio.SolicitudRepositorio;
import pe.edu.unmsm.msu.solicitudes.servicio.Permisos;

/**
 * HU17 y HU18 · Indicadores para el dashboard del supervisor (P10), con las fórmulas de la tabla 7.
 * La base son las solicitudes registradas en el periodo y el área elegidos, con su estado actual.
 * El rango incluye el día inicial y excluye el día posterior al final, en hora de Lima.
 */
@Service
public class IndicadoresServicio {

    private static final ZoneId LIMA = ZoneId.of("America/Lima");

    private final SolicitudRepositorio solicitudes;
    private final EncuestaRepositorio encuestas;
    private final EstadoRepositorio estados;
    private final PrioridadRepositorio prioridades;
    private final Clock reloj;

    public IndicadoresServicio(SolicitudRepositorio solicitudes, EncuestaRepositorio encuestas,
                               EstadoRepositorio estados, PrioridadRepositorio prioridades, Clock reloj) {
        this.solicitudes = solicitudes;
        this.encuestas = encuestas;
        this.estados = estados;
        this.prioridades = prioridades;
        this.reloj = reloj;
    }

    @Transactional(readOnly = true)
    public Indicadores calcular(LocalDate desde, LocalDate hasta, Long areaId, UsuarioAutenticado sesion) {
        Permisos.exigirRol(sesion, Rol.SUPERVISOR);
        Instant ahora = Instant.now(reloj);
        LocalDate fin = hasta == null ? LocalDate.ofInstant(ahora, LIMA) : hasta;
        LocalDate inicio = desde == null ? fin.minusDays(29) : desde;
        if (fin.isBefore(inicio)) {
            throw ExcepcionApi.datoInvalido("hasta", "La fecha final no puede ser anterior a la inicial.");
        }
        List<Solicitud> base = solicitudes.findByRegistradaEnGreaterThanEqualAndRegistradaEnLessThan(
                        inicio.atStartOfDay(LIMA).toInstant(), fin.plusDays(1).atStartOfDay(LIMA).toInstant())
                .stream().filter(s -> areaId == null || s.getArea().getId().equals(areaId)).toList();

        long registradas = base.size();
        long pendientes = contar(base, Solicitud::esPendiente);
        long resueltas = contar(base, s -> Solicitud.RESUELTA.equals(s.getEstadoCodigo()));
        long cerradas = contar(base, s -> Solicitud.CERRADA.equals(s.getEstadoCodigo()));
        long canceladas = contar(base, s -> Solicitud.CANCELADA.equals(s.getEstadoCodigo()));
        long atendidas = contar(base, s -> s.getPrimeraAtencionEn() != null);
        long vencidas = contar(base, s -> s.esPendiente() && ahora.isAfter(s.getLimiteResolucion()));
        Conteos conteos = new Conteos(registradas, pendientes, atendidas, resueltas, cerradas, canceladas, vencidas,
                porcentaje(resueltas + cerradas, registradas - canceladas));

        List<Solicitud> solucionadas = base.stream()
                .filter(s -> (Solicitud.RESUELTA.equals(s.getEstadoCodigo()) || Solicitud.CERRADA.equals(s.getEstadoCodigo()))
                        && s.getUltimaResolucionEn() != null)
                .toList();
        Double tiempoMedio = solucionadas.isEmpty() ? null : redondear(solucionadas.stream()
                .mapToDouble(s -> Duration.between(s.getRegistradaEn(), s.getUltimaResolucionEn()).toMinutes() / 60.0)
                .average().orElse(0));
        long resueltasATiempo = contar(solucionadas, s -> !s.getUltimaResolucionEn().isAfter(s.getLimiteResolucion()));
        List<Solicitud> conPrimeraAtencion = base.stream()
                .filter(s -> s.getPrimeraAtencionEn() != null && !Solicitud.CANCELADA.equals(s.getEstadoCodigo())).toList();
        long atendidasATiempo = contar(conPrimeraAtencion, s -> !s.getPrimeraAtencionEn().isAfter(s.getLimiteAtencion()));
        Tiempos tiempos = new Tiempos(tiempoMedio, solucionadas.size(),
                porcentaje(resueltasATiempo, solucionadas.size()), solucionadas.size(),
                porcentaje(atendidasATiempo, conPrimeraAtencion.size()), conPrimeraAtencion.size());

        List<Encuesta> respuestas = base.isEmpty() ? List.of()
                : encuestas.findBySolicitudIdIn(base.stream().map(Solicitud::getId).toList());
        Satisfaccion satisfaccion = new Satisfaccion(respuestas.isEmpty() ? null
                : redondear(respuestas.stream().mapToInt(Encuesta::getCalificacion).average().orElse(0)), respuestas.size());

        // Distribuciones: todos los estados y prioridades aparecen, aunque tengan cero.
        Map<String, Long> porEstado = agrupar(base, Solicitud::getEstadoCodigo);
        List<Dato> estadosLista = estados.findAll().stream()
                .map(e -> new Dato(e.getCodigo(), e.getNombreVisible(), porEstado.getOrDefault(e.getCodigo(), 0L)))
                .sorted(Comparator.comparingInt(d -> ordenEstado(d.clave()))).toList();
        Map<String, Long> porPrioridad = agrupar(base, Solicitud::getPrioridadCodigo);
        List<Dato> prioridadesLista = prioridades.findAll().stream()
                .sorted(Comparator.comparingInt(p -> p.getOrden()))
                .map(p -> new Dato(p.getCodigo(), p.getNombreVisible(), porPrioridad.getOrDefault(p.getCodigo(), 0L)))
                .toList();
        List<Dato> categorias = ordenar(agrupar(base, s -> s.getCategoria().getNombre()));
        List<Dato> tecnicos = ordenar(agrupar(base, s -> s.getTecnico() == null ? "Sin asignar" : s.getTecnico().getNombre()));

        return new Indicadores(inicio, fin, areaId, ahora, conteos, tiempos, satisfaccion, estadosLista,
                prioridadesLista, categorias, tecnicos);
    }

    private static long contar(List<Solicitud> lista, java.util.function.Predicate<Solicitud> condicion) {
        return lista.stream().filter(condicion).count();
    }

    private static Map<String, Long> agrupar(List<Solicitud> lista, Function<Solicitud, String> clave) {
        return lista.stream().collect(Collectors.groupingBy(clave, LinkedHashMap::new, Collectors.counting()));
    }

    private static List<Dato> ordenar(Map<String, Long> mapa) {
        List<Dato> datos = new ArrayList<>();
        mapa.forEach((k, v) -> datos.add(new Dato(k, k, v)));
        datos.sort(Comparator.comparingLong(Dato::valor).reversed().thenComparing(Dato::etiqueta));
        return datos;
    }

    private static int ordenEstado(String codigo) {
        return List.of(Solicitud.REGISTRADA, Solicitud.EN_EVALUACION, Solicitud.ASIGNADA, Solicitud.EN_ATENCION,
                Solicitud.RESUELTA, Solicitud.CERRADA, Solicitud.CANCELADA).indexOf(codigo);
    }

    /** Un denominador cero devuelve null («Sin datos»), no 0 %. */
    static Double porcentaje(long parte, long base) {
        return base <= 0 ? null : redondear(100.0 * parte / base);
    }

    static Double redondear(double valor) {
        return Math.round(valor * 10) / 10.0;
    }
}
