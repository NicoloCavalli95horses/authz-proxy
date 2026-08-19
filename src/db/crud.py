# ===========
# Import
# ===========
import json
from sqlalchemy.orm import Session
from .models import Run
from .models import DomState
from .models import HttpRequest
from .models import HttpResponse
from .models import Navigation
from .models import Interaction
from .models import InteractionExecution

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



def save_interaction(db: Session, run_id: int, payload: dict) -> InteractionExecution:
  # ----------------------------------------
  # Resolve states
  # ----------------------------------------
  # Client IDs are used to get the PostgreSQL IDs
  # > finds in the DB the row dom_states that represents S0
  from_state = db.query(DomState).filter_by(run_id=run_id,state_id=payload["fromStateId"]).one()
  to_state = db.query(DomState).filter_by(run_id=run_id,state_id=payload["toStateId"]).one()

  # ----------------------------------------
  # Interaction data
  # ----------------------------------------
  interaction_data = payload["interaction"]

  interaction_type = interaction_data["type"]
  element_data = interaction_data["data"]
  fingerprint = element_data["fingerprint"]

  # ----------------------------------------
  # Get/create logical interaction
  # ----------------------------------------
  interaction = db.query(Interaction).filter_by(type=interaction_type, source_state_hash=from_state.hash, element_fingerprint=fingerprint).first()
  
  if interaction is None:
    interaction = Interaction(type=interaction_type, source_state_hash=from_state.hash, element_fingerprint=fingerprint, element_data=element_data)
    db.add(interaction)
    db.flush()

  # ----------------------------------------
  # Create execution
  # ----------------------------------------
  execution = InteractionExecution(run_id=run_id, interaction_id=interaction.id, from_state_id=from_state.id, to_state_id=to_state.id)
  db.add(execution)
  db.flush()

  # ----------------------------------------
  # Save network
  # ----------------------------------------
  network = payload.get("network", {})

  request_map = {}
  for req in network.get("requests", []):
    request = save_http_request(db=db, execution_id=execution.id,payload=req)
    request_map[req["id"]] = request

  for res in network.get("responses", []):
    request = request_map[res["requestId"]]
    save_http_response(db=db, request_id=request.id, payload=res)

  for nav in network.get("navigations", []):
    save_navigation(db=db, execution_id=execution.id, payload=nav )

  return execution



def save_http_request(db: Session, execution_id: int,payload: dict) -> HttpRequest:
  body = payload.get("body")

  if isinstance(body, (dict, list)):
    body = json.dumps(body)
        
  request = HttpRequest(
    interaction_execution_id=execution_id,
    method=payload["method"],
    url=payload["url"],
    headers=payload.get("headers", {}),
    body=body,
  )

  db.add(request)
  db.flush()
  
  return request



def save_http_response(db: Session, request_id: int, payload: dict) -> HttpResponse:
  body = payload.get("body", {})

  if isinstance(body, (dict, list)):
    body = json.dumps(body)
    
  response = HttpResponse(
    request_id=request_id,
    status_code=payload["status"],
    url=payload["url"],
    headers=payload.get("headers", {}),
    body=body,
  )

  db.add(response)
  db.flush()

  return response



def save_navigation(db: Session, execution_id: int, payload: dict) -> Navigation:
  navigation = Navigation(
    interaction_execution_id=execution_id,
    source=payload["source"],
    from_url=payload["from"],
    to_url=payload.get("to"),
    method=payload.get("method"),
  )
  db.add(navigation)
  db.flush()

  return navigation