# ===========
# Import
# ===========
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from ..db.database import Base
from ..db.crud import create_run

# ===========
# Router
# ===========
def create_router(state):
  router = APIRouter(prefix="/api")

  # Update proxy state
  @router.put("/proxy")
  def update_proxy_state(payload: dict, status_code=200):
    enabled = payload.get("enable", False)
    state.enabled = enabled
    print(f"[API] Proxy state update: {state.enabled}")
    return {"status": "ok", "enabled": state.enabled}
  
  
  # Init db runs (exploration | replay)
  @router.post("/runs", status_code=201)
  def init_run(payload: dict, db: Session = Depends(Base.get_db)):
    try:
      run = create_run(db, payload)
      db.commit()
      print(f'[API] Init run: "run_id": {run.id}, "run_type": {run.type}')
      return {"status": "ok", "data": {"run_id": run.id, "run_type": run.type}}

    except Exception as e:
      db.rollback()
      print(f"[API] Failed to create run: {type(e).__name__}: {e}")
      raise HTTPException(status_code=500, detail="Failed to store data")
  

  @router.post("/analysis", status_code=201)
  def start_analysis(payload: dict):
    s = payload.get("status")

    if s != "start":
      raise HTTPException(status_code=400, detail="Invalid analysis status")

    print(f"[API] Analysis state update: {s}")
    return { "status": "ok"}

  return router