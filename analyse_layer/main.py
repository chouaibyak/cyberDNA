from fastapi import FastAPI, BackgroundTasks, Request, WebSocket, WebSocketDisconnect
from services.elastic_service import index_log_to_elastic, close_elastic, es
from core.processing import process_log_for_ml
from services.websocket_manager import ws_manager
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SentinelAI - Analyse Layer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Autorise tous les ports (5173, etc.)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AJOUT DE LA ROUTE WEBSOCKET ---
@app.websocket("/ws/alerts")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # On attend un message (même vide) pour maintenir la connexion
            await websocket.receive_text() 
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)

@app.get("/alerts/{alert_id}")
async def get_alert_by_id(alert_id: str):
    try:
        # On cherche l'alerte dans l'index security-alerts
        res = await es.get(index="security-alerts", id=alert_id)
        return res["_source"] # On renvoie le contenu du document
    except Exception as e:
        return {"error": str(e)}

@app.on_event("shutdown")
async def shutdown():
    await close_elastic()

@app.post("/ingest")
async def ingest_logs(request: Request, background_tasks: BackgroundTasks):
    # 1. Réception
    log_data = await request.json()
    source = log_data.get("honeypot_source", "unknown")
    if source not in {"cowrie", "dionaea", "honeytrap"}:
        return {"status": "ignored", "reason": "unknown honeypot source"}

    background_tasks.add_task(run_full_pipeline, log_data, source)

    return {"status": "received", "source": source}

async def run_full_pipeline(log_data, source):
    # 1. On attend la fin de l'analyse (qui va aussi remplir security-alerts si besoin)
    await process_log_for_ml(log_data)
    
    # 2. Une fois l'analyse finie, on archive le log complet
    await index_log_to_elastic(log_data, source)

