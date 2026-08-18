# ===========
# Import
# ===========
from sqlalchemy.orm import Session
from .models import Run
from .models import DomState

# ===========
# Functions
# ===========
def create_run(db: Session, payload: dict) -> Run:
  run = Run(
    type=payload["type"],
    config=payload["config"]
  )
  db.add(run)
  db.flush()
  return run


def save_state(db: Session, run_id: int, payload: dict) -> DomState:
  state = DomState(
    run_id=run_id,
    state_id=payload["id"],
    snapshot=payload["dom"]["snapshot"],
    hash=payload["dom"]["hash"],
    url=payload["url"],
  )
  db.add(state)
  db.flush()
  return state