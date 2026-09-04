# ===========
# Import
# ===========
from urllib.parse import urlparse, parse_qs
from difflib import SequenceMatcher


# ===========
# Functions
# ===========
def compare_dom_pairs(pairs, threshold=0.5):
  results = []

  for pair in pairs:
    exp_dom = pair["exploration_dom_states"]["to_state"]
    replay_dom = pair["replay_dom_states"]["to_state"]

    # If final state exist
    if exp_dom is None or replay_dom is None:
      continue

    exp_serialized = serialize_dom(exp_dom)
    replay_serialized = serialize_dom(replay_dom)
    similarity = compare_dom(exp_serialized, replay_serialized)

    if similarity < threshold:
      results.append({
        "type": "client_side_bac",
        "interaction_id": pair["interaction_id"],
        "exploration_execution_id": pair["exploration_execution_id"],
        "replay_execution_id": pair["replay_execution_id"],
        "exploration_dom_state": exp_serialized,
        "replay_dom_state": replay_serialized,
        "diff": True,
        "similarity": similarity,
        "threshold": threshold,
      })

  return results
  
  

# Returns 1: almost identical, 0: completely different
def compare_dom(exp_dom, replay_dom):
  exp_snapshot = exp_dom["snapshot"]
  replay_snapshot = replay_dom["snapshot"]
  return SequenceMatcher(None,exp_snapshot,replay_snapshot).ratio()


def serialize_dom(dom_state):
  if dom_state is None:
    return None

  return {
    "id": dom_state.id,
    "run_id": dom_state.run_id,
    "state_id": dom_state.state_id,
    "snapshot": dom_state.snapshot,
    "hash": dom_state.hash,
    "url": dom_state.url,
  }