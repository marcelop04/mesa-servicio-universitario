"""Pruebas C3 aisladas: ni tráfico de red, ni secretos, ni resultados de ZAP inventados."""
import importlib.util
from pathlib import Path
import unittest

RAIZ = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("validar_dast", RAIZ / "scripts/validar-dast.py")
dast = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dast)


class AlcanceDastTest(unittest.TestCase):
    def test_exige_confirmacion_explicita(self):
        for valor in ("", "false", "True"):
            with self.subTest(valor=valor), self.assertRaises(ValueError):
                dast.validar(valor, "https://pruebas.example.org", "a" * 40)

    def test_rechaza_http_credenciales_rutas_y_tokens(self):
        for url in ("http://pruebas.example.org", "https://usuario:clave@pruebas.example.org",
                    "https://pruebas.example.org/api/v1", "https://pruebas.example.org/?token=x",
                    "https://pruebas.example.org/#token", "https://pruebas.example.org\n",
                    "https://pruebas.example.org:puerto", "https://pruebas.example.org:99999"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                dast.validar("true", url, "a" * 40)

    def test_exige_version_identificable_no_nombre_de_rama(self):
        for revision in ("", "main", "abc1234", "z" * 40):
            with self.subTest(revision=revision), self.assertRaises(ValueError):
                dast.validar("true", "https://pruebas.example.org", revision)

    def test_normaliza_origen_y_sha_sin_hacer_escaneo(self):
        datos = dast.validar("true", "https://pruebas.example.org/", "A" * 40)
        self.assertEqual(datos["origen"], "https://pruebas.example.org")
        self.assertEqual(datos["revision_desplegada"], "a" * 40)
        self.assertTrue(datos["autorizacion_confirmada"])


if __name__ == "__main__":
    unittest.main()
