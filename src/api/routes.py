# ===========
# Import
# ===========
from fastapi import APIRouter, HTTPException
from typing import Any


# ===========
# Router
# ===========
def create_router(state):
  router = APIRouter(prefix="/api")

  @router.put("/proxy")
  def update_proxy_state(payload: dict, status_code=200):
    enabled = payload.get("enable", False)
    state.enabled = enabled
    print(f"[API] Proxy state update: {state.enabled}")
    return {"status": "ok", "enabled": state.enabled}
  
  
  @router.post("/graphs", status_code=201)
  def save_graph(payload: dict[str, Any]):
    print(f"[API] Received graph to store")
    return {"status": "ok"}


  @router.post("/analysis", status_code=201)
  def start_analysis(payload: dict):
    s = payload.get("status")

    if s != "start":
      raise HTTPException(status_code=400, detail="Invalid analysis status")

    print(f"[API] Analysis state update: {s}")
    return { "status": "ok"}

  return router