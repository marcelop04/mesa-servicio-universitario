package pe.edu.unmsm.msu.politicas.servicio;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.unmsm.msu.auditoria.servicio.AuditoriaServicio;
import pe.edu.unmsm.msu.catalogos.entidad.Prioridad;
import pe.edu.unmsm.msu.catalogos.repositorio.PrioridadRepositorio;
import pe.edu.unmsm.msu.comun.error.ErrorCampo;
import pe.edu.unmsm.msu.comun.error.ExcepcionApi;
import pe.edu.unmsm.msu.identidad.repositorio.UsuarioRepositorio;
import pe.edu.unmsm.msu.politicas.dto.NuevaPolitica;
import pe.edu.unmsm.msu.politicas.dto.PoliticaVista;
import pe.edu.unmsm.msu.politicas.entidad.DetallePolitica;
import pe.edu.unmsm.msu.politicas.entidad.Politica;
import pe.edu.unmsm.msu.politicas.repositorio.PoliticaRepositorio;

/**
 * HU22 · Versionar políticas de plazos (RF27, Emanuel, fase III).
 * <ul>
 *   <li>Publicar crea una versión nueva, vigente desde ese instante, en una sola transacción; nunca se editan
 *       versiones anteriores. Las solicitudes existentes conservan la matriz que guardaron (RN04, HU14 BDD 2).</li>
 *   <li>La matriz debe traer las cuatro prioridades, con horas enteras positivas, la primera atención sin superar
 *       la resolución y sin que una prioridad más urgente tenga plazos más largos que la siguiente.</li>
 *   <li>Concurrencia: si se envía {@code version_base} y otra persona ya publicó, responde 409; la restricción única
 *       de {@code politica.version} cubre además dos publicaciones simultáneas.</li>
 * </ul>
 */
@Service
public class PoliticaServicio {

    /** Un año: evita valores absurdos que desborden los cálculos de fechas. */
    static final int HORAS_MAXIMAS = 8760;

    private final PoliticaRepositorio politicas;
    private final PrioridadRepositorio prioridades;
    private final UsuarioRepositorio usuarios;
    private final AuditoriaServicio auditoria;
    private final Clock reloj;

    public PoliticaServicio(PoliticaRepositorio politicas, PrioridadRepositorio prioridades, UsuarioRepositorio usuarios,
                            AuditoriaServicio auditoria, Clock reloj) {
        this.politicas = politicas;
        this.prioridades = prioridades;
        this.usuarios = usuarios;
        this.auditoria = auditoria;
        this.reloj = reloj;
    }

    @Transactional(readOnly = true)
    public List<PoliticaVista> historial() {
        Instant ahora = Instant.now(reloj);
        Long vigente = politicas.findFirstByVigenteDesdeLessThanEqualOrderByVersionDesc(ahora)
                .map(Politica::getId).orElse(null);
        Map<Long, Long> uso = new HashMap<>();
        for (Object[] fila : politicas.solicitudesPorPolitica()) {
            uso.put((Long) fila[0], (Long) fila[1]);
        }
        Map<String, String> nombres = nombresDePrioridad();
        return politicas.historial().stream()
                .map(p -> vista(p, Objects.equals(p.getId(), vigente), uso.getOrDefault(p.getId(), 0L), nombres))
                .toList();
    }

    /** HU22 BDD 1: las nuevas solicitudes usan la versión publicada. BDD 2: una matriz inconsistente se rechaza. */
    @Transactional
    public PoliticaVista publicar(NuevaPolitica datos, long actorId) {
        Map<String, int[]> matriz = validar(datos);
        int ultima = politicas.ultimaVersion();
        if (datos.versionBase() != null && datos.versionBase() != ultima) {
            throw ExcepcionApi.conflicto("POLITICA_DESACTUALIZADA", "Otra persona publicó la versión " + ultima
                    + " mientras editabas. Recarga la política vigente y revisa los plazos antes de publicar.");
        }
        Politica actual = politicas.findFirstByVigenteDesdeLessThanEqualOrderByVersionDesc(Instant.now(reloj)).orElse(null);
        if (actual != null && iguales(actual, matriz)) {
            throw ExcepcionApi.conflicto("POLITICA_SIN_CAMBIOS",
                    "Los plazos son iguales a la versión vigente " + actual.getVersion() + ". No se publicó otra versión.");
        }
        Politica nueva = new Politica(ultima + 1, Instant.now(reloj), usuarios.getReferenceById(actorId));
        matriz.forEach((prioridad, horas) -> nueva.agregarDetalle(prioridad, horas[0], horas[1]));
        Politica guardada = politicas.saveAndFlush(nueva);

        Map<String, Object> metadatos = new LinkedHashMap<>();
        metadatos.put("version", guardada.getVersion());
        metadatos.put("version_anterior", actual == null ? null : actual.getVersion());
        metadatos.put("matriz", MatrizAplicada.de(guardada));
        auditoria.registrar("POLITICA_PUBLICAR", "POLITICA", guardada.getId(), metadatos);
        return vista(guardada, true, 0, nombresDePrioridad());
    }

    /** Devuelve horas [primera atención, resolución] por prioridad en el orden de urgencia, o lanza 400 por campo. */
    static Map<String, int[]> validar(NuevaPolitica datos) {
        List<ErrorCampo> errores = new ArrayList<>();
        Map<String, int[]> matriz = new LinkedHashMap<>();
        Map<String, NuevaPolitica.Plazo> recibidos = new HashMap<>();
        if (datos == null || datos.detalles() == null) {
            throw ExcepcionApi.datoInvalido("detalles", "Indique los plazos de las cuatro prioridades.");
        }
        for (NuevaPolitica.Plazo p : datos.detalles()) {
            String codigo = p == null || p.prioridadCodigo() == null ? "" : p.prioridadCodigo().trim().toUpperCase(Locale.ROOT);
            if (!MatrizPrioridad.PRIORIDADES.contains(codigo)) {
                errores.add(new ErrorCampo("detalles", "La prioridad «" + codigo + "» no existe."));
            } else if (recibidos.put(codigo, p) != null) {
                errores.add(new ErrorCampo("detalles", "La prioridad " + codigo + " aparece más de una vez."));
            }
        }
        for (String prioridad : MatrizPrioridad.PRIORIDADES) {
            NuevaPolitica.Plazo p = recibidos.get(prioridad);
            if (p == null) {
                errores.add(new ErrorCampo("detalles", "Falta la prioridad " + prioridad + "."));
                continue;
            }
            Integer atencion = horas(p.horasPrimeraAtencion(), prioridad + ".horas_primera_atencion", errores);
            Integer resolucion = horas(p.horasResolucion(), prioridad + ".horas_resolucion", errores);
            if (atencion != null && resolucion != null) {
                if (atencion > resolucion) {
                    errores.add(new ErrorCampo(prioridad + ".horas_primera_atencion", "La primera atención (" + atencion
                            + " h) no puede superar la resolución (" + resolucion + " h)."));
                }
                matriz.put(prioridad, new int[] {atencion, resolucion});
            }
        }
        // Una prioridad más urgente no puede tener plazos más largos que la siguiente (CRITICA ≤ ALTA ≤ MEDIA ≤ BAJA).
        for (int i = 0; i + 1 < MatrizPrioridad.PRIORIDADES.size(); i++) {
            String urgente = MatrizPrioridad.PRIORIDADES.get(i);
            String siguiente = MatrizPrioridad.PRIORIDADES.get(i + 1);
            int[] a = matriz.get(urgente);
            int[] b = matriz.get(siguiente);
            if (a == null || b == null) {
                continue;
            }
            if (a[0] > b[0]) {
                errores.add(new ErrorCampo(urgente + ".horas_primera_atencion", "La primera atención de " + urgente
                        + " (" + a[0] + " h) no puede ser mayor que la de " + siguiente + " (" + b[0] + " h)."));
            }
            if (a[1] > b[1]) {
                errores.add(new ErrorCampo(urgente + ".horas_resolucion", "La resolución de " + urgente
                        + " (" + a[1] + " h) no puede ser mayor que la de " + siguiente + " (" + b[1] + " h)."));
            }
        }
        if (!errores.isEmpty()) {
            throw ExcepcionApi.datosInvalidos(errores);
        }
        return matriz;
    }

    private static Integer horas(Integer valor, String campo, List<ErrorCampo> errores) {
        if (valor == null) {
            errores.add(new ErrorCampo(campo, "Indique las horas."));
            return null;
        }
        if (valor < 1 || valor > HORAS_MAXIMAS) {
            errores.add(new ErrorCampo(campo, "Use un número entero de horas entre 1 y " + HORAS_MAXIMAS + "."));
            return null;
        }
        return valor;
    }

    private static boolean iguales(Politica politica, Map<String, int[]> matriz) {
        for (DetallePolitica d : politica.getDetalles()) {
            int[] horas = matriz.get(d.getPrioridadCodigo());
            if (horas == null || horas[0] != d.getHorasPrimeraAtencion() || horas[1] != d.getHorasResolucion()) {
                return false;
            }
        }
        return politica.getDetalles().size() == matriz.size();
    }

    private Map<String, String> nombresDePrioridad() {
        Map<String, String> nombres = new HashMap<>();
        for (Prioridad p : prioridades.findAll()) {
            nombres.put(p.getCodigo(), p.getNombreVisible());
        }
        return nombres;
    }

    private static PoliticaVista vista(Politica p, boolean vigente, long solicitudes, Map<String, String> nombres) {
        List<PoliticaVista.Detalle> detalles = MatrizPrioridad.PRIORIDADES.stream()
                .flatMap(codigo -> p.getDetalles().stream().filter(d -> d.getPrioridadCodigo().equals(codigo)))
                .map(d -> new PoliticaVista.Detalle(d.getPrioridadCodigo(),
                        nombres.getOrDefault(d.getPrioridadCodigo(), d.getPrioridadCodigo()),
                        d.getHorasPrimeraAtencion(), d.getHorasResolucion()))
                .toList();
        return new PoliticaVista(p.getId(), p.getVersion(), p.getVigenteDesde(), p.getPublicadaPor().getNombre(),
                vigente, solicitudes, detalles);
    }
}
