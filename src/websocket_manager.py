"""
WebSocket connection manager for real-time dashboard updates.
Broadcasts refresh events when resumes, records, or API keys change.
"""

import json
import logging
from typing import List
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, event: str = "refresh", payload: dict | None = None):
        """Broadcast a message to all connected clients."""
        message = json.dumps({"event": event, **(payload or {})})
        disconnected = []
        for conn in self.active_connections:
            try:
                await conn.send_text(message)
            except Exception as e:
                logger.warning(f"Failed to send to client: {e}")
                disconnected.append(conn)
        for conn in disconnected:
            self.disconnect(conn)


# Singleton instance
manager = ConnectionManager()
