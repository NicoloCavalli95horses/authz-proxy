# ===========
# Import
# ===========
from sqlalchemy.orm import Session
from .models import Run


# ===========
# Functions
# ===========
def create_run(db: Session, payload: dict) -> Run:
  run = Run(type=payload["type"], config=payload["config"])
  db.add(run)
  db.flush()
  return run


def parse_and_save_graph(db: Session, run: Run, graph: dict):
  print("[DB] Payload:")
  print(graph)
  
  raise RuntimeError("TEST")