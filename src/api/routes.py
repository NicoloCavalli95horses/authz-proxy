# ===========
# Import
# ===========
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from ..db.database import Base
from ..db.crud import create_run
from ..db.crud import save_state
from ..db.crud import save_interaction

from ..services.analysis import run_analysis

# ===========
# Router
# ===========
def create_router(state):
  router = APIRouter(prefix="/api")
  exploration_run_id = None
  replay_run_id = None

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
    nonlocal exploration_run_id, replay_run_id
    try:
      run = create_run(db, payload)
      db.commit()
      
      if run.type == "exploration":
        exploration_run_id = run.id
      elif run.type == "replay":
        replay_run_id = run.id
      else:
        raise ValueError(f"Unknown run type: {run.type}")

      print(f'[API] Init run: "run_id": {run.id}, "run_type": {run.type}')
      return {"status": "ok", "data": {"run_id": run.id, "run_type": run.type}}

    except Exception as e:
      db.rollback()
      print(f"[API] Failed to create run: {type(e).__name__}: {e}")
      raise HTTPException(status_code=500, detail="Failed to create run")
    
    
  # Save new GUI state
  @router.post("/runs/{run_id}/states")
  def create_state(run_id: int, payload: dict, db: Session = Depends(Base.get_db)):
    try:
      state = save_state(db, run_id, payload)
      db.commit()
      print(f'[API] Saved state: "id": {state.id}, "state_id": {state.state_id}')
      return {"status": "ok", "data": {"id": state.id,"state_id": state.state_id}}
      
    except Exception as e:
      db.rollback()
      print(f"[API] Failed to save state: {type(e).__name__}: {e}")
      raise HTTPException(status_code=500, detail="Failed to save state")
    
    
  # Save new interaction
  @router.post("/runs/{run_id}/interactions")
  def create_interaction(run_id: int, payload: dict, db: Session = Depends(Base.get_db)):
    try:
      interaction = save_interaction(db, run_id, payload)
      db.commit()
      print(f'[API] Saved state: "id": {interaction.id}')
      return {"status": "ok", "data": {"interaction": interaction.id}}
      
    except Exception as e:
      db.rollback()
      print(f"[API] Failed to save state: {type(e).__name__}: {e}")
      raise HTTPException(status_code=500, detail="Failed to save interaction")


  @router.post("/analysis", status_code=201)
  def start_analysis(payload: dict, db: Session = Depends(Base.get_db)):
    if payload.get("status") != "start":
      raise HTTPException(status_code=400, detail="Invalid analysis status")
    
    if exploration_run_id is None or replay_run_id is None:
      raise HTTPException(status_code=409, detail="Exploration/replay runs are not initialized")

    print(f"[API] Starting analysis...")
    run_analysis(db, exploration_run_id, replay_run_id)
    
    return {"status": "ok"}

  return router