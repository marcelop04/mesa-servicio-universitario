package pe.edu.unmsm.msu;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Timestamp;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;

/**
 * Defectos encontrados en la revisión funcional previa a la entrega: entradas que acababan en un
 * error interno (500) o se aceptaban en silencio, y cambios de cuenta que dejaban casos bloqueados.
 */
class CorreccionesRevisionTest extends PruebaApi {

    static final String JSON = MediaType.APPLICATION_JSON_VALUE;

    @Test
    void unaPaginaEnormeRespondeUnListadoVacioYNoUnErrorInterno() throws Exception {
        mvc.perform(get("/api/v1/solicitudes?pagina=999999999").session(sesion("solicitante@msu.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty());
    }

    @Test
    void unaClaveDeMasDe72BytesSeRechazaComoDatoInvalido() throws Exception {
        String clave = "ñ".repeat(40); // 40 caracteres válidos para @Size, 80 bytes para BCrypt
        mvc.perform(post("/api/v1/auth/registro").with(xsrf()).contentType(JSON).content("""
                        {"nombre":"Clave Larga","correo":"clave.larga@msu.test","password":"%s","vinculo":"DOCENTE"}"""
                        .formatted(clave)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores[0].campo").value("password"));
    }

    @Test
    void elPerfilNoAceptaUnNombreDeUnCaracterRodeadoDeEspacios() throws Exception {
        mvc.perform(put("/api/v1/me").session(sesion("solicitante@msu.test")).with(xsrf()).contentType(JSON)
                        .content("{\"nombre\":\"  a  \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores[0].campo").value("nombre"));
    }

    @Test
    void unDecimalDondeVaUnEnteroEsErrorDeFormatoYNoSeTrunca() throws Exception {
        mvc.perform(post("/api/v1/admin/politicas").session(sesion("admin@msu.test")).with(xsrf()).contentType(JSON)
                        .content("""
                                {"detalles":[
                                  {"prioridad_codigo":"CRITICA","horas_primera_atencion":2.5,"horas_resolucion":12},
                                  {"prioridad_codigo":"ALTA","horas_primera_atencion":6,"horas_resolucion":36},
                                  {"prioridad_codigo":"MEDIA","horas_primera_atencion":24,"horas_resolucion":96},
                                  {"prioridad_codigo":"BAJA","horas_primera_atencion":48,"horas_resolucion":168}]}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("FORMATO_INVALIDO"));
    }

    @Test
    void unSolicitanteConCasosSinCerrarNoCambiaDeRol() throws Exception {
        pruebas.crear("Equipo de cómputo", "MEDIO", "MEDIA", Instant.now());
        long solicitante = pruebas.usuarioId("solicitante@msu.test");
        mvc.perform(put("/api/v1/admin/usuarios/" + solicitante).session(sesion("admin@msu.test")).with(xsrf())
                        .contentType(JSON).content("{\"rol\":\"SUPERVISOR\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.codigo").value("SOLICITANTE_CON_CASOS"));
    }

    @Test
    void elNombreVisibleDeUnEstadoAdmiteSesentaCaracteres() throws Exception {
        MockHttpSession admin = sesion("admin@msu.test");
        mvc.perform(put("/api/v1/admin/catalogos/estados/RESUELTA").session(admin).with(xsrf()).contentType(JSON)
                        .content("{\"nombre\":\"" + "R".repeat(61) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores[0].campo").value("nombre"));
        mvc.perform(put("/api/v1/admin/catalogos/estados/RESUELTA").session(admin).with(xsrf()).contentType(JSON)
                        .content("{\"nombre\":\"" + "R".repeat(60) + "\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void reabrirConUnResponsableQueYaNoEsTecnicoVuelveAEvaluacion() throws Exception {
        long tecnico = pruebas.usuarioId("tecnico.soporte@msu.test");
        long id = pruebas.crearConEstado(pruebas.categoriaId("Equipo de cómputo"), Solicitud.RESUELTA, tecnico);
        pruebas.sql("UPDATE solicitud SET ultima_resolucion_en = ?, primera_atencion_en = ? WHERE id = ?",
                Timestamp.from(Instant.now()), Timestamp.from(Instant.now()), id);
        // El administrador puede cambiarle el rol porque un caso Resuelto no cuenta como carga pendiente.
        pruebas.sql("UPDATE usuario SET rol_id = (SELECT id FROM rol WHERE codigo = 'SUPERVISOR'), area_id = NULL"
                + " WHERE id = ?", tecnico);

        mvc.perform(post("/api/v1/solicitudes/" + id + "/conformidad").session(sesion("solicitante@msu.test"))
                        .with(xsrf()).contentType(JSON)
                        .content("{\"accion\":\"REABRIR\",\"motivo\":\"El problema persiste en la clase\",\"version\":0}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado_codigo").value("EN_EVALUACION"))
                .andExpect(jsonPath("$.tecnico_id").doesNotExist());
    }

    @Test
    void unDuplicadoNoPuedeApuntarAUnCasoCancelado() throws Exception {
        long categoria = pruebas.categoriaId("Equipo de cómputo");
        long cancelada = pruebas.crearConEstado(categoria, Solicitud.CANCELADA, null);
        String codigo = pruebas.codigoDe(cancelada);
        long id = pruebas.crear(categoria, "MEDIO", "MEDIA", Instant.now()).getId();

        mvc.perform(post("/api/v1/solicitudes/" + id + "/cancelacion").session(sesion("supervisor@msu.test"))
                        .with(xsrf()).contentType(JSON).content("""
                                {"motivo":"Es el mismo equipo ya reportado","duplicado":true,"codigo_original":"%s","version":0}"""
                                .formatted(codigo)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores[0].campo").value("codigo_original"));
    }
}
