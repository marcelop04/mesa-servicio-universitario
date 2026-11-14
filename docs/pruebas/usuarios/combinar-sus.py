"""Combina respuestas CSV reales descargadas; valida y evita sobrescribir registros."""
import argparse
import csv
import importlib.util
import io
from pathlib import Path

spec = importlib.util.spec_from_file_location("calculo_sus", Path(__file__).with_name("calcular-sus.py"))
calculo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(calculo)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archivos", nargs="+", type=Path)
    parser.add_argument("--salida", required=True, type=Path)
    args = parser.parse_args()
    filas = []
    campos = []
    for ruta in args.archivos:
        with ruta.open(encoding="utf-8-sig", newline="") as archivo:
            lector = csv.DictReader(archivo)
            for campo in lector.fieldnames or []:
                if campo not in campos:
                    campos.append(campo)
            filas.extend(lector)
    buffer = io.StringIO(newline="")
    escritor = csv.DictWriter(buffer, fieldnames=campos)
    escritor.writeheader()
    escritor.writerows(filas)
    try:
        informe = calculo.calcular(io.StringIO(buffer.getvalue()))
    except (ValueError, KeyError) as error:
        parser.exit(1, f"Respuestas rechazadas: {error}\n")
    if not args.salida.parent.is_dir():
        parser.error("El directorio de salida debe existir.")
    with args.salida.open("x", encoding="utf-8-sig", newline="") as archivo:
        archivo.write(buffer.getvalue())
    print(f"{informe['participantes']} respuestas registradas en {args.salida}.")
    print("El facilitador debe comprobar que corresponden a personas y sesiones reales.")


if __name__ == "__main__":
    main()
