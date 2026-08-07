# ===========
# Import
# ===========
from fastapi import APIRouter


# ===========
# Router
# ===========
def create_router(state):
  router = APIRouter(prefix="/api")

  @router.put("/proxy")
  def update_proxy_state(payload: dict):
    enabled = payload.get("enable", False)
    state.enabled = enabled
    print(f"Proxy state update: {state.enabled}")
    return {"enabled": state.enabled}

  @router.post("/analysis")
  def start_analysis(payload: dict):
    s = payload.get("status")

    if s != "start":
      return {"status": "not valid"}

    print("Result analysis launched")
    return { "status": s, "note": "not implemented yet"}

  return router