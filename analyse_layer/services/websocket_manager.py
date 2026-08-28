from fastapi import WebSocket
from typing import List

class ConnectionManager:
    def __init__(self):
        # Liste des navigateurs (dashboards) actuellement connectés
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WS] Nouveau Dashboard connecté. Total : {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print("[WS] Dashboard déconnecté.")

    async def broadcast(self, message: dict):
        """Envoie l'alerte à tous les Dashboards ouverts"""
        print(f"[DEBUG WS] Tentative de diffusion à {len(self.active_connections)} clients")
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                # Si une connexion est morte, on ne fait rien, elle sera nettoyée au disconnect
                pass

# Instance unique (Singleton) à importer partout
ws_manager = ConnectionManager()