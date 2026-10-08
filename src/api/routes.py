# ===========
# Import
# ===========
import time
from fastapi import APIRouter 
from ..services.save_to_json import save_to_json


# ===========
# Vars
# ===========
data = {
  "elapsed_time": {},
  "mutated_keys": [],
  "agent_history": []
}

# ===========
# Router
# ===========
def create_router(state):
  router = APIRouter(prefix="/api")

  # Update proxy state
  @router.put("/proxy")
  def update_proxy_state(payload: dict):
    state.enabled = payload.get("enable", False)
    
    if not state.target_url:
      state.target_url = payload.get("url", "")
    
    if state.enabled:
      data["elapsed_time"]["started_at"] = time.time()
      data["elapsed_time"]["ended_at"] = None
    
    print(f"[API] Proxy state update: {state.enabled}")
    return {"status": "ok", "enabled": state.enabled}


  # Save local JSON
  @router.get("/results", status_code=200)
  def start_analysis():    
    prepare_data_count()
    save_to_json(data, state.target_url)
    return {"status": "ok"}


  # Save history of agent actions
  @router.post("/agent-output", status_code=200)
  def save_agent_output(payload: dict):
    print(f"[API] Received agent output: {payload}")
    data["agent_history"].append(payload)
    return {"status": "ok"}


  # Save mutated JSON keys (unique keys) 
  @router.post("/json-keys", status_code=200)
  def create_json_key(payload: dict):
    print(f"[API] Saved JSON key: {payload}")
    data["mutated_keys"].append(payload)
    return {"status": "ok"}
      
  return router


def prepare_data_count():
  started_at = data["elapsed_time"].get("started_at", time.time())
  data["elapsed_time"]["ended_at"] = time.time()
  elapsed = int(data["elapsed_time"]["ended_at"] - started_at)
  hours, remainder = divmod(elapsed, 3600)
  minutes, seconds = divmod(remainder, 60)

  data["elapsed_time"]["elapsed"] = (f"{hours:02d}:{minutes:02d}:{seconds:02d}")
  data["json_keys"] = len(data["mutated_keys"])

  return data