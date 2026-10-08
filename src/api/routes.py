# ===========
# Import
# ===========
import time
from fastapi import APIRouter 
from ..services.save_to_json import save_to_json


# ===========
# Vars
# ===========
total = {
  "elapsed_time": {},
  "mutated_keys": [],
}

# ===========
# Router
# ===========
def create_router(state):
  router = APIRouter(prefix="/api")

  # Update proxy state
  @router.put("/proxy")
  def update_proxy_state(payload: dict):
    enabled = payload.get("enable", False)
    state.enabled = enabled
    
    if enabled:
      total["elapsed_time"]["started_at"] = time.time()
      total["elapsed_time"]["ended_at"] = None
    
    print(f"[API] Proxy state update: {state.enabled}")
    return {"status": "ok", "enabled": state.enabled}


  # Save local JSON
  @router.get("/results", status_code=200)
  def start_analysis():    
    prepare_data_count()
    save_to_json(total, "DATA_COUNT")
    return {"status": "ok"}


  # Save mutated JSON keys (unique keys) 
  @router.post("/json-keys", status_code=200)
  def create_json_key(payload: dict):
    print(f"[API] Saved JSON key: {payload}")
    total["mutated_keys"].append(payload)
    return {"status": "ok"}
      
  return router


def prepare_data_count():
  started_at = total["elapsed_time"].get("started_at", time.time())
  total["elapsed_time"]["ended_at"] = time.time()
  elapsed = int(total["elapsed_time"]["ended_at"] - started_at)
  hours, remainder = divmod(elapsed, 3600)
  minutes, seconds = divmod(remainder, 60)

  total["elapsed_time"]["elapsed"] = (f"{hours:02d}:{minutes:02d}:{seconds:02d}")
  total["json_keys"] = len(total["mutated_keys"])

  return total