from fastapi import WebSocket
from typing import Dict
import json

class NotificationManager:
    def __init__(self):
        # Conexiones activas {user_id: websocket}
        self.client_connections: Dict[str, WebSocket] = {}
        self.admin_connections: Dict[str, WebSocket] = {}

    async def connect_client(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.client_connections[user_id] = websocket
        print(f"Cliente {user_id} conectado")

    async def connect_admin(self, websocket: WebSocket, admin_id: str):
        await websocket.accept()
        self.admin_connections[admin_id] = websocket
        print(f"Admin {admin_id} conectado")

    def disconnect_client(self, user_id: str):
        if user_id in self.client_connections:
            del self.client_connections[user_id]

    def disconnect_admin(self, admin_id: str):
        if admin_id in self.admin_connections:
            del self.admin_connections[admin_id]

    # Notificar NUEVA RESERVA a todos los admins
    async def notify_new_booking(self, booking_data):
        message = {
            "type": "new_booking",
            "message": f"Nueva reserva: {booking_data['service']} - ${booking_data['amount']}",
            "data": booking_data
        }
        
        for admin_ws in self.admin_connections.values():
            try:
                await admin_ws.send_text(json.dumps(message))
            except:
                pass

    # Notificar CONFIRMACIÓN a cliente específico
    async def notify_booking_confirmed(self, user_id: str, booking_data):
        if user_id in self.client_connections:
            message = {
                "type": "booking_confirmed", 
                "message": f"Tu reserva #{booking_data['id']} fue confirmada",
                "data": booking_data
            }
            try:
                await self.client_connections[user_id].send_text(json.dumps(message))
            except:
                pass

# Instancia global
notification_manager = NotificationManager()