"""Genera un .env de nube con claves únicas, sin imprimirlas ni sobrescribir archivos."""
import argparse
import os
from pathlib import Path
import re
import secrets


def crear(host, email, perfil="prod", demo=False):
    etiqueta = r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?"
    if not re.fullmatch(rf"{etiqueta}(?:\.{etiqueta})+", host) or len(host) > 253:
        raise ValueError("Indica un nombre DNS público válido, sin https:// ni rutas.")
    if not re.fullmatch(r"[a-zA-Z0-9_.+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", email):
        raise ValueError("El correo ACME no es válido.")
    if perfil not in ("prod", "prueba"):
        raise ValueError("El perfil debe ser prod o prueba.")
    valores = {
        "COMPOSE_PROJECT_NAME": f"msu-{perfil}",
        "SPRING_PROFILES_ACTIVE": perfil,
        "APP_HOST": host,
        "ACME_EMAIL": email,
        "DB_USER": "msu",
        "DB_PASSWORD": secrets.token_hex(32),
        "MYSQL_ROOT_PASSWORD": secrets.token_hex(32),
        "JWT_SECRET": secrets.token_hex(48),
        "DATOS_DEMO": str(demo).lower(),
        "DATOS_DEMO_SOLICITUDES": str(demo).lower(),
        "DEMO_PASSWORD": f"Msu-{secrets.token_hex(18)}9!",
        "TAREAS_HABILITADAS": str(perfil == "prod").lower(),
    }
    return "".join(f"{clave}={valor}\n" for clave, valor in valores.items())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--perfil", choices=("prod", "prueba"), default="prod")
    parser.add_argument("--demo", action="store_true", help="Habilitar cuentas/datos ficticios para la entrega académica.")
    parser.add_argument("--salida", type=Path, required=True)
    args = parser.parse_args()
    contenido = crear(args.host, args.email, args.perfil, args.demo)
    if not args.salida.parent.is_dir():
        parser.error("El directorio de salida debe existir.")
    descriptor = os.open(args.salida, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as archivo:
        archivo.write(contenido)
    print(f"Entorno creado en {args.salida}. Guárdalo en GitHub Secret PRODUCTION_ENV.")
    print("En Windows, guarda el archivo en tu carpeta privada; al subirlo a Linux se aplica chmod 600.")


if __name__ == "__main__":
    main()
