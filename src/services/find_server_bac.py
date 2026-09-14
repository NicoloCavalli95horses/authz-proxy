# ===========
# Import
# ===========
import json
from urllib.parse import urlparse, parse_qs


# ===========
# Functions
# ===========
def compare_network_pairs(pairs):
  results = []
  
  for pair in pairs:
    matches = map_requests(pair["exploration_http_events"], pair["replay_http_events"])

    for match in matches:
      if match["type"] == "identical":
        # Request from exploration is identical to request from replay
        continue

      if match["type"] == "similar":
        # [Potential HTTP parameter tampering] Request from replay is a modified version of the request from exploration
        analysis = analyze_parameter_tampering(match) 
        
        print('=== HTTP parameter tampering, baby! ===')   
        
        if analysis["signal"] == "high":    
          results.append({
            "type": "HTTP parameter tampering",
            "data": analysis,
            "comment": "An HTTP request that appears in both runs presents a modified body or query parameters in the re-exploration phase. This data is accepted by the server.",
          })

      if match["type"] == "unmatched":
        # [Potential IDOR] Request from replay has no match on the set of requests from exploration
        analysis = analyze_replay_only_response(match["replay_response"])
        if analysis["signal"] == "high":
          results.append({
            "type": "IDOR",
            "data": {"http_event": match, "analysis": analysis},
            "comment": "This HTTP request occurred only during the re-exploration phase. It was accepted by the server."
          })
  
  return results


def analyze_parameter_tampering(match):
  req_1 = match["exploration_request"]
  req_2 = match["replay_request"]
  res_1 = match["exploration_response"]
  res_2 = match["replay_response"]

  # Only tampered request must be accepted
  if (is_success(res_1["status_code"]) or (not is_success(res_2["status_code"]))):
    return None

  url_1 = urlparse(req_1["url"])
  url_2 = urlparse(req_2["url"])

  # Same operation
  if url_1.path != url_2.path:
    return None

  if req_1["method"] != req_2["method"]:
    return None

  # Compare query parameters
  query_1 = parse_qs(url_1.query, keep_blank_values=True)
  query_2 = parse_qs(url_2.query, keep_blank_values=True)
  query_same = query_1 == query_2

  # Compare bodies
  body_1 = normalize_body(req_1["body"])
  body_2 = normalize_body(req_2["body"])

  body_same = body_1 == body_2

  # No parameter modification
  if query_same and body_same:
    return None

  return {
    "signal": "high",
    "status": {
      "original": res_1["status_code"],
      "mutated": res_2["status_code"],
    },
    "endpoint": {
      "original": url_1.path,
      "mutated": url_2.path,
    },
    "method": {
      "original": req_1["method"],
      "mutated": req_2["method"],
    },
    "query": {
      "original": query_1,
      "mutated": query_2,
      },
    "body": {
      "original": body_1,
      "mutated": body_2,
    },
  }

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
1 - For each request belonging to the re-exploration phase find the best match with a request belonging to the exploration phase
2 - Returns the degree of matching (ratio)
"""
def map_requests(exploration_http_events, replay_http_events, MIN_SIMILARITY=3):
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
  
def is_success(status_code):
  return 200 <= status_code < 300


def normalize_body(body):
  try:
    return json.loads(body)
  except:
    return body