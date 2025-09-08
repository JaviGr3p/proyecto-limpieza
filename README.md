# Cleaning Service Booking Platform

## Descripción
Plataforma web completa para reserva de servicios de limpieza con notificaciones.

## Tecnologías Utilizadas
- **Backend**: FastAPI + Python
- **Frontend**: React
- **Base de datos**: MongoDB
- **Autenticación**: JWT
- **Pagos**: Stripe
- **Notificaciones**: WebSocket
- **Despliegue**: [Tu método de deploy]

## Características Principales
- Sistema de autenticación (usuarios/admin)
- Gestión de servicios de limpieza
- Reservas con calendario
- Procesamiento de pagos
- Notificaciones en tiempo real
- Panel administrativo
- Reviews y calificaciones

## Instalación y Configuración
[Instrucciones paso a paso]

## Estructura del proyecto
```yaml
proyecto-limpieza/
├── README.md
├── backend/
│   ├── server.py
│   ├── websocket_manager.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   ├── package.json
│   └── README.md
├── docs/
│   ├── arquitectura.md
│   ├── manual-usuario.md
│   └── diagramas/
├── tests/
│   ├── websocket_test.html
│   └── test_api.py
└── deployment/
    └── docker-compose.yml 
    ```

## ⚙️ Instalación y ejecución

### 1️⃣ Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/proyecto-limpieza.git
cd proyecto-limpieza ```


### 2️⃣ Instalar las dependencias

```bash
pip install -r requirements.txt
```