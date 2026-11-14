"""Fixtures ficticios exclusivos del resumidor; no son evidencia de escaneo real."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

RAIZ = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("resumir_zap", RAIZ / "scripts/resumir-zap.py")
zap = importlib.util.module_from_spec(spec)
spec.loader.exec_module(zap)


class ResumenZapTest(unittest.TestCase):
    def setUp(self):
        self.alcance = {"autorizacion_confirmada": True, "origen": "https://pruebas.example.org",
                        "revision_desplegada": "a" * 40}
        self.reporte = {"@version": "fixture-no-real", "@generated": "fecha-ficticia", "site": [{
            "@name": "https://pruebas.example.org", "alerts": [{
                "pluginid": "10000", "name": "Alerta ficticia", "riskcode": "1", "confidence": "2",
                "instances": [{"uri": "https://pruebas.example.org/login?token=FICTICIO_QUERY#FICTICIO_FRAGMENTO",
                               "evidence": "FICTICIO_COOKIE", "attack": "FICTICIO_ATAQUE",
                               "otherinfo": "FICTICIO_OTRO", "requestHeader": "FICTICIO_CABECERA"}]}]}]}

    def test_resume_sin_copiar_evidencias_consultas_ni_cabeceras(self):
        resultado = zap.resumir(self.reporte, self.alcance, 2)
        self.assertEqual(resultado["alertas"][0]["rutas"], ["/login"])
        self.assertNotIn("FICTICIO", json.dumps(resultado))
        self.assertEqual(resultado["grupos_por_riesgo"], {"0": 0, "1": 1, "2": 0, "3": 0})
        self.assertTrue(resultado["requiere_revision_de_hallazgos"])

    def test_no_convierte_fallo_tecnico_en_cero_alertas(self):
        for codigo in (3, 125, -1):
            with self.subTest(codigo=codigo), self.assertRaises(ValueError):
                zap.resumir(self.reporte, self.alcance, codigo)

    def test_exige_reporte_real_completo(self):
        for clave in ("@version", "@generated", "site"):
            reporte = copy.deepcopy(self.reporte)
            del reporte[clave]
            with self.subTest(clave=clave), self.assertRaises(ValueError):
                zap.resumir(reporte, self.alcance, 0)

    def test_rechaza_sitios_e_instancias_fuera_del_origen(self):
        for url in ("https://ajeno.example.org", "http://pruebas.example.org",
                    "https://pruebas.example.org:444", "https://usuario:clave@pruebas.example.org"):
            for instancia in (False, True):
                reporte = copy.deepcopy(self.reporte)
                if instancia:
                    reporte["site"][0]["alerts"][0]["instances"][0]["uri"] = url
                else:
                    reporte["site"][0]["@name"] = url
                with self.subTest(url=url, instancia=instancia), self.assertRaises(ValueError):
                    zap.resumir(reporte, self.alcance, 2)

    def test_exige_autorizacion_y_sha_completo(self):
        for clave, valor in (("autorizacion_confirmada", False), ("revision_desplegada", "main")):
            alcance = {**self.alcance, clave: valor}
            with self.subTest(clave=clave), self.assertRaises(ValueError):
                zap.resumir(self.reporte, alcance, 2)

    def test_cero_alertas_no_significa_certificacion(self):
        self.reporte["site"][0]["alerts"] = []
        resultado = zap.resumir(self.reporte, self.alcance, 0)
        self.assertEqual(resultado["alertas"], [])
        self.assertTrue(resultado["requiere_revision_de_hallazgos"])

    def test_exige_alertas_con_instancias_y_riesgos_conocidos(self):
        for clave, valor in (("instances", []), ("riskcode", "99")):
            reporte = copy.deepcopy(self.reporte)
            reporte["site"][0]["alerts"][0][clave] = valor
            with self.subTest(clave=clave), self.assertRaises(ValueError):
                zap.resumir(reporte, self.alcance, 2)


if __name__ == "__main__":
    unittest.main()
