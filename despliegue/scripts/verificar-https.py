"""Smoke test real de TLS, SPA, API, OpenAPI y cookies detrás del proxy."""
import argparse
from datetime import datetime, timezone
from http.cookiejar import CookieJar
from http.cookies import SimpleCookie
from html.parser import HTMLParser
import json
import os
import time
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlsplit
from urllib.request import build_opener, HTTPCookieProcessor, Request


class _DetectorSpa(HTMLParser):
    def __init__(self):
        super().__init__()
        self.raiz = False
        self.modulo = False

    def handle_starttag(self, tag, attrs):
        atributos = dict(attrs)
        if tag == "div" and atributos.get("id") == "raiz":
            self.raiz = True
        if tag == "script" and atributos.get("type") == "module" and (atributos.get("src") or "").startswith("/assets/"):
            self.modulo = True


def es_spa_html(contenido):
    detector = _DetectorSpa()
    detector.feed(contenido.decode("utf-8", errors="replace"))
    return detector.raiz and detector.modulo


def verificar(url):
    partes = urlsplit(url)
    if partes.scheme != "https" or not partes.hostname or partes.username or partes.password or partes.query or partes.fragment or partes.path not in ("", "/"):
        raise ValueError("Usar el origen HTTPS público, por ejemplo https://msu.example.org.")
    url = url.rstrip("/")
    jar = CookieJar()
    cliente = build_opener(HTTPCookieProcessor(jar))  # TLS verifica CA y nombre de host.
    comprobaciones = []

    def peticion(ruta, esperado=200, datos=None, csrf=None):
        headers = {"Accept": "application/json"}
        cuerpo = None
        if datos is not None:
            headers["Content-Type"] = "application/json"
            cuerpo = json.dumps(datos).encode()
        if csrf:
            headers["X-XSRF-TOKEN"] = csrf
        req = Request(url + ruta, data=cuerpo, headers=headers)
        try:
            res = cliente.open(req, timeout=20)
        except HTTPError as error:
            res = error
        with res:
            if res.status != esperado:
                raise RuntimeError(f"{ruta}: HTTP {res.status}, se esperaba {esperado}.")
            if urlsplit(res.url).netloc != partes.netloc:
                raise RuntimeError("La aplicación redirigió fuera del origen esperado.")
            if not res.headers.get("Strict-Transport-Security", "").startswith("max-age="):
                raise RuntimeError(f"{ruta}: falta HSTS.")
            return res.read(), res.headers

    pagina, _ = peticion("/login")
    if not es_spa_html(pagina):
        raise RuntimeError("/login no está sirviendo la SPA.")
    comprobaciones.append("TLS válido y ruta SPA")
    cuerpo, cabeceras = peticion("/api/v1/auth/csrf")
    if json.loads(cuerpo).get("cabecera") != "X-XSRF-TOKEN":
        raise RuntimeError("El proxy no está devolviendo la API real de CSRF.")
    cookies = SimpleCookie()
    for valor in cabeceras.get_all("Set-Cookie", []):
        cookies.load(valor)
    if "XSRF-TOKEN" not in cookies or not cookies["XSRF-TOKEN"]["secure"]:
        raise RuntimeError("La cookie CSRF no es Secure: revisar X-Forwarded-Proto y el perfil.")
    comprobaciones.append("CSRF Secure detrás de HTTPS")
    cuerpo, _ = peticion("/api/v1/me", esperado=401)
    if "codigo" not in json.loads(cuerpo):
        raise RuntimeError("La API no conserva el error JSON de autenticación.")
    comprobaciones.append("Acceso sin sesión devuelve 401 JSON")
    cuerpo, _ = peticion("/api/v1/openapi")
    if not json.loads(cuerpo).get("openapi", "").startswith("3."):
        raise RuntimeError("OpenAPI no está disponible.")
    comprobaciones.append("OpenAPI accesible")

    correo, password = os.getenv("MSU_TEST_EMAIL"), os.getenv("MSU_TEST_PASSWORD")
    if bool(correo) != bool(password):
        raise ValueError("Para probar la sesión definir MSU_TEST_EMAIL y MSU_TEST_PASSWORD juntos.")
    if correo:
        csrf = next(unquote(c.value) for c in jar if c.name == "XSRF-TOKEN")
        _, cabeceras = peticion("/api/v1/auth/login", datos={"correo": correo, "password": password}, csrf=csrf)
        sesion = SimpleCookie()
        for valor in cabeceras.get_all("Set-Cookie", []):
            sesion.load(valor)
        cookie = sesion.get("MSU_SESION")
        if cookie is None or not cookie["secure"] or not cookie["httponly"] or cookie["samesite"].lower() != "lax":
            raise RuntimeError("La cookie de sesión requiere Secure, HttpOnly y SameSite=Lax.")
        cuerpo, _ = peticion("/api/v1/me")
        if json.loads(cuerpo).get("correo") != correo:
            raise RuntimeError("El perfil devuelto no corresponde a la cuenta de prueba.")
        peticion("/api/v1/auth/csrf")
        csrf = next(unquote(c.value) for c in jar if c.name == "XSRF-TOKEN")
        peticion("/api/v1/auth/logout", esperado=204, datos={}, csrf=csrf)
        peticion("/api/v1/me", esperado=401)
        comprobaciones.append("Login, cookie HttpOnly/Secure, perfil y logout")

    return {"fecha_utc": datetime.now(timezone.utc).isoformat(), "url": url, "estado": "OK", "comprobaciones": comprobaciones}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", required=True)
    parser.add_argument("--reintentos", type=int, default=1)
    args = parser.parse_args()
    if not 1 <= args.reintentos <= 30:
        parser.error("Usar entre 1 y 30 intentos.")
    for intento in range(args.reintentos):
        try:
            print(json.dumps(verificar(args.url), ensure_ascii=False, indent=2))
            return
        except (URLError, OSError, RuntimeError, json.JSONDecodeError) as error:
            if intento + 1 == args.reintentos:
                raise SystemExit(str(error)) from error
            time.sleep(10)


if __name__ == "__main__":
    main()
