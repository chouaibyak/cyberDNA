from elasticsearch import AsyncElasticsearch
import datetime
import os
import asyncio

# On récupère l'URL depuis les variables d'environnement (docker-compose)
ES_URL = os.getenv("ELASTICSEARCH_URL", "http://elasticsearch:9200")
es = AsyncElasticsearch([ES_URL])

async def index_log_to_elastic(log_data: dict, source: str):
    """Archive le log brut dans un index spécifique à l'honeypot"""
    index_name = f"honeypot-logs-{source.lower()}"
    if "@timestamp" not in log_data:
        log_data["@timestamp"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

    for attempt in range(5):
        try:
            response = await es.index(index=index_name, document=log_data)
            return response.get("_id")
        except Exception as error:
            if attempt == 4:
                print(f"Error Indexing to ES after retries: {error}")
                return None
            await asyncio.sleep(2 ** attempt)

async def close_elastic():
    await es.close()

async def get_recent_logs(minutes=None, limit=1000):
    """
    Récupère les logs récents. 
    Si 'minutes' est fourni, filtre par temps. Sinon, utilise la limite.
    """
    # 1. Construction de la requête de base
    query = {
        "query": {
            "bool": {
                "filter": []
            }
        },
        "sort": [{"@timestamp": {"order": "desc"}}]
    }

    # 2. Si on demande un filtre par minutes, on ajoute une Range Query
    if minutes:
        # On demande les logs dont le timestamp est supérieur ou égal à "maintenant - X minutes"
        # Format Elasticsearch : "now-5m"
        query["query"]["bool"]["filter"].append({
            "range": {
                "@timestamp": {
                    "gte": f"now-{minutes}m"
                }
            }
        })

    try:
        # Recherche sur tous les index de honeypots
        response = await es.search(
            index="honeypot-logs-*", 
            body=query, 
            size=limit, 
            ignore_unavailable=True
        )
        
        # On extrait les documents sources
        hits = response.get("hits", {}).get("hits", [])
        return [hit["_source"] for hit in hits]

    except Exception as e:
        print(f"[ES ERROR] Erreur lors de la récupération des logs : {e}")
        return []
