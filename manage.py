#!/usr/bin/env python3
"""
manage.py - DASHBOARD CleanPro by J4gr3p
"""

import os
import subprocess
import webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))
COMPOSE_BASE = "docker-compose.yml"
OV_DEV = "docker-compose.override.dev.yml"
OV_PROD = "docker-compose.override.prod.yml"

# ---------- Helpers ----------
def run(cmd):
    print(f"\n>>> Ejecutando: {cmd}\n")
    return subprocess.call(cmd, shell=True)

def check_file(f):
    path = os.path.join(ROOT, f)
    if not os.path.exists(path):
        print(f"⚠️  WARNING: no existe {f}")
        return False
    return True

# ---------- Opciones ----------
def up_dev(): run(f"docker compose -f {COMPOSE_BASE} -f {OV_DEV} up --build")
def up_prod():
    run(f"docker compose -f {COMPOSE_BASE} -f {OV_PROD} up --build -d")
    webbrowser.open("http://localhost")
    webbrowser.open("http://localhost:9000")
def compose_up_all(): run("docker compose up --build -d")
def down(): run("docker compose down")
def down_with_volumes():
    ans = input("❌ Esto borrará datos de Mongo. ¿Seguro? (s/N): ")
    if ans.lower() == "s": run("docker compose down -v")
def rebuild():
    run("docker compose build --no-cache")
    run("docker compose up -d")
def logs_service():
    svc = input("Servicio: ")
    run(f"docker compose logs -f {svc}")
def open_portainer(): webbrowser.open("http://localhost:9000")
def open_frontend_dev(): webbrowser.open("http://localhost:3000")
def open_frontend_prod(): webbrowser.open("http://localhost")
def shell_service():
    svc = input("Servicio: ")
    run(f"docker compose exec {svc} /bin/sh || docker compose exec {svc} /bin/bash")
def status(): run("docker compose ps")

# ---------- Menú ----------
MENU = {
    "1": ("Up dev        → Levantar stack en desarrollo (hot reload, puerto 3000)", up_dev),
    "2": ("Up prod       → Levantar stack en producción (Nginx, puerto 80)", up_prod),
    "3": ("Up base       → Usar solo docker-compose.yml", compose_up_all),
    "4": ("Down          → Apagar contenedores (mantiene datos)", down),
    "5": ("Down + Vol    → ⚠️ Apagar y borrar volúmenes (padiós datos todo)", down_with_volumes),
    "6": ("Rebuild       → Rebuild imágenes sin cache + levantar stack", rebuild),
    "7": ("Logs          → Ver logs de un servicio", logs_service),
    "8": ("Portainer     → Abrir dashboard de Portainer", open_portainer),
    "9": ("Frontend Dev  → Abrir frontend en desarrollo (localhost:3000)", open_frontend_dev),
    "10":("Frontend Prod → Abrir frontend en producción (localhost:80)", open_frontend_prod),
    "11":("Shell         → Entrar con shell en contenedor", shell_service),
    "12":("Status        → Ver estado de contenedores activos", status),
    "0": ("Salir", lambda: exit(0))
}

BANNER = r"""
   ██████╗██╗     ███████╗ █████╗ ███╗   ██╗██████╗ ██████╗  ██████╗ 
  ██╔════╝██║     ██╔════╝██╔══██╗████╗  ██║██╔══██╗██╔══██╗██╔═══██╗
  ██║     ██║     █████╗  ███████║██╔██╗ ██║██║  ██║██║  ██║██║   ██║
  ██║     ██║     ██╔══╝  ██╔══██║██║╚██╗██║██║  ██║██║  ██║██║   ██║
  ╚██████╗███████╗███████╗██║  ██║██║ ╚████║██████╔╝██████╔╝╚██████╔╝
   ╚═════╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝ ╚═════╝  ╚═════╝ 
                🚀 DASHBOARD CleanPro by J4gr3p 🚀
"""

def main():
    while True:
        os.system("clear")
        print(BANNER)
        print("="*70)
        for k in sorted(MENU.keys(), key=lambda x: int(x)):
            print(f"{k:>2}) {MENU[k][0]}")
        print("="*70)
        choice = input("\nElige una opción: ").strip()
        fn = MENU.get(choice)
        if fn:
            print("\n----------------------------------------")
            fn[1]()
            print("----------------------------------------\n")
            input("Presiona ENTER para continuar...")
        else:
            print("❌ Opción inválida")
            input("ENTER para continuar...")

if __name__ == "__main__":
    main()
