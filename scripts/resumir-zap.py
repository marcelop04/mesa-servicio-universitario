"""Resumen publicable de un reporte ZAP real; no copia cookies, pruebas ni consultas de URL."""
import argparse
from collections import Counter
import hashlib
import importlib.util
import json
from pathlib import Path
from urllib.parse import urlsplit

spec = importlib.util.spec_from_file_location("validar_dast", Path(__file__).with_name("validar-dast.py"))
dast = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dast)


def origen_de(url):
    u = urlsplit(url)
    if u.scheme != "https" or not u.hostname or u.username or u.password:
        raise ValueError("El reporte contiene una URL fuera del origen HTTPS autorizado.")
    return (u.scheme, u.hostname.lower(), u.port or 443)


def resumir(reporte, alcance, codigo_salida):
    if codigo_salida not in (0, 1, 2):
        raise ValueError("ZAP no completó el baseline; no registrar un error técnico como cero hallazgos.")
    if alcance.get("autorizacion_confirmada") is not True:
        raise ValueError("Falta confirmar autorización en el registro de alcance.")
    datos = dast.validar("true", alcance.get("origen", ""), alcance.get("revision_desplegada", ""))
    origen = origen_de(datos["origen"])
    if not reporte.get("@version") or not reporte.get("@generated") or not reporte.get("site"):
        raise ValueError("Reporte incompleto: faltan versión, fecha o sitios examinados.")
    alertas = []
    riesgos = Counter()
    for sitio in reporte["site"]:
        if origen_de(sitio["@name"]) != origen or "alerts" not in sitio:
            raise ValueError("El sitio del reporte no coincide con el alcance autorizado o está incompleto.")
        for alerta in sitio["alerts"]:
            riesgo = int(alerta["riskcode"])
            if riesgo not in range(4):
                raise ValueError("Riesgo ZAP desconocido.")
            instancias = alerta.get("instances", [])
            if not instancias:
                raise ValueError("Una alerta sin instancias no acredita un resultado verificable.")
            rutas = set()
            for instancia in instancias:
                if origen_de(instancia["uri"]) != origen:
                    raise ValueError("Una instancia de alerta pertenece a otro origen.")
                # Nunca se publican query, fragmento, attack, evidence ni otherinfo.
                rutas.add(urlsplit(instancia["uri"]).path or "/")
            riesgos[riesgo] += 1
            alertas.append({"regla": str(alerta["pluginid"]), "titulo": alerta["name"],
                            "riesgo": riesgo, "confianza": str(alerta["confidence"]),
                            "instancias": len(instancias), "rutas": sorted(rutas)})
    endpoints = [int(i["statistic"]) for i in reporte.get("insights", []) if i.get("key") == "insight.endpoint.total"]
    return {**datos, "version_zap": reporte["@version"], "fecha_reporte": reporte.get("created", reporte["@generated"]),
            "codigo_salida": codigo_salida,
            "resultado_tecnico": "completado_con_avisos" if codigo_salida else "completado",
            "requiere_revision_de_hallazgos": True,
            "grupos_por_riesgo": {str(n): riesgos[n] for n in range(4)},
            "reglas_distintas": len({a["regla"] for a in alertas}),
            "endpoints_informados_por_zap": sum(endpoints) if endpoints else None,
            "alertas": sorted(alertas, key=lambda a: (a["regla"], a["titulo"])),
            "limites": ["Sin autenticación, ataques activos ni cobertura completa de la SPA/API.",
                        "El SHA proviene del registro de alcance; contrastarlo con CD, no lo mide ZAP.",
                        "Un resumen no acepta riesgos ni sustituye la revisión del reporte original."]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reporte", type=Path, required=True)
    parser.add_argument("--alcance", type=Path, required=True)
    parser.add_argument("--codigo-salida", type=int, required=True)
    parser.add_argument("--salida", type=Path, required=True)
    args = parser.parse_args()
    contenido = args.reporte.read_bytes()
    resultado = resumir(json.loads(contenido.decode("utf-8-sig")),
                        json.loads(args.alcance.read_text(encoding="utf-8-sig")), args.codigo_salida)
    resultado["sha256_reporte_original"] = hashlib.sha256(contenido).hexdigest()
    args.salida.parent.mkdir(parents=True, exist_ok=True)
    args.salida.write_text(json.dumps(resultado, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Resumen generado. Revisar el original antes de publicar; no constituye aprobación de seguridad.")


if __name__ == "__main__":
    main()
