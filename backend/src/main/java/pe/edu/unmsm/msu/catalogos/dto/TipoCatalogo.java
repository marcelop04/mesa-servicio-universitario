package pe.edu.unmsm.msu.catalogos.dto;

import java.util.Arrays;
import pe.edu.unmsm.msu.comun.error.ExcepcionApi;

/** Tipos admitidos en /catalogos y /admin/catalogos/{tipo}. */
public enum TipoCatalogo {
    AREAS("areas", false),
    CATEGORIAS("categorias", false),
    UBICACIONES("ubicaciones", false),
    ESTADOS("estados", true),
    PRIORIDADES("prioridades", true);

    private final String ruta;
    private final boolean fijo;

    TipoCatalogo(String ruta, boolean fijo) {
        this.ruta = ruta;
        this.fijo = fijo;
    }

    public static TipoCatalogo desdeRuta(String ruta) {
        return Arrays.stream(values())
                .filter(t -> t.ruta.equals(ruta))
                .findFirst()
                .orElseThrow(() -> ExcepcionApi.noEncontrado("El catálogo '" + ruta + "' no existe."));
    }

    public String getRuta() {
        return ruta;
    }

    /** Estados y prioridades tienen identificadores y reglas fijos (RN11). */
    public boolean esFijo() {
        return fijo;
    }
}
