"""Exige CI y, cuando esté integrado, CodeQL exitosos del mismo SHA/push."""
import argparse
import json
from pathlib import Path
import re
import subprocess
import time


def estado_requerido(ejecuciones, sha, nombres):
    pendientes = []
    fallidos = []
    for nombre in nombres:
        candidatos = [r for r in ejecuciones if r.get("name") == nombre
                      and r.get("head_sha") == sha and r.get("event") == "push"]
        if not candidatos:
            pendientes.append(nombre)
            continue
        ultimo = max(candidatos, key=lambda r: (r.get("id", 0), r.get("run_attempt", 1)))
        if ultimo.get("status") != "completed":
            pendientes.append(nombre)
        elif ultimo.get("conclusion") != "success":
            fallidos.append(nombre)
    return {"estado": "fallo" if fallidos else "pendiente" if pendientes else "aprobado",
            "pendientes": pendientes, "fallidos": fallidos}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sha", required=True)
    parser.add_argument("--repo", required=True)
    parser.add_argument("--espera-segundos", type=int, default=1800)
    args = parser.parse_args()
    if not re.fullmatch(r"[a-f0-9]{40}", args.sha) or not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", args.repo):
        parser.error("SHA o repositorio no válidos.")
    requeridos = ["CI"]
    if Path(".github/workflows/codeql.yml").is_file():
        requeridos.append("CodeQL")
    limite = time.monotonic() + args.espera_segundos
    while True:
        respuesta = subprocess.check_output([
            "gh", "api", f"repos/{args.repo}/actions/runs?head_sha={args.sha}&event=push&per_page=100"
        ], text=True)
        resultado = estado_requerido(json.loads(respuesta)["workflow_runs"], args.sha, requeridos)
        if resultado["estado"] == "aprobado":
            print("Checks de entrega aprobados para el SHA:", ", ".join(requeridos))
            return
        if resultado["estado"] == "fallo":
            raise SystemExit("Se rechaza la entrega por checks fallidos: " + ", ".join(resultado["fallidos"]))
        if time.monotonic() >= limite:
            raise SystemExit("Expiró la espera de checks: " + ", ".join(resultado["pendientes"]))
        print("Esperando:", ", ".join(resultado["pendientes"]), flush=True)
        time.sleep(15)


if __name__ == "__main__":
    main()
