package pe.edu.unmsm.msu.seguridad;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Falla al arrancar, sin imprimir secretos, si el despliegue usa opciones de demostración inseguras. */
@Component
public class VerificadorSeguridad {

    public VerificadorSeguridad(@Value("${msu.seguridad.despliegue:false}") boolean despliegue,
            @Value("${msu.jwt.cookie-segura:false}") boolean cookieSegura,
            @Value("${msu.datos-demo.habilitado:false}") boolean demo,
            @Value("${msu.datos-demo.solicitudes:false}") boolean solicitudesDemo,
            @Value("${msu.datos-demo.password:}") String passwordDemo) {
        if (despliegue && (!cookieSegura || demo || solicitudesDemo)) {
            throw new IllegalStateException("En despliegue se exige COOKIE_SECURE=true, DATOS_DEMO=false "
                    + "y DATOS_DEMO_SOLICITUDES=false.");
        }
        if (demo && passwordDemo.length() < 10) {
            throw new IllegalStateException("Los datos de demostración requieren DEMO_PASSWORD de al menos 10 caracteres.");
        }
    }
}
