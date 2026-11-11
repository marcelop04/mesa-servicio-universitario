package pe.edu.unmsm.msu.indicadores.controlador;

/** Expone a las pruebas la neutralización de celdas del CSV, que es de paquete. */
public final class IndicadoresControladorAcceso {

    private IndicadoresControladorAcceso() {
    }

    public static String celda(String valor) {
        return IndicadoresControlador.celda(valor);
    }
}
