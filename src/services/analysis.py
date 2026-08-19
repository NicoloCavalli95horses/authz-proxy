# ===========
# Import
# ===========
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..db.models import (
  InteractionExecution,
  HttpRequest,
  HttpResponse,
)

from .save_to_json import save_to_json
from urllib.parse import urlparse, parse_qs
from datetime import datetime

# ===========
# Functions
# ===========
def run_analysis(db: Session, exploration_run_id: int, replay_run_id: int):
  network_results = find_network_differences(db, exploration_run_id, replay_run_id)
  # [TODO] dom_results = find_dom_differences(db)
  
  save_to_json(network_results)
  
  
    
def find_network_differences(db: Session, exploration_run_id: int, replay_run_id: int):
  pairs = get_network_pairs(db, exploration_run_id, replay_run_id)
  return compare_network_pairs(pairs)
  
  
  
"""
exploration requests              replay requests
       │                                │
       └─────────── matching ───────────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
           identical   similar    unmatched
              │          │          │
              ▼          ▼          ▼
           ignore    compare       high
                     responses     suspicion
"""
def compare_network_pairs(pairs):
  results = []
  
  for pair in pairs:
    matches = match_requests(pair["exploration_http_events"], pair["replay_http_events"])

    for match in matches:
      if match["type"] == "identical":
        # Request from exploration is identical to request from replay
        continue

      if match["type"] == "similar":
        # Request from replay is a modified version of the request from exploration
        # results.append(...)
        continue

      if match["type"] == "unmatched":
        # Request from replay has no match on the set of requests from exploration
        analysis = analyze_replay_only_response(match["replay_response"])
        if analysis["signal"] == "high":
          results.append({
            "type": "network",
            "data": {"http_event": match, "analysis": analysis},
            "comment": "This HTTP event occurred during the replay phase, and NOT during the exploration phase"
          })
  
  return results



def analyze_replay_only_response(response):   
  status_code = response["status_code"]
  body = response["body"] or ""
  is_success = (200 <= status_code < 300)
  has_body = len(body.strip()) > 0

  if is_success and has_body:
    return {
      "signal": "high",
      "status_code": status_code,
      "body_length": len(body),
    }

  return {
    "signal": "none",
    "status_code": status_code,
    "body_length": len(body),
  }


"""
 1 - Find, for each replay request, the best match with a request belonging to the exploration set
 2 - Returns the degree of matching (ratio)
"""
def match_requests(exploration_http_events, replay_http_events, MIN_SIMILARITY=3):
  matches = []

  for replay_request, replay_response in replay_http_events:
    best_match = None
    best_score = 0

    for exploration_request, exploration_response in exploration_http_events:
      similarity = request_similarity(exploration_request,replay_request)
      score = similarity["score"]
    
      if score > best_score:
        best_score = score
        best_match = (exploration_request, exploration_response, similarity)

    
    if best_score is None or best_score < MIN_SIMILARITY:
      matches.append({
        "type": "unmatched",
        "replay_request": serialize_http_request(replay_request),
        "replay_response": serialize_http_response(replay_response)
      })
      continue
    
    exploration_request, exploration_response, similarity = best_match
    
    if best_score == 7:
      matches.append({
        "type": "identical",
        "exploration_request": serialize_http_request(exploration_request),
        "exploration_response": serialize_http_response(exploration_response),
        "replay_request": serialize_http_request(replay_request),
        "replay_response": serialize_http_response(replay_response),
        "similarity": similarity
      })
    else:
      matches.append({
        "type": "similar",
        "exploration_request": serialize_http_request(exploration_request),
        "exploration_response": serialize_http_response(exploration_response),
        "replay_request": serialize_http_request(replay_request),
        "replay_response": serialize_http_response(replay_response),
        "similarity": similarity,
      })
  
  return matches


# Score HTTP request similarity from 0 to 7 (different to identical HTTP requests)
def request_similarity(exploration_request, replay_request):
    exploration_url = urlparse(exploration_request.url)
    replay_url = urlparse(replay_request.url)
    
    method_same = (exploration_request.method == replay_request.method)
    path_same = (exploration_url.path == replay_url.path)
    query_same = (parse_qs(exploration_url.query)== parse_qs(replay_url.query))
    body_same = (exploration_request.body == replay_request.body)

    score = 0

    if method_same:
      score += 1

    if path_same:
      score += 3

    if query_same:
      score += 1

    if body_same:
      score += 2

    return {
      "score": score,
      "method_same": method_same,
      "path_same": path_same,
      "query_same": query_same,
      "body_same": body_same,
    }


"""
  1 - Find logical interactions that were executed in both the
  exploration and replay runs.
  2 - For each common interaction, retrieve the HTTP responses
  generated by the two executions.
  3 - Builds the pairs that will later be analyzed by a scoring function
  to detect BAC-related differences.
  
  Returns:
    interaction_id[]: {
      "interaction_id": interaction_id,
      "exploration_execution_id": exploration_execution.id,
      "replay_execution_id": replay_execution.id,
      "exploration_http_events": exploration_http_events,
      "replay_http_events": replay_http_events,
  }
  
"""
def get_network_pairs(db: Session, exploration_run_id: int, replay_run_id: int):
  # Get all InteractionExecution belonging to the two runs
  executions = (db.execute(
    select(InteractionExecution)
    .where(InteractionExecution.run_id.in_([exploration_run_id, replay_run_id])))
    .scalars()
    .all())
  
  # Group executions by logical interaction
  grouped = {}

  for execution in executions:
    grouped.setdefault(execution.interaction_id, {})[execution.run_id] = execution
  
  # Build the comparison dataset
  # Interactions present in only one run are skipped
  results = []

  for interaction_id, by_run in grouped.items():
    exploration_execution = by_run.get(exploration_run_id)
    replay_execution = by_run.get(replay_run_id)

    # The interaction was not executed in both runs
    if not exploration_execution or not replay_execution:
      continue

    # Retrieve HTTP responses generated by each execution
    exploration_http_events = get_http_for_execution(db, exploration_execution.id)
    replay_http_events = get_http_for_execution(db, replay_execution.id)

    results.append({
      "interaction_id": interaction_id,
      "exploration_execution_id": exploration_execution.id,
      "replay_execution_id": replay_execution.id,
      "exploration_http_events": exploration_http_events,
      "replay_http_events": replay_http_events,
    })

  return results



def get_http_for_execution(db: Session, execution_id: int):
  stmt = (
    select(HttpRequest, HttpResponse)
    .join(HttpResponse, HttpResponse.request_id == HttpRequest.id)
    .where(HttpRequest.interaction_execution_id == execution_id)
  )

  return db.execute(stmt).all()


def serialize_http_request(request):
  return {
    "id": request.id,
    "interaction_execution_id": request.interaction_execution_id,
    "method": request.method,
    "url": request.url,
    "headers": request.headers,
    "body": request.body,
  }


def serialize_http_response(response):
  return {
    "id": response.id,
    "request_id": response.request_id,
    "status_code": response.status_code,
    "url": response.url,
    "headers": response.headers,
    "body": response.body,
  }