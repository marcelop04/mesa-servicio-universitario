"""Comprueba claves únicas de entorno y los extremos/validaciones del instrumento SUS."""
import importlib.util
import io
from pathlib import Path
import unittest

RAIZ = Path(__file__).resolve().parents[2]


def cargar(nombre, ruta):
    spec = importlib.util.spec_from_file_location(nombre, RAIZ / ruta)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


entorno = cargar("crear_entorno", "despliegue/scripts/crear-entorno.py")
sus = cargar("calcular_sus", "docs/pruebas/usuarios/calcular-sus.py")
https = cargar("verificar_https", "despliegue/scripts/verificar-https.py")
checks = cargar("comprobar_ci", "despliegue/scripts/comprobar-ci.py")


class EntornoTest(unittest.TestCase):
    def test_cada_entorno_tiene_claves_independientes_y_demo_optativa(self):
        a = dict(linea.split("=", 1) for linea in entorno.crear("msu.example.org", "david@example.org").splitlines())
        b = dict(linea.split("=", 1) for linea in entorno.crear("prueba.example.org", "david@example.org", "prueba", True).splitlines())
        for clave in ("JWT_SECRET", "DB_PASSWORD", "MYSQL_ROOT_PASSWORD", "DEMO_PASSWORD"):
            self.assertNotEqual(a[clave], b[clave])
            self.assertGreaterEqual(len(a[clave]), 32)
        self.assertNotEqual(a["DB_PASSWORD"], a["MYSQL_ROOT_PASSWORD"])
        self.assertEqual(a["DATOS_DEMO"], "false")
        self.assertEqual(b["DATOS_DEMO"], "true")
        self.assertEqual(a["SEGURIDAD_DESPLIEGUE"], "true")
        self.assertEqual(b["SEGURIDAD_DESPLIEGUE"], "false")
        self.assertNotEqual(a["COMPOSE_PROJECT_NAME"], b["COMPOSE_PROJECT_NAME"])

    def test_no_permite_inyectar_lineas_ni_directivas_en_el_entorno(self):
        for host, email in [("https://msu.example.org", "a@example.org"), ("msu.example.org\nDB_USER=root", "a@example.org"), ("msu.example.org", "a@example.org\nJWT_SECRET=x")]:
            with self.assertRaises(ValueError):
                entorno.crear(host, email)

    def test_prod_rechaza_siembra_demo(self):
        with self.assertRaisesRegex(ValueError, "prod no admite"):
            entorno.crear("msu.example.org", "david@example.org", "prod", True)


class SusTest(unittest.TestCase):
    def test_simulacion_identificada_no_cierra_la_muestra_real(self):
        ruta = RAIZ / "docs/pruebas/usuarios/ejemplo-SIMULADO.csv"
        with ruta.open(encoding="utf-8") as archivo:
            with self.assertRaisesRegex(ValueError, "SIMULADOS"):
                sus.calcular(archivo)
        with ruta.open(encoding="utf-8") as archivo:
            resultado = sus.calcular(archivo, simulacion=True)
        self.assertEqual(resultado["participantes"], 0)
        self.assertEqual(resultado["registros_simulados"], 5)
        self.assertFalse(resultado["meta_muestra_cumplida"])

    def test_extremos_y_punto_neutro(self):
        self.assertEqual(sus.puntuacion([5, 1] * 5), 100)
        self.assertEqual(sus.puntuacion([1, 5] * 5), 0)
        self.assertEqual(sus.puntuacion([3] * 10), 50)

    def test_rechaza_respuestas_fuera_de_escala_o_incompletas(self):
        for valores in ([1] * 9, [6] * 10, [0] * 10, [True] * 10):
            with self.assertRaises(ValueError):
                sus.puntuacion(valores)

    def test_no_inventa_resultados_para_la_plantilla_vacia(self):
        with (RAIZ / "docs/pruebas/usuarios/respuestas-sus.csv").open() as archivo:
            with self.assertRaises(ValueError):
                sus.calcular(archivo)

    def test_csv_real_exige_https_y_detecta_muestra_y_duplicados(self):
        cabecera = "participante,fecha,rol,ancho,url," + ",".join(f"q{i}" for i in range(1, 11)) + "\n"
        fila = "P01,2026-11-12,Solicitante,360,https://msu.example.org," + ",".join(["3"] * 10) + "\n"
        resultado = sus.calcular(io.StringIO(cabecera + fila))
        self.assertEqual(resultado["media_sus"], 50)
        self.assertFalse(resultado["meta_muestra_cumplida"])
        with self.assertRaises(ValueError):
            sus.calcular(io.StringIO(cabecera + fila + fila))
        with self.assertRaises(ValueError):
            sus.calcular(io.StringIO((cabecera + fila).replace("https://", "http://")))


class VerificacionHttpsTest(unittest.TestCase):
    def test_reconoce_el_contenedor_real_de_react_y_su_modulo_compilado(self):
        for documento in (
            b'<div id="raiz"></div><script type="module" src="/assets/index-123.js"></script>',
            b"<script src='/assets/app.js' type=module></script><div class=app id=raiz></div>",
        ):
            self.assertTrue(https.es_spa_html(documento))

    def test_rechaza_la_pagina_por_defecto_y_documentos_sin_la_aplicacion(self):
        for documento in (
            b"<h1>Welcome to nginx!</h1>",
            b'<div id="raiz"></div>',
            b'<div id="root"></div><script type="module" src="/assets/app.js"></script>',
        ):
            self.assertFalse(https.es_spa_html(documento))


class ChecksEntregaTest(unittest.TestCase):
    sha = "a" * 40

    def run_ci(self, nombre="CI", estado="completed", conclusion="success", **extra):
        return dict(name=nombre, head_sha=self.sha, event="push", status=estado,
                    conclusion=conclusion, **extra)

    def test_exige_todos_los_workflows_del_mismo_push(self):
        resultado = checks.estado_requerido([self.run_ci(), self.run_ci("CodeQL")], self.sha, ["CI", "CodeQL"])
        self.assertEqual(resultado["estado"], "aprobado")

    def test_espera_el_analisis_que_sigue_en_curso(self):
        resultado = checks.estado_requerido([self.run_ci(), self.run_ci("CodeQL", "in_progress", None)], self.sha, ["CI", "CodeQL"])
        self.assertEqual(resultado["pendientes"], ["CodeQL"])

    def test_rechaza_seguridad_fallida_aunque_ci_pase(self):
        resultado = checks.estado_requerido([self.run_ci(), self.run_ci("CodeQL", conclusion="failure")], self.sha, ["CI", "CodeQL"])
        self.assertEqual(resultado["estado"], "fallo")

    def test_no_acepta_otro_sha_o_un_evento_de_pr(self):
        for cambio in ({"head_sha": "b" * 40}, {"event": "pull_request"}):
            ejecucion = self.run_ci()
            ejecucion.update(cambio)
            self.assertEqual(checks.estado_requerido([ejecucion], self.sha, ["CI"])["estado"], "pendiente")

    def test_un_exito_viejo_no_oculta_la_ejecucion_nueva_fallida(self):
        resultado = checks.estado_requerido([self.run_ci(id=1), self.run_ci(id=2, conclusion="failure")], self.sha, ["CI"])
        self.assertEqual(resultado["estado"], "fallo")


if __name__ == "__main__":
    unittest.main()
