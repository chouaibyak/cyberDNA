from fastapi import FastAPI, BackgroundTasks, Request, WebSocket, WebSocketDisconnect
from services.elastic_service import index_log_to_elastic, close_elastic, es
from core.processing import process_log_for_ml, normalizer
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

@app.get("/events/{source}/{event_id}")
async def get_event_by_id(source: str, event_id: str):
    """Return a raw normal event selected from the dashboard stream."""
    if source not in {"cowrie", "dionaea", "honeytrap"}:
        return {"error": "unknown honeypot source"}
    try:
        res = await es.get(index=f"honeypot-logs-{source}", id=event_id)
        return res["_source"]
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
    analysis = await process_log_for_ml(log_data)
    
    # 2. Une fois l'analyse finie, on archive le log complet
    event_id = await index_log_to_elastic(log_data, source)

    # Les événements normaux sont de la télémétrie : ils apparaissent dans le
    # flux live mais ne créent jamais une alerte dans security-alerts.
    if analysis and analysis.get("status") == "normal":
        norm = normalizer.normalize(log_data)
        if norm:
            score = analysis.get("ml", {}).get("risk_score", 0.0)
            await ws_manager.broadcast({
                "id": f"log-{event_id or 'pending'}", "es_id": event_id or "unknown",
                "log_source": source, "time": norm["timestamp"].split("T")[-1][:8],
                "ip": norm["source_ip"], "pot": norm["honeypot"].capitalize(),
                "event": norm["event_type"] or "Normal event", "status": "NORMAL",
                "score": score / 100.0, "tactic": "Normal",
                "full_details": {"es_index": f"honeypot-logs-{source}",
                                 "ml_confidence": f"{score}%", "mitre_id": "N/A",
                                 "advice": "Aucune action requise."},
            })
