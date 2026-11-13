"""Calcula SUS a partir de respuestas reales; rechaza filas incompletas y no simula participantes."""
import argparse
import csv
from datetime import date
import json
from pathlib import Path
import re
from statistics import mean
from urllib.parse import urlsplit


def puntuacion(respuestas):
    if len(respuestas) != 10 or any(type(v) is not int or not 1 <= v <= 5 for v in respuestas):
        raise ValueError("Se necesitan diez respuestas enteras del 1 al 5.")
    return sum(v - 1 if i % 2 == 0 else 5 - v for i, v in enumerate(respuestas)) * 2.5


def calcular(archivo):
    filas = list(csv.DictReader(archivo))
    participantes = []
    ids = set()
    origenes = set()
    for fila in filas:
        if fila.get("origen") != "RESPUESTA_USUARIO":
            raise ValueError("Solo se aceptan respuestas con origen=RESPUESTA_USUARIO recogidas en las sesiones.")
        participante = fila.get("participante", "")
        if not re.fullmatch(r"P\d{2,3}", participante) or participante in ids:
            raise ValueError("Cada participante debe tener un identificador P01, P02… único.")
        date.fromisoformat(fila["fecha"])
        if not re.fullmatch(r"[1-9]\d*", fila.get("ancho") or ""):
            raise ValueError(f"{participante}: registrar el ancho real de la pantalla en píxeles.")
        url = urlsplit(fila["url"])
        if url.scheme != "https" or not url.hostname or url.username or url.password:
            raise ValueError(f"{participante}: registrar la URL HTTPS desplegada.")
        origenes.add((url.scheme, url.netloc))
        if len(origenes) > 1:
            raise ValueError("Las respuestas deben corresponder a la misma aplicación HTTPS.")
        if fila.get("rol") not in ("Solicitante", "Supervisor", "Técnico", "Administrador"):
            raise ValueError(f"{participante}: registrar el rol observado.")
        valor = puntuacion([int(fila[f"q{i}"]) for i in range(1, 11)])
        ids.add(participante)
        participantes.append({"participante": participante, "rol": fila["rol"], "ancho": int(fila["ancho"]), "sus": valor})
    if not participantes:
        raise ValueError("No hay respuestas: realizar las sesiones con personas antes de calcular SUS.")
    return {
        "participantes": len(participantes),
        "media_sus": mean(p["sus"] for p in participantes),
        "resultados": participantes, "meta_muestra_cumplida": len(participantes) >= 5,
        "tipo": "RESPUESTAS_REGISTRADAS",
        "nota": "SUS usa escala 0–100, no porcentaje. El conteo del CSV no acredita por sí solo personas reales: el facilitador debe documentar las sesiones, sus tareas y la versión probada.",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", type=Path)
    args = parser.parse_args()
    try:
        with args.csv.open(encoding="utf-8-sig", newline="") as archivo:
            print(json.dumps(calcular(archivo), ensure_ascii=False, indent=2))
    except (OSError, KeyError, ValueError, TypeError) as error:
        parser.exit(1, f"Datos SUS inválidos: {error}\n")


if __name__ == "__main__":
    main()
