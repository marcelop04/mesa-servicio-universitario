"""C1/C3: fixture efímero de navegador con el JAR local, H2 y Nginx real.

Requiere node/docker en PATH, npm ci en docs/pruebas, frontend construido y:
  cd backend
  ./mvnw -B verify dependency:build-classpath -Dmdep.includeScope=test -Dmdep.outputFile=target/c-classpath.txt
  cd ..
  docker build -t msu-frontend:c-dast frontend
  python docs/pruebas/csp-local.py

No usa la nube, .env, cuentas reales ni volúmenes preexistentes. El navegador solo acepta loopback.
"""
import argparse
from contextlib import ExitStack
import os
from pathlib import Path
import subprocess
import time
from urllib.error import HTTPError, URLError
from urllib.request import urlopen
from uuid import uuid4

RAIZ = Path(__file__).resolve().parents[2]


def docker(*args):
    return subprocess.run(["docker", *map(str, args)], capture_output=True, text=True, check=True).stdout.strip()


def quitar(*args):
    subprocess.run(["docker", *map(str, args)], capture_output=True, check=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--frontend", default="msu-frontend:c-dast")
    parser.add_argument("--salida", type=Path, default=RAIZ / "reports/seguridad/csp-navegador")
    args = parser.parse_args()
    salida = args.salida.resolve()
    salida.mkdir(parents=True, exist_ok=True)
    jars = list((RAIZ / "backend/target").glob("msu-backend-*.jar"))
    if len(jars) != 1:
        raise ValueError("Compile un único JAR del backend antes de crear el fixture.")
    classpath = (RAIZ / "backend/target/c-classpath.txt").read_text().strip()
    h2 = next(Path(p) for p in classpath.split(os.pathsep)
              if Path(p).name.startswith("h2-") and p.endswith(".jar"))
    prefijo = "msu-c-browser-" + uuid4().hex[:8]
    with ExitStack() as limpieza:
        docker("network", "create", prefijo)
        limpieza.callback(quitar, "network", "rm", prefijo)

        def iniciar(nombre, *opciones):
            completo = prefijo + "-" + nombre
            docker("run", "--rm", "-d", "--name", completo, "--network", prefijo, *opciones)
            limpieza.callback(quitar, "rm", "-f", completo)
            return completo

        backend = iniciar("api", "--network-alias", "backend",
            "--mount", f"type=bind,source={jars[0]},target=/app/app.jar,readonly",
            "--mount", f"type=bind,source={h2},target=/fixture/h2.jar,readonly",
            "--mount", f"type=bind,source={RAIZ / 'backend/src/test/resources/application-test.yml'},target=/fixture/application-test.yml,readonly",
            "-e", "SPRING_PROFILES_ACTIVE=test", "-e", "SPRING_CONFIG_ADDITIONAL_LOCATION=file:/fixture/",
            "eclipse-temurin:17-jre", "java", "-Dloader.path=/fixture/h2.jar", "-cp", "/app/app.jar",
            "org.springframework.boot.loader.launch.PropertiesLauncher", "--msu.datos-demo.solicitudes=true",
            "--msu.archivos.directorio=/tmp/msu-archivos-c")
        nginx = iniciar("web", "-p", "127.0.0.1::80", args.frontend)
        puerto = docker("port", nginx, "80/tcp").rsplit(":", 1)[1]
        base = f"http://127.0.0.1:{puerto}"
        try:
            for intento in range(90):
                try:
                    with urlopen(base + "/api/v1/auth/csrf", timeout=5) as respuesta:
                        if respuesta.status == 200:
                            break
                except (HTTPError, URLError, ConnectionError, TimeoutError):
                    if intento == 89:
                        raise
                    time.sleep(2)
            # Reutiliza exclusivamente el password ficticio de application-test.yml/PruebaApi.
            with urlopen(base + "/swagger-ui/index.html", timeout=10) as respuesta:
                (salida / "swagger-index.html").write_bytes(respuesta.read())
            entorno = {**os.environ, "BASE": base, "MSU_TEST_PASSWORD": "Demo12345!", "SALIDA": str(salida)}
            resultado = subprocess.run(["node", "csp-navegador.mjs"], cwd=RAIZ / "docs/pruebas", env=entorno)
            return resultado.returncode
        finally:
            logs = subprocess.run(["docker", "logs", backend], capture_output=True, text=True, check=False)
            (salida / "backend.log").write_text(logs.stdout, encoding="utf-8")


if __name__ == "__main__":
    raise SystemExit(main())
