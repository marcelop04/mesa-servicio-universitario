"""C3: valida alcance/autorización y registra metadatos, sin hacer peticiones HTTP."""
import json
import os
from pathlib import Path
import re
from datetime import datetime, timezone
from urllib.parse import urlsplit


def validar(autorizado, origen, revision):
    if autorizado != "true":
        raise ValueError("Confirme la autorización del equipo antes de ejecutar ZAP.")
    u = urlsplit(origen)
    if (u.scheme != "https" or not u.hostname or u.username or u.password or u.query
            or u.fragment or u.path not in ("", "/") or any(c.isspace() for c in origen)):
        raise ValueError("DAST_TARGET_URL debe ser un origen HTTPS sin credenciales, rutas ni tokens.")
    if not re.fullmatch(r"[a-fA-F0-9]{40}", revision):
        raise ValueError("Identifique el commit desplegado mediante su SHA completo de 40 caracteres.")
    # Comprueba también errores de puerto; conserva el puerto explícito si existe.
    if u.port is not None and not 1 <= u.port <= 65535:
        raise ValueError("Puerto del origen inválido.")
    return {"origen": origen.rstrip("/"), "revision_desplegada": revision.lower(),
            "tipo": "ZAP baseline pasivo, sin autenticación", "autorizacion_confirmada": True}


def main():
    datos = validar(os.getenv("AUTORIZADO", ""), os.getenv("TARGET", ""),
                    os.getenv("REVISION_DESPLEGADA", ""))
    datos.update(fecha_utc=datetime.now(timezone.utc).isoformat(),
                 revision_herramientas=os.getenv("GITHUB_SHA", "local"),
                 run_url=os.getenv("RUN_URL", ""))
    Path("alcance-dast.json").write_text(json.dumps(datos, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Alcance validado. Metadatos guardados; todavía no constituye un escaneo aprobado.")


if __name__ == "__main__":
    try:
        main()
    except ValueError as error:
        raise SystemExit(str(error)) from error
