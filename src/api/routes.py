# ===========
# Import
# ===========
import time
import traceback

from collections import defaultdict
from datetime import timedelta

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from ..db.database import Base
from ..db.crud import create_run
from ..db.crud import save_state
from ..db.crud import save_interaction

from ..services.analysis import run_analysis
from ..services.save_to_json import save_to_json

# ===========
# Vars
# ===========
total = {
  "elapsed_time": {},
  "dom_states": defaultdict(int),
  "interactions": defaultdict(int),
  "http_requests": defaultdict(int),
  "http_responses": defaultdict(int),
  "navigations": defaultdict(int),
  "bac": {},
}

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
    
    if enabled:
      total["elapsed_time"]["started_at"] = time.time()
      total["elapsed_time"]["ended_at"] = None
    
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
      total["dom_states"][run_id] += 1
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
      total["interactions"][run_id] += 1
      total["http_requests"][run_id] += len(payload["network"]["requests"])
      total["http_responses"][run_id] += len(payload["network"]["responses"])
      total["navigations"][run_id] += len(payload["network"]["navigations"])
      
      print(f'[API] Saved state: "id": {interaction.id}')
      return {"status": "ok", "data": {"interaction": interaction.id}}
      
    except Exception as e:
      db.rollback()
      print("\n========== EXCEPTION ==========")
      print(f"type: {type(e).__name__}")
      print(f"message: {e}")
      print(f"run_id: {run_id}")
      traceback.print_exc()
      print("================================\n")
      
      raise HTTPException(status_code=500, detail="Failed to save interaction")


  @router.post("/analysis", status_code=201)
  def start_analysis(payload: dict, db: Session = Depends(Base.get_db)):    
    if payload.get("status") != "start":
      raise HTTPException(status_code=400, detail="Invalid analysis status")
    
    if exploration_run_id is None or replay_run_id is None:
      raise HTTPException(status_code=409, detail="Exploration/replay runs are not initialized")

    print(f"[API] Starting analysis...")

    prepare_data_count()
    
    # Get BAC-related counters
    bac = run_analysis(db, exploration_run_id, replay_run_id)
    total["bac"] = dict(bac)
    save_to_json(total, "DATA_COUNT")
    
    return {"status": "ok"}

  return router



def prepare_data_count():
  # elapsed time
  total["elapsed_time"]["ended_at"] = time.time()
  
  elapsed = int(total["elapsed_time"]["ended_at"] - total["elapsed_time"]["started_at"])
  hours, remainder = divmod(elapsed, 3600)
  minutes, seconds = divmod(remainder, 60)

  total["elapsed_time"]["elapsed"] = (f"{hours:02d}:{minutes:02d}:{seconds:02d}")

  # defaultdicts
  for key in [
    "dom_states",
    "interactions",
    "http_requests",
    "http_responses",
    "navigations"
  ]:
    total[key] = {
      str(run_id): count
      for run_id, count in total[key].items()
    }

  # Counter
  total["bac"] = dict(total["bac"])

  return total